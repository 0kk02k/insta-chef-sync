import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit, Check, X, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InlineEditInstructionsProps {
  value: string[];
  recipeId: string;
  isOwner: boolean;
  onUpdate: (newValue: string[]) => void;
}

const InlineEditInstructions = ({ value, recipeId, isOwner, onUpdate }: InlineEditInstructionsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    const filteredInstructions = tempValue.filter(instruction => instruction.trim() !== '');
    
    if (filteredInstructions.length === 0) {
      toast({
        title: "Fehler",
        description: "Mindestens eine Anleitung ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ instructions: filteredInstructions })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(filteredInstructions);
      setIsEditing(false);
      toast({
        title: "Gespeichert!",
        description: "Anleitung wurde aktualisiert.",
      });
    } catch (error) {
      console.error('Error updating instructions:', error);
      toast({
        title: "Fehler",
        description: "Anleitung konnte nicht gespeichert werden.",
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

  const addInstruction = () => {
    setTempValue([...tempValue, '']);
  };

  const removeInstruction = (index: number) => {
    setTempValue(tempValue.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, newValue: string) => {
    const updated = [...tempValue];
    updated[index] = newValue;
    setTempValue(updated);
  };

  if (!isOwner) {
    return (
      <ol className="space-y-4">
        {value.map((instruction, index) => (
          <li key={index} className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-lavender text-primary rounded-full flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>
            <p className="text-foreground pt-1">{instruction}</p>
          </li>
        ))}
      </ol>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="space-y-3">
          {tempValue.map((instruction, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-lavender text-primary rounded-full flex items-center justify-center font-bold text-sm mt-1">
                {index + 1}
              </div>
              <div className="flex-1 flex gap-2">
                <Textarea
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder={`Schritt ${index + 1}`}
                  className="flex-1 min-h-[60px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeInstruction(index)}
                  className="h-10 w-10 p-0 mt-0"
                  disabled={tempValue.length <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={addInstruction}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schritt hinzufügen
        </Button>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl text-purple-soft">Zubereitung</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      <ol className="space-y-4">
        {value.map((instruction, index) => (
          <li key={index} className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-lavender text-primary rounded-full flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>
            <p className="text-foreground pt-1">{instruction}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default InlineEditInstructions;