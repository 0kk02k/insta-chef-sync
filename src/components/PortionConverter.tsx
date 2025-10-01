import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import AddToShoppingListDialog from './AddToShoppingListDialog';

interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

interface PortionConverterProps {
  originalServings: number;
  structuredIngredients: StructuredIngredient[];
  onPortionChange: (newPortions: number, scaledIngredients: StructuredIngredient[]) => void;
  recipeId?: string;
}

const PortionConverter = ({ originalServings, structuredIngredients, onPortionChange, recipeId }: PortionConverterProps) => {
  const [targetServings, setTargetServings] = useState(originalServings);
  const [showShoppingListDialog, setShowShoppingListDialog] = useState(false);

  const scaleIngredients = (newServings: number): StructuredIngredient[] => {
    const scaleFactor = newServings / originalServings;
    
    return structuredIngredients.map(ingredient => ({
      ...ingredient,
      amount: ingredient.amount ? Math.round((ingredient.amount * scaleFactor) * 100) / 100 : null
    }));
  };

  const handlePortionChange = (newServings: number) => {
    setTargetServings(newServings);
    const scaledIngredients = scaleIngredients(newServings);
    onPortionChange(newServings, scaledIngredients);
  };

  const formatIngredient = (ingredient: StructuredIngredient): string => {
    if (ingredient.amount && ingredient.unit) {
      return `${ingredient.amount} ${ingredient.unit} ${ingredient.ingredient}`;
    } else if (ingredient.amount) {
      return `${ingredient.amount} ${ingredient.ingredient}`;
    } else {
      return ingredient.ingredient;
    }
  };

  if (!structuredIngredients || structuredIngredients.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="portions" className="text-sm font-medium text-muted-foreground min-w-fit">
                Portionen:
              </Label>
              <div className="flex items-center gap-4 flex-1">
                <Slider
                  value={[targetServings]}
                  onValueChange={(values) => handlePortionChange(values[0])}
                  min={1}
                  max={Math.max(originalServings * 3, 12)}
                  step={1}
                  className="flex-1 [&_[role=slider]]:border-[#ae83e6] [&_[role=slider]]:bg-white [&_[role=slider]]:ring-0 [&_[role=slider]]:focus-visible:ring-0 [&_[role=slider]]:focus-visible:ring-offset-0 [&_[role=slider]]:ring-offset-transparent [&>span>span]:bg-[#ae83e6] [&>span]:bg-[hsl(21,100%,81%)]"
                />
                <Input
                  id="portions"
                  type="number"
                  value={targetServings}
                  onChange={(e) => handlePortionChange(parseInt(e.target.value) || 1)}
                  min={1}
                  max={99}
                  className="w-16 text-center border-border/50 bg-background/50"
                />
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      <AddToShoppingListDialog
        isOpen={showShoppingListDialog}
        onClose={() => setShowShoppingListDialog(false)}
        ingredients={structuredIngredients}
        currentPortions={targetServings}
        originalPortions={originalServings}
        recipeId={recipeId}
      />
    </>
  );
};

export default PortionConverter;