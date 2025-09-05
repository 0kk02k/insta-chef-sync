import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Upload } from 'lucide-react';
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
  
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setRawInput('');
    setImageFile(null);
    setImagePreview(null);
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

    if (!rawInput.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Rezepttext ein.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Process text content with DeepSeek
      const processedData = await processContent(rawInput);
      
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

              <div className="space-y-2">
                <Label htmlFor="image-upload">Rezeptbild hochladen (optional)</Label>
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
                          JPG, PNG oder WEBP (optional - ansonsten wird AI-Bild generiert)
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