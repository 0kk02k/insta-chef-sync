import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
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
}

interface AddRecipeDialogProps {
  onRecipeAdded?: () => void;
}

const AddRecipeDialog = ({ onRecipeAdded }: AddRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedContent, setUploadedContent] = useState<UploadedContent | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setUploadedContent(null);
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
          body: { imageBase64: base64Data, userId: user?.id }
        });
      } else if (uploadedContent.type === 'pdf' && uploadedContent.file) {
        // Upload PDF to storage first
        const fileName = `${Date.now()}-${uploadedContent.file.name}`;
        
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

    if (!uploadedContent) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie Inhalt hinzu, um ein Rezept zu erstellen.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Process content with appropriate AI service
      const processedData = await processContent(uploadedContent);
      
      if (!processedData || !processedData.title) {
        throw new Error('Konnte das Rezept nicht verarbeiten');
      }

      // Use AI-generated image from edge function
      let imageUrl = processedData.image_url;

      // Save processed recipe to database
      const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: processedData.title,
          description: processedData.description || null,
          image_url: imageUrl,
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
        <Button size="icon" className="w-12 h-12 bg-slate-700 hover:bg-slate-600 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full">
          <Plus className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        style={{ 
          borderColor: 'hsl(290 18% 28% / 0.4)',
          backgroundColor: 'hsl(290 18% 28% / 0.05)'
        }}
      >
        <DialogHeader>
          <DialogTitle>Rezept hinzufügen</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <UnifiedUploadZone
            onContentChange={setUploadedContent}
            disabled={loading || processing}
            isProcessing={processing}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || processing}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || processing || !uploadedContent}>
              {(loading || processing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {processing ? 'KI verarbeitet...' : 'Rezept hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;