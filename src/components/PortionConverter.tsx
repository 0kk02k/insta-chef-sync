import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Users, Calculator } from 'lucide-react';

interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

interface PortionConverterProps {
  originalServings: number;
  structuredIngredients: StructuredIngredient[];
  onPortionChange: (newPortions: number, scaledIngredients: StructuredIngredient[]) => void;
}

const PortionConverter = ({ originalServings, structuredIngredients, onPortionChange }: PortionConverterProps) => {
  const [targetServings, setTargetServings] = useState(originalServings);

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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Portionen umrechnen</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="portions" className="text-sm font-medium">
              Portionen:
            </Label>
          </div>
          <div className="flex items-center gap-4 flex-1">
            <Slider
              value={[targetServings]}
              onValueChange={(values) => handlePortionChange(values[0])}
              min={1}
              max={Math.max(originalServings * 3, 12)}
              step={1}
              className="flex-1"
            />
            <Input
              id="portions"
              type="number"
              value={targetServings}
              onChange={(e) => handlePortionChange(parseInt(e.target.value) || 1)}
              min={1}
              max={99}
              className="w-16 text-center"
            />
          </div>
        </div>

        {targetServings !== originalServings && (
          <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground mb-2">
              Umgerechnete Zutaten für {targetServings} Portionen:
            </div>
            <ul className="space-y-2">
              {scaleIngredients(targetServings).map((ingredient, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gradient-to-br from-pink-vibrant to-purple-soft rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-foreground font-medium">
                    {formatIngredient(ingredient)}
                  </span>
                </li>
              ))}
            </ul>
            
            <Button
              size="sm"
              onClick={() => handlePortionChange(originalServings)}
              variant="outline"
              className="mt-3"
            >
              Original wiederherstellen ({originalServings} Portionen)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortionConverter;