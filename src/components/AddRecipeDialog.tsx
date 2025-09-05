import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Upload, FileText } from 'lucide-react';
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
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setRawInput('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast({
        title: "Fehler",
        description: "Nur PDF-Dateien werden unterstützt.",
        variant: "destructive",
      });
    }
  };

  const processContent = async (content: string) => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('process-instagram-recipe', {
        body: { content }
      });

      if (error) {
        throw error;
      }

      return data;
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

    if (!rawInput.trim() && !file) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Rezepttext ein oder laden Sie eine PDF-Datei hoch.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // For now, we'll focus only on text input - PDF processing will be added later
      if (file) {
        toast({
          title: "Info",
          description: "PDF-Upload wird bald verfügbar sein. Bitte kopieren Sie den Text aus der PDF und fügen Sie ihn in das Textfeld ein.",
          variant: "default",
        });
        setLoading(false);
        return;
      }

      if (!rawInput.trim()) {
        toast({
          title: "Fehler",
          description: "Bitte geben Sie Rezepttext ein.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Process text content with DeepSeek
      const processedData = await processContent(rawInput);
      
      if (!processedData || !processedData.title) {
        throw new Error('Konnte das Rezept nicht verarbeiten');
      }

      // Save processed recipe to database
      const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: processedData.title,
          description: processedData.description || null,
          image_url: processedData.image_url || null,
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
        <Button size="lg" className="bg-gradient-to-r from-orange-warm to-coral hover:from-orange-warm/90 hover:to-coral/90 shadow-lg hover:shadow-xl transition-all duration-300">
          <Plus className="h-5 w-5 mr-2" />
          + Rezept
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Rezept</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Rezept</h3>
              <p className="text-sm text-muted-foreground">
                Fügen Sie Rezepttext ein. DeepSeek KI wird Ihr Rezept automatisch strukturieren.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="raw-input">Rezepttext einfügen</Label>
                <Textarea
                  id="raw-input"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Fügen Sie hier Ihren Rezepttext ein... (Website-Text, handschriftliches Rezept, etc.)"
                  rows={8}
                  className="resize-none"
                />
              </div>

              <div className="flex items-center justify-center">
                <div className="text-sm text-muted-foreground">oder (bald verfügbar)</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf-upload">PDF-Datei hochladen</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center opacity-50">
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled
                  />
                  <label 
                    htmlFor="pdf-upload" 
                    className="cursor-not-allowed flex flex-col items-center space-y-2"
                  >
                    {file ? (
                      <>
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Kommt bald - bitte kopieren Sie den Text manuell
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          PDF-Upload (bald verfügbar)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Kopieren Sie vorerst den Text aus der PDF manuell
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
            <Button type="submit" disabled={loading || processing || !rawInput.trim()}>
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