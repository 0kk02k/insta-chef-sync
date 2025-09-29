import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Check, X, Upload, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';

interface InlineEditImageProps {
  value: string | null;
  recipeId: string;
  recipeTitle: string;
  isOwner: boolean;
  onUpdate: (newValue: string | null) => void;
  onGenerateImage: (provider?: 'kie' | 'together') => void;
  generatingImage: boolean;
}

const InlineEditImage = ({ 
  value, 
  recipeId, 
  recipeTitle,
  isOwner, 
  onUpdate, 
  onGenerateImage,
  generatingImage 
}: InlineEditImageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (imageUrl?: string) => {
    setSaving(true);
    try {
      const newValue = (imageUrl || tempValue).trim() || null;
      const { error } = await supabase
        .from('recipes')
        .update({ image_url: newValue })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(newValue);
      setTempValue(newValue || '');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "Fehler",
        description: "Bild konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateImage = async (provider: 'kie' | 'together' = 'kie') => {
    if (generatingImage) return;
    
    console.log(`🚀 InlineEditImage: Starting image generation with ${provider} (SeaDream as default)...`);
    // Don't call onGenerateImage here to avoid duplicate requests
    // onGenerateImage(provider);
    
    try {
      const functionName = provider === 'kie' ? 'generate-recipe-image-kie' : 'generate-recipe-image';
      console.log(`📡 Calling function: ${functionName}`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          recipeId,
          title: recipeTitle,
          description: null,
          ingredients: []
        }
      });

      console.log(`📋 ${provider} response:`, { data, error });

      if (error) {
        console.error(`❌ Error generating image with ${provider}:`, error);
        
        // Fallback to the other provider if KiE.ai fails
        if (provider === 'kie') {
          console.log('🔄 Falling back to Together AI...');
          toast({
            title: "Fallback",
            description: "SeaDream nicht verfügbar, versuche FLUX...",
          });
          await handleGenerateImage('together');
          return;
        }
        
        toast({
          title: "Fehler",
          description: "Fehler beim Generieren des Bildes",
          variant: "destructive",
        });
        return;
      }

      if (data?.imageUrl) {
        console.log(`✅ ${provider} generated image successfully:`, data.imageUrl);
        setTempValue(data.imageUrl);
        await handleSave(data.imageUrl);
        const providerName = provider === 'kie' ? 'SeaDream' : 'FLUX';
        toast({
          title: "Erfolg",
          description: `${providerName} Bild erfolgreich generiert!`,
        });
      } else {
        console.log(`❌ No image URL in response from ${provider}`);
        toast({
          title: "Fehler",
          description: "Fehler beim Generieren des Bildes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`❌ Exception generating image with ${provider}:`, error);
      
      // Fallback to the other provider if KiE.ai fails
      if (provider === 'kie') {
        console.log('🔄 Exception fallback to Together AI...');
        toast({
          title: "Fallback",
          description: "SeaDream nicht verfügbar, versuche FLUX...",
        });
        await handleGenerateImage('together');
        return;
      }
      
      toast({
        title: "Fehler",
        description: "Fehler beim Generieren des Bildes",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fehler",
        description: "Datei ist zu groß. Maximum: 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fehler",
        description: "Nur Bilddateien sind erlaubt.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${recipeId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      // Update recipe with new image URL
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ image_url: imageUrl })
        .eq('id', recipeId);

      if (updateError) throw updateError;

      onUpdate(imageUrl);
      setTempValue(imageUrl);
      setIsEditing(false);

      toast({
        title: "Bild hochgeladen",
        description: "Das Bild wurde erfolgreich gespeichert.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Fehler",
        description: "Bild konnte nicht hochgeladen werden.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOwner) {
    return value ? (
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={value}
          alt={recipeTitle}
          className="w-full h-full object-cover"
        />
      </div>
    ) : null;
  }

  if (isEditing) {
    return (
      <div className="space-y-4 p-4">
        {value && (
          <div className="w-32 h-24 overflow-hidden rounded-lg border mx-auto">
            <img
              src={value}
              alt="Aktuelles Bild"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="space-y-3">
          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving || uploading}
            className="h-8"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={saving || uploading}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {value ? (
        <div className="aspect-video w-full overflow-hidden relative">
          <img
            src={value}
            alt={recipeTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="h-8"
            >
              <Edit className="h-4 w-4 mr-1" />
              Bearbeiten
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleGenerateImage('kie')}
              disabled={generatingImage}
              className="h-8"
            >
              {generatingImage ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              SeaDream
            </Button>
          </div>
        </div>
      ) : (
        <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-muted-foreground mb-4">
              <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-60" />
              <p className="text-lg font-medium">Noch kein Bild vorhanden</p>
              <p className="text-sm">Bild hinzufügen oder mit KI generieren</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bild hinzufügen
              </Button>
              <Button
                onClick={() => handleGenerateImage('kie')}
                disabled={generatingImage}
                className="bg-gradient-to-r from-purple-soft to-hot-pink text-white hover:from-purple-soft/90 hover:to-hot-pink/90"
                size="sm"
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    KI-Bild (SeaDream)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineEditImage;