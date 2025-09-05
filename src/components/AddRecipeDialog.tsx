import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AddRecipeDialogProps {
  onRecipeAdded?: () => void;
}

const AddRecipeDialog = ({ onRecipeAdded }: AddRecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [servings, setServings] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstagramUrl('');
    setIngredients('');
    setInstructions('');
    setCookingTime('');
    setServings('');
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

    if (!title.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Rezepttitel ein.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          ingredients: ingredients.trim() ? ingredients.split('\n').filter(i => i.trim()) : [],
          instructions: instructions.trim() ? instructions.split('\n').filter(i => i.trim()) : [],
          cooking_time: cookingTime ? parseInt(cookingTime) : null,
          servings: servings ? parseInt(servings) : null,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Erfolgreich!",
        description: "Ihr Rezept wurde hinzugefügt.",
      });

      resetForm();
      setOpen(false);
      onRecipeAdded?.();

    } catch (error) {
      console.error('Error adding recipe:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Hinzufügen des Rezepts. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Erstes Rezept hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Rezept hinzufügen</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Spaghetti Carbonara"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Rezepts..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram-url">Instagram URL</Label>
            <Input
              id="instagram-url"
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cooking-time">Zubereitungszeit (Min.)</Label>
              <Input
                id="cooking-time"
                type="number"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="30"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Portionen</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingredients">Zutaten</Label>
            <Textarea
              id="ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Eine Zutat pro Zeile..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Anweisungen</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Einen Schritt pro Zeile..."
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rezept hinzufügen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;