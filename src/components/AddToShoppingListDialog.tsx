import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShoppingLists, StructuredIngredient } from '@/hooks/useShoppingLists';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddToShoppingListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: StructuredIngredient[];
  currentPortions: number;
  originalPortions: number;
  recipeId?: string;
}

const AddToShoppingListDialog = ({
  isOpen,
  onClose,
  ingredients,
  currentPortions,
  originalPortions,
  recipeId,
}: AddToShoppingListDialogProps) => {
  const { shoppingLists, createShoppingList, addIngredientsToList } = useShoppingLists();
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const portionMultiplier = currentPortions / originalPortions;

  const handleSubmit = async () => {
    if (!selectedListId && !isCreatingNewList) return;
    setIsLoading(true);
    console.log('AddToShoppingListDialog: handleSubmit', {
      selectedListId,
      isCreatingNewList,
      newListName,
      portionMultiplier,
      ingredientsCount: ingredients.length,
      recipeId,
    });
    toast({ title: 'Wird hinzugefügt', description: 'Sende Zutaten an Einkaufsliste...' });
    try {
      let listId = selectedListId;
      if (isCreatingNewList && newListName.trim()) {
        listId = (await createShoppingList(newListName.trim())) || '';
      }
      if (listId) {
        await addIngredientsToList(listId, ingredients, recipeId, portionMultiplier);
        toast({ title: 'Anfrage gesendet', description: 'Zutaten wurden übertragen.' });
        onClose();
        setSelectedListId('');
        setNewListName('');
        setIsCreatingNewList(false);
      }
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      toast({ title: 'Fehler', description: 'Übertragung fehlgeschlagen.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatIngredient = (ingredient: StructuredIngredient): string => {
    const scaledAmount = ingredient.amount ? ingredient.amount * portionMultiplier : null;
    if (scaledAmount && ingredient.unit) {
      return `${scaledAmount} ${ingredient.unit} ${ingredient.ingredient}`;
    } else if (scaledAmount) {
      return `${scaledAmount} ${ingredient.ingredient}`;
    } else {
      return ingredient.ingredient;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Zur Einkaufsliste hinzufügen</DialogTitle>
          <DialogDescription>
            Wähle eine Einkaufsliste aus oder erstelle eine neue für {currentPortions} Portion{currentPortions !== 1 ? 'en' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Einkaufsliste</Label>
            {!isCreatingNewList ? (
              <div className="space-y-2">
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Einkaufsliste auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shoppingLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingNewList(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Liste erstellen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Name der neuen Liste..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreatingNewList(false);
                    setNewListName('');
                  }}
                  className="w-full"
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Zutaten ({currentPortions} Portion{currentPortions !== 1 ? 'en' : ''})</Label>
            <div className="max-h-48 overflow-y-auto space-y-1 text-sm text-muted-foreground border rounded-md p-3">
              {ingredients.map((ingredient, index) => (
                <div key={index}>{formatIngredient(ingredient)}</div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={(!selectedListId && !isCreatingNewList) || (isCreatingNewList && !newListName.trim()) || isLoading}
          >
            {isLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToShoppingListDialog;