import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InlineEditTitleProps {
  value: string;
  recipeId: string;
  isOwner: boolean;
  onUpdate: (newValue: string) => void;
}

const InlineEditTitle = ({ value, recipeId, isOwner, onUpdate }: InlineEditTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!tempValue.trim()) {
      toast({
        title: "Fehler",
        description: "Titel darf nicht leer sein.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ title: tempValue })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(tempValue);
      setIsEditing(false);
      toast({
        title: "Gespeichert!",
        description: "Titel wurde aktualisiert.",
      });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Fehler",
        description: "Titel konnte nicht gespeichert werden.",
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

  if (!isOwner) {
    return (
      <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-warm via-purple-soft to-pink-vibrant bg-clip-text text-transparent mb-2">
        {value}
      </h1>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <Input
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className="text-2xl font-bold"
          placeholder="Rezept Titel"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
        />
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
    <div className="group flex items-start gap-2">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-warm via-purple-soft to-pink-vibrant bg-clip-text text-transparent mb-2 flex-1">
        {value}
      </h1>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 mt-1 text-slate-700 hover:text-slate-900"
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default InlineEditTitle;