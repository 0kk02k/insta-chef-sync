import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AddRecipeDialogProps {
  onRecipeAdded?: () => void;
}

const AddRecipeDialog = ({ onRecipeAdded }: AddRecipeDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instagram_url: '',
    ingredients: '',
    instructions: '',
    cooking_time: '',
    servings: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Fehler",
        description: "Sie müssen angemeldet sein, um Rezepte hinzuzufügen.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert ingredients and instructions from text to arrays
      const ingredientsArray = formData.ingredients
        .split('\n')
        .filter(item => item.trim() !== '')
        .map(item => item.trim());

      const instructionsArray = formData.instructions
        .split('\n')
        .filter(item => item.trim() !== '')
        .map(item => item.trim());

      const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          instagram_url: formData.instagram_url || null,
          ingredients: ingredientsArray,
          instructions: instructionsArray,
          cooking_time: formData.cooking_time ? parseInt(formData.cooking_time) : null,
          servings: formData.servings ? parseInt(formData.servings) : null
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Erfolg!",
        description: "Rezept wurde erfolgreich hinzugefügt."
      });

      // Reset form and close dialog
      setFormData({
        title: '',
        description: '',
        instagram_url: '',
        ingredients: '',
        instructions: '',
        cooking_time: '',
        servings: ''
      });
      setIsOpen(false);
      onRecipeAdded?.();

    } catch (error) {
      console.error('Error adding recipe:', error);
      toast({
        title: "Fehler",
        description: "Rezept konnte nicht hinzugefügt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Erstes Rezept hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Rezept hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Rezeptname"
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

          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram URL</Label>
            <Input
              id="instagram_url"
              value={formData.instagram_url}
              onChange={(e) => handleInputChange('instagram_url', e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              type="url"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cooking_time">Zubereitungszeit (Min.)</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingredients">Zutaten</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => handleInputChange('ingredients', e.target.value)}
              placeholder="Eine Zutat pro Zeile:&#10;200g Mehl&#10;2 Eier&#10;250ml Milch"
              rows={6}
            />
            <p className="text-sm text-muted-foreground">
              Geben Sie jede Zutat in eine separate Zeile ein.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Anweisungen</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              placeholder="Ein Schritt pro Zeile:&#10;Mehl und Eier vermischen&#10;Milch langsam hinzufügen&#10;Bei mittlerer Hitze braten"
              rows={6}
            />
            <p className="text-sm text-muted-foreground">
              Geben Sie jeden Zubereitungsschritt in eine separate Zeile ein.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rezept hinzufügen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;