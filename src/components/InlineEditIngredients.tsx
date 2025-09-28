import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit, Check, X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import AddToShoppingListDialog from './AddToShoppingListDialog';

interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

interface InlineEditIngredientsProps {
  value: string[];
  recipeId: string;
  isOwner: boolean;
  onUpdate: (newValue: string[]) => void;
  structuredIngredients?: StructuredIngredient[];
  currentPortions?: number;
  originalPortions?: number;
  isProcessing?: boolean;
}

const InlineEditIngredients = ({ value, recipeId, isOwner, onUpdate, structuredIngredients, currentPortions, originalPortions, isProcessing = false }: InlineEditIngredientsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [showShoppingListDialog, setShowShoppingListDialog] = useState(false);
  const { toast } = useToast();

  // Update tempValue when value prop changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleSave = async () => {
    const filteredIngredients = tempValue.filter(ingredient => ingredient.trim() !== '');
    
    if (filteredIngredients.length === 0) {
      toast({
        title: "Fehler",
        description: "Mindestens eine Zutat ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ ingredients: filteredIngredients })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(filteredIngredients);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating ingredients:', error);
      toast({
        title: "Fehler",
        description: "Zutaten konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const addIngredient = () => {
    setTempValue([...tempValue, '']);
  };

  const removeIngredient = (index: number) => {
    setTempValue(tempValue.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, newValue: string) => {
    const updated = [...tempValue];
    updated[index] = newValue;
    setTempValue(updated);
  };

  if (!isOwner) {
    return (
      <ul className="space-y-3">
        {value.map((ingredient, index) => (
          <li key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-gradient-to-br from-pink-vibrant to-purple-soft rounded-full mt-2 flex-shrink-0"></div>
            <span className="text-foreground">{ingredient}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        {isProcessing && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="text-sm text-muted-foreground italic">
              KI analysiert Zutaten... Bitte warte mit weiteren Änderungen.
            </div>
          </div>
        )}
        
        <div className={`space-y-2 transition-opacity ${isProcessing ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
          {tempValue.map((ingredient, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={ingredient}
                onChange={(e) => updateIngredient(index, e.target.value)}
                placeholder={`Zutat ${index + 1}`}
                className="flex-1"
                disabled={isProcessing}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeIngredient(index)}
                className="h-10 w-10 p-0"
                disabled={tempValue.length <= 1 || isProcessing}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={addIngredient}
          className="w-full"
          disabled={isProcessing}
        >
          <Plus className="h-4 w-4 mr-2" />
          Zutat hinzufügen
        </Button>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || isProcessing}
            className="h-8"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={saving || isProcessing}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl text-pink-vibrant">Zutaten</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            disabled={isProcessing}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-700 hover:text-slate-900 disabled:opacity-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        
        {isProcessing && (
          <div className="mb-3 text-sm text-muted-foreground italic">
            KI analysiert Zutaten...
          </div>
        )}
        
        <ul className={`space-y-3 transition-opacity ${isProcessing ? 'opacity-60' : 'opacity-100'}`}>
          {value.map((ingredient, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-gradient-to-br from-pink-vibrant to-purple-soft rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-foreground">{ingredient}</span>
            </li>
          ))}
        </ul>
        
        {/* Add to Shopping List Button */}
        {structuredIngredients && (
          <div className="flex justify-center mt-4 pt-4 border-t border-border/30">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowShoppingListDialog(true)}
              disabled={isProcessing}
              className="gap-2 disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Zur Einkaufsliste
            </Button>
          </div>
        )}
      </div>
      
      {/* Shopping List Dialog */}
      {structuredIngredients && (
        <AddToShoppingListDialog
          isOpen={showShoppingListDialog}
          onClose={() => setShowShoppingListDialog(false)}
          ingredients={structuredIngredients}
          currentPortions={currentPortions || originalPortions || 1}
          originalPortions={originalPortions || 1}
          recipeId={recipeId}
        />
      )}
    </>
  );
};

export default InlineEditIngredients;