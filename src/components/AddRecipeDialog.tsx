import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import UnifiedUploadZone from './UnifiedUploadZone';

interface UploadedContent {
  type: 'text' | 'url' | 'pdf' | 'image' | 'screenshot';
  content?: string;
  file?: File;
  preview?: string;
  name: string;
  id?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  currentFile?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

interface ProcessedRecipe {
  id?: string;
  name: string;
  success: boolean;
  error?: string;
}

interface AddRecipeDialogProps {
  onRecipeAdded?: () => void;
}

const AddRecipeDialog = ({ onRecipeAdded }: AddRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedContent, setUploadedContent] = useState<UploadedContent[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ total: 0, completed: 0, status: 'idle' });
  const [processedRecipes, setProcessedRecipes] = useState<ProcessedRecipe[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setUploadedContent(null);
    setBatchProgress({ total: 0, completed: 0, status: 'idle' });
    setProcessedRecipes([]);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const processContent = async (uploadedContent: UploadedContent) => {
    setProcessing(true);
    
    try {
      let response;

      if (uploadedContent.type === 'screenshot' && uploadedContent.file) {
        // Convert to base64 for processing
        const base64Data = await convertImageToBase64(uploadedContent.file);
        
        response = await supabase.functions.invoke('process-screenshot-recipe', {
          body: { imageBase64: base64Data, imageMime: uploadedContent.file.type, userId: user?.id }
        });
      } else if (uploadedContent.type === 'pdf' && uploadedContent.file) {
        // Upload PDF to storage first
        const fileName = `${Date.now()}-${uploadedContent.file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdf-uploads')
          .upload(fileName, uploadedContent.file);

        if (uploadError) {
          throw uploadError;
        }

        // Process PDF with the pdf-processor function
        response = await supabase.functions.invoke('pdf-processor', {
          body: { path: fileName, userId: user?.id }
        });
      } else if (uploadedContent.type === 'text' && uploadedContent.content) {
        // Send text content to the function
        response = await supabase.functions.invoke('process-instagram-recipe', {
          body: { content: uploadedContent.content, userId: user?.id }
        });
      } else if (uploadedContent.type === 'url' && uploadedContent.content) {
        // Send URL to the function for scraping
        response = await supabase.functions.invoke('process-instagram-recipe', {
          body: { url: uploadedContent.content, userId: user?.id }
        });
      } else {
        throw new Error('Unbekannter Content-Typ oder fehlende Daten');
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

  const processBatch = async (contentArray: UploadedContent[]) => {
    setBatchProgress({ total: contentArray.length, completed: 0, status: 'processing' });
    setProcessedRecipes([]);
    setProcessing(true);

    const results: ProcessedRecipe[] = [];

    for (let i = 0; i < contentArray.length; i++) {
      const item = contentArray[i];
      
      setBatchProgress({
        total: contentArray.length,
        completed: i,
        currentFile: item.name,
        status: 'processing'
      });

      try {
        const processedData = await processContent(item);
        
        if (!processedData || !processedData.title) {
          throw new Error('Konnte das Rezept nicht verarbeiten');
        }

        // Save processed recipe to database
        const { error } = await supabase
          .from('recipes')
          .insert({
            user_id: user!.id,
            title: processedData.title,
            description: processedData.description || null,
            image_url: processedData.image_url,
            ingredients: processedData.ingredients || [],
            structured_ingredients: processedData.structured_ingredients || null,
            instructions: processedData.instructions || [],
            cooking_time: processedData.cooking_time || null,
            servings: processedData.servings || null,
            tags: processedData.tags || [],
          });

        if (error) {
          throw error;
        }

        results.push({
          id: item.id,
          name: item.name,
          success: true
        });

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        
        results.push({
          id: item.id,
          name: item.name,
          success: false,
          error: errorMessage
        });
      }

      setBatchProgress({
        total: contentArray.length,
        completed: i + 1,
        status: 'processing'
      });
    }

    setBatchProgress({
      total: contentArray.length,
      completed: contentArray.length,
      status: 'completed'
    });
    setProcessedRecipes(results);
    setProcessing(false);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success);

    let description = `${successCount} erfolgreich verarbeitet`;
    if (failureCount > 0) {
      description += `, ${failureCount} fehlgeschlagen`;
      if (errors.length > 0) {
        description += `:\n${errors.map(e => `• ${e.name}: ${e.error}`).join('\n')}`;
      }
    }

    toast({
      title: "Stapelverarbeitung abgeschlossen",
      description,
      variant: failureCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) {
      onRecipeAdded?.();
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

    if (!uploadedContent || uploadedContent.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie Inhalt hinzu, um ein Rezept zu erstellen.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (uploadedContent.length === 1) {
        // Single file processing
        const processedData = await processContent(uploadedContent[0]);
        
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
            image_url: processedData.image_url,
            ingredients: processedData.ingredients || [],
            structured_ingredients: processedData.structured_ingredients || null,
            instructions: processedData.instructions || [],
            cooking_time: processedData.cooking_time || null,
            servings: processedData.servings || null,
            tags: processedData.tags || [],
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Rezept hinzugefügt",
          description: `"${processedData.title}" wurde erfolgreich erstellt.`,
        });

        resetForm();
        setOpen(false);
      } else if (uploadedContent.every((c) => c.type === 'screenshot')) {
        // Multiple screenshots -> combine into a single recipe via edge function
        const imagesPayload = await Promise.all(
          uploadedContent.map(async (c) => {
            if (!c.file) throw new Error('Fehlende Bilddatei');
            const base64 = await convertImageToBase64(c.file);
            return { base64, mime: c.file.type || 'image/jpeg' };
          })
        );

        const { data, error } = await supabase.functions.invoke('process-screenshot-recipe', {
          body: { images: imagesPayload, userId: user.id },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Verarbeitung fehlgeschlagen');

        const processedData = data.data;

        const { error: insertError } = await supabase
          .from('recipes')
          .insert({
            user_id: user.id,
            title: processedData.title,
            description: processedData.description || null,
            image_url: processedData.image_url,
            ingredients: processedData.ingredients || [],
            structured_ingredients: processedData.structured_ingredients || null,
            instructions: processedData.instructions || [],
            cooking_time: processedData.cooking_time || null,
            servings: processedData.servings || null,
            tags: processedData.tags || [],
          });

        if (insertError) throw insertError;

        toast({
          title: 'Rezept aus Screenshots erstellt',
          description: `"${processedData.title}" wurde aus ${uploadedContent.length} Screenshots kombiniert.`,
        });

        onRecipeAdded?.();
        resetForm();
        setOpen(false);
      } else {
        // Batch processing
        await processBatch(uploadedContent);
        
        // Close dialog after batch completion
        setTimeout(() => {
          resetForm();
          setOpen(false);
        }, 2000);
      }

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
        <Button size="lg" className="w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full border-0 hover:opacity-90" style={{ backgroundColor: '#ae83e6' }}>
          <Plus className="h-6 w-6 text-white" strokeWidth={4} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#ae83e6', borderColor: '#ae83e6'}}>
        <DialogHeader>
          <DialogTitle>Rezept hinzufügen - copy&paste, drag&drop</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <UnifiedUploadZone
            onContentChange={setUploadedContent}
            disabled={loading || processing}
            isProcessing={processing}
            batchProgress={batchProgress}
          />

          {/* Batch Results */}
          {processedRecipes.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-3">Verarbeitungsergebnisse:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {processedRecipes.map((result) => (
                  <div key={result.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{result.name}</span>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || processing}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || processing || !uploadedContent || uploadedContent.length === 0}>
              {(loading || processing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {processing ? (
                batchProgress.status === 'processing' ? 
                  `Verarbeite ${batchProgress.completed + 1}/${batchProgress.total}...` : 
                  'KI verarbeitet...'
              ) : (
                uploadedContent && uploadedContent.length > 1 ? 
                  `${uploadedContent.length} Rezepte hinzufügen` : 
                  'Rezept hinzufügen'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;