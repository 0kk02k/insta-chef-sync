import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';

interface InlineEditDescriptionProps {
  value: string | null;
  recipeId: string;
  isOwner: boolean;
  onUpdate: (newValue: string | null) => void;
}

const InlineEditDescription = ({ value, recipeId, isOwner, onUpdate }: InlineEditDescriptionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const newValue = tempValue.trim() || null;
      const { error } = await supabase
        .from('recipes')
        .update({ description: newValue })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(newValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating description:', error);
      toast({
        title: "Fehler",
        description: "Beschreibung konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  if (!isOwner) {
    return value ? (
      <p className="text-muted-foreground text-lg">{value}</p>
    ) : null;
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <Textarea
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          placeholder="Beschreibung des Rezepts"
          className="min-h-[80px]"
          onKeyDown={(e) => {
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
      {value ? (
        <p className="text-muted-foreground text-lg flex-1">{value}</p>
      ) : (
        <p className="text-muted-foreground/60 text-lg italic flex-1">Keine Beschreibung</p>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-700 hover:text-slate-900"
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default InlineEditDescription;