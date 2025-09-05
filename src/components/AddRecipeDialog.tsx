import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AddRecipeDialogProps {
  onRecipeAdded?: () => void;
}

const AddRecipeDialog = ({ onRecipeAdded }: AddRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setRawInput('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedPdf(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setImageFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile) {
      toast({
        title: "Fehler",
        description: "Nur Bilddateien werden unterstützt.",
        variant: "destructive",
      });
    }
  };

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: "Fehler",
          description: "Bitte wählen Sie eine gültige PDF-Datei aus.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fehler",
          description: "Die PDF-Datei ist zu groß. Maximale Größe: 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedPdf(file);
      
      // Clear text input since we'll process the PDF directly
      setRawInput('');
      
      toast({
        title: "PDF-Datei erfolgreich ausgewählt",
        description: "Die PDF wird direkt von DeepSeek KI verarbeitet. Klicken Sie auf 'Rezept hinzufügen' um fortzufahren.",
      });
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, file);

    if (error) {
      throw new Error('Fehler beim Hochladen des Bildes: ' + error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const processContent = async (content?: string, pdfFile?: File) => {
    try {
      setProcessing(true);
      
      let response;
      
      if (pdfFile) {
        // Upload PDF to storage first, then process with pdf-processor
        const fileName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdf-uploads')
          .upload(`${user.id}/${Date.now()}-${fileName}`, pdfFile);

        if (uploadError) {
          throw new Error('Fehler beim Hochladen der PDF: ' + uploadError.message);
        }

        response = await supabase.functions.invoke('pdf-processor', {
          body: { path: uploadData.path }
        });
      } else if (content) {
        // Send text content to existing function
        response = await supabase.functions.invoke('process-instagram-recipe', {
          body: { content }
        });
      } else {
        throw new Error('Weder PDF noch Text-Inhalt bereitgestellt');
      }

      const { data, error } = response;

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Processing failed');
      }

      return data.data;
    } catch (error) {
      console.error('Error processing content:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Fehler",
        description: "Sie müssen angemeldet sein, um ein Rezept hinzuzufügen.",
        variant: "destructive",
      });
      return;
    }

    if (!rawInput.trim() && !selectedPdf) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Rezepttext ein oder laden Sie eine PDF-Datei hoch.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Process content with DeepSeek - either PDF or text
      const processedData = await processContent(rawInput.trim() || undefined, selectedPdf || undefined);
      
      if (!processedData || !processedData.title) {
        throw new Error('Konnte das Rezept nicht verarbeiten');
      }

      // Upload user image if provided, otherwise use AI-generated image
      let imageUrl = processedData.image_url; // AI-generated image from edge function
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Save processed recipe to database
      const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: processedData.title,
          description: processedData.description || null,
          image_url: imageUrl,
          ingredients: processedData.ingredients || [],
          instructions: processedData.instructions || [],
          cooking_time: processedData.cooking_time || null,
          servings: processedData.servings || null,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Erfolgreich!",
        description: "Ihr Rezept wurde verarbeitet und hinzugefügt.",
      });

      resetForm();
      setOpen(false);
      onRecipeAdded?.();

    } catch (error) {
      console.error('Error adding recipe:', error);
      const errorMessage = error instanceof Error ? error.message : "Fehler beim Verarbeiten des Rezepts. Bitte versuchen Sie es erneut.";
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="w-12 h-12 bg-gradient-to-r from-orange-warm to-coral hover:from-orange-warm/90 hover:to-coral/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Rezept</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">

            <div className="space-y-4">
              {/* PDF Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">PDF-Rezept hochladen</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {selectedPdf ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <FileText className="w-8 h-8 text-red-500" />
                        <span className="text-sm font-medium">{selectedPdf.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPdf(null);
                            setRawInput('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PDF bereit für KI-Verarbeitung
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfChange}
                        className="hidden"
                      />
                      <Label htmlFor="pdf-upload" className="cursor-pointer">
                        <div className="space-y-2">
                          <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-primary">Klicken Sie hier</span> um eine PDF-Datei auszuwählen
                          </div>
                          <p className="text-xs text-muted-foreground">
                            PDF bis 10MB
                          </p>
                        </div>
                      </Label>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">oder</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="raw-input">Rezepttext manuell eingeben</Label>
                <Textarea
                  id="raw-input"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Fügen Sie hier Ihren Rezepttext ein... (Website-Text, handschriftliches Rezept, etc.)"
                  rows={8}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-upload">Rezeptbild hochladen</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="image-upload" 
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    {imagePreview ? (
                      <>
                        <img 
                          src={imagePreview} 
                          alt="Vorschau" 
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                        <span className="text-sm font-medium">Bild ändern</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Bild hochladen
                        </span>
                        <span className="text-xs text-muted-foreground">
                          JPG, PNG oder WEBP
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || processing}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || processing || (!rawInput.trim() && !selectedPdf)}>
              {(loading || processing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {processing ? 'Verarbeitung...' : 'Rezept hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;