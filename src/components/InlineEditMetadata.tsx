import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, X, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InlineEditMetadataProps {
  cookingTime: number | null;
  servings: number | null;
  recipeId: string;
  isOwner: boolean;
  onUpdate: (cookingTime: number | null, servings: number | null) => void;
}

const InlineEditMetadata = ({ cookingTime, servings, recipeId, isOwner, onUpdate }: InlineEditMetadataProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempCookingTime, setTempCookingTime] = useState(cookingTime?.toString() || '');
  const [tempServings, setTempServings] = useState(servings?.toString() || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const newCookingTime = tempCookingTime ? parseInt(tempCookingTime) : null;
      const newServings = tempServings ? parseInt(tempServings) : null;

      if (newCookingTime && newCookingTime <= 0) {
        toast({
          title: "Fehler",
          description: "Kochzeit muss eine positive Zahl sein.",
          variant: "destructive",
        });
        return;
      }

      if (newServings && newServings <= 0) {
        toast({
          title: "Fehler",
          description: "Portionen müssen eine positive Zahl sein.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('recipes')
        .update({ 
          cooking_time: newCookingTime,
          servings: newServings
        })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(newCookingTime, newServings);
      setIsEditing(false);
      toast({
        title: "Gespeichert!",
        description: "Rezept-Details wurden aktualisiert.",
      });
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast({
        title: "Fehler",
        description: "Rezept-Details konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempCookingTime(cookingTime?.toString() || '');
    setTempServings(servings?.toString() || '');
    setIsEditing(false);
  };

  if (!isOwner) {
    return (
      <div className="flex flex-wrap gap-3 pt-4">
        {cookingTime && (
          <Badge variant="secondary" className="text-sm py-2 px-4">
            <Clock className="h-4 w-4 mr-2" />
            {cookingTime} Minuten
          </Badge>
        )}
        {servings && (
          <Badge variant="secondary" className="text-sm py-2 px-4">
            <Users className="h-4 w-4 mr-2" />
            {servings} Portionen
          </Badge>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kochzeit (Minuten)</label>
            <Input
              type="number"
              value={tempCookingTime}
              onChange={(e) => setTempCookingTime(e.target.value)}
              placeholder="z.B. 30"
              min="1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Portionen</label>
            <Input
              type="number"
              value={tempServings}
              onChange={(e) => setTempServings(e.target.value)}
              placeholder="z.B. 4"
              min="1"
            />
          </div>
        </div>

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
    <div className="group flex flex-wrap gap-3 pt-4">
      {cookingTime && (
        <Badge variant="secondary" className="text-sm py-2 px-4">
          <Clock className="h-4 w-4 mr-2" />
          {cookingTime} Minuten
        </Badge>
      )}
      {servings && (
        <Badge variant="secondary" className="text-sm py-2 px-4">
          <Users className="h-4 w-4 mr-2" />
          {servings} Portionen
        </Badge>
      )}
      {(!cookingTime || !servings) && (
        <Badge variant="outline" className="text-sm py-2 px-4 text-muted-foreground">
          {!cookingTime && !servings ? 'Keine Details' : 'Unvollständig'}
        </Badge>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
      >
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default InlineEditMetadata;