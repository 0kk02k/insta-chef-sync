import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2, Plus, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StarRating from '@/components/StarRating';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string | null;
  image_url: string | null;
  ingredients: string[];
  instructions: string[];
  cooking_time: number | null;
  servings: number | null;
  rating: number | null;
  created_at: string;
}

interface EditRecipeDialogProps {
  recipe: Recipe;
  onRecipeUpdated?: () => void;
}

const EditRecipeDialog = ({ recipe, onRecipeUpdated }: EditRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: recipe.title,
    description: recipe.description || '',
    instagram_url: recipe.instagram_url || '',
    ingredients: [...recipe.ingredients],
    instructions: [...recipe.instructions],
    cooking_time: recipe.cooking_time || '',
    servings: recipe.servings || '',
    rating: recipe.rating || null,
  });

  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-resize function for textareas
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(80, textarea.scrollHeight) + 'px';
  };

  // Effect to resize textareas when content changes
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea[data-instruction-index]');
    textareas.forEach((textarea) => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [formData.instructions]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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


  const handleArrayChange = (field: 'ingredients' | 'instructions', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    handleInputChange(field, newArray);
    
    // Auto-resize instruction textareas after state update
    if (field === 'instructions') {
      setTimeout(() => {
        const textarea = document.querySelector(`textarea[data-instruction-index="${index}"]`) as HTMLTextAreaElement;
        if (textarea) {
          autoResizeTextarea(textarea);
        }
      }, 0);
    }
  };

  const addArrayItem = (field: 'ingredients' | 'instructions') => {
    handleInputChange(field, [...formData[field], '']);
  };

  const removeArrayItem = (field: 'ingredients' | 'instructions', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    handleInputChange(field, newArray);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Fehler",
        description: "Sie müssen angemeldet sein.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Titel ein.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload new image if provided
      let imageUrl = recipe.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Filter empty ingredients and instructions
      const cleanedIngredients = formData.ingredients.filter(item => item.trim() !== '');
      const cleanedInstructions = formData.instructions.filter(item => item.trim() !== '');

      const { error } = await supabase
        .from('recipes')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          instagram_url: formData.instagram_url.trim() || null,
          image_url: imageUrl,
          ingredients: cleanedIngredients,
          instructions: cleanedInstructions,
          cooking_time: formData.cooking_time ? parseInt(formData.cooking_time.toString()) : null,
          servings: formData.servings ? parseInt(formData.servings.toString()) : null,
          rating: formData.rating,
        })
        .eq('id', recipe.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Erfolgreich!",
        description: "Rezept wurde aktualisiert.",
      });

      setOpen(false);
      onRecipeUpdated?.();

    } catch (error) {
      console.error('Error updating recipe:', error);
      toast({
        title: "Fehler",
        description: "Rezept konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="border-purple-soft/30 hover:bg-purple-soft/5 text-purple-soft"
        >
          <Edit className="h-4 w-4 mr-2" />
          Bearbeiten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl bg-gradient-to-r from-purple-soft to-pink-vibrant bg-clip-text text-transparent">
            Rezept bearbeiten
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Rezepttitel..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Kurze Beschreibung des Rezepts..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cooking_time">Kochzeit (Min.)</Label>
                <Input
                  id="cooking_time"
                  type="number"
                  value={formData.cooking_time}
                  onChange={(e) => handleInputChange('cooking_time', e.target.value)}
                  placeholder="30"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servings">Portionen</Label>
                <Input
                  id="servings"
                  type="number"
                  value={formData.servings}
                  onChange={(e) => handleInputChange('servings', e.target.value)}
                  placeholder="4"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input
                  id="instagram_url"
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Bewertung</Label>
                <StarRating 
                  rating={formData.rating} 
                  onRatingChange={(rating) => handleInputChange('rating', rating)}
                  size="md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload-edit">Rezeptbild ändern (optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  id="image-upload-edit"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label 
                  htmlFor="image-upload-edit" 
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  {imagePreview ? (
                    <>
                      <img 
                        src={imagePreview} 
                        alt="Neue Vorschau" 
                        className="h-32 w-32 object-cover rounded-lg"
                      />
                      <span className="text-sm font-medium">Neues Bild gewählt</span>
                    </>
                  ) : recipe.image_url ? (
                    <>
                      <img 
                        src={recipe.image_url} 
                        alt="Aktuelles Bild" 
                        className="h-32 w-32 object-cover rounded-lg"
                      />
                      <span className="text-sm font-medium">Klicken zum Ändern</span>
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

          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Zutaten</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('ingredients')}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Hinzufügen
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={ingredient}
                    onChange={(e) => handleArrayChange('ingredients', index, e.target.value)}
                    placeholder={`Zutat ${index + 1}...`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem('ingredients', index)}
                    className="h-10 w-10 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Anweisungen</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('instructions')}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Hinzufügen
              </Button>
            </div>
            <div className="space-y-2">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Textarea
                    value={instruction}
                    onChange={(e) => {
                      handleArrayChange('instructions', index, e.target.value);
                      autoResizeTextarea(e.target as HTMLTextAreaElement);
                    }}
                    placeholder={`Schritt ${index + 1}...`}
                    className="flex-1 resize-none overflow-hidden"
                    data-instruction-index={index}
                    style={{ 
                      minHeight: '80px',
                      height: 'auto'
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem('instructions', index)}
                    className="h-10 w-10 p-0 mt-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-purple-soft to-pink-vibrant hover:from-purple-soft/90 hover:to-pink-vibrant/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecipeDialog;