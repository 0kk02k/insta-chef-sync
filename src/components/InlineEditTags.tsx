import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Check, X, Hash, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';

interface InlineEditTagsProps {
  value: string[];
  recipeId: string;
  isOwner: boolean;
  onUpdate: (newValue: string[]) => void;
}

const InlineEditTags = ({ value, recipeId, isOwner, onUpdate }: InlineEditTagsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedTags = tempValue.filter(tag => tag.trim() !== '');
      const { error } = await supabase
        .from('recipes')
        .update({ tags: cleanedTags })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(cleanedTags);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: "Fehler",
        description: "Tags konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setNewTag('');
    setIsEditing(false);
  };

  const addTag = () => {
    if (newTag.trim() && !tempValue.includes(newTag.trim())) {
      setTempValue([...tempValue, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setTempValue(tempValue.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, newValue: string) => {
    const updated = [...tempValue];
    updated[index] = newValue;
    setTempValue(updated);
  };

  if (!isOwner) {
    return value && value.length > 0 ? (
      <div className="flex flex-wrap gap-2 pt-1">
        {value.map((tag, index) => (
          <span 
            key={index} 
            className="inline-flex items-center text-sm py-2 px-4 bg-hot-pink text-white rounded-md"
          >
            <Hash className="h-4 w-4 mr-2" />
            {tag}
          </span>
        ))}
      </div>
    ) : null;
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {tempValue.map((tag, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={tag}
                onChange={(e) => updateTag(index, e.target.value)}
                placeholder="Tag eingeben"
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeTag(index)}
                className="h-10 w-10 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Neues Tag hinzufügen"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button
              size="sm"
              onClick={addTag}
              disabled={!newTag.trim() || tempValue.includes(newTag.trim())}
              className="h-10 w-10 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
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
    <div className="group">
      {value && value.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((tag, index) => (
            <span 
              key={index} 
              className="inline-flex items-center text-sm py-2 px-4 bg-hot-pink text-white rounded-md"
            >
              <Hash className="h-4 w-4 mr-2" />
              {tag}
            </span>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-700 hover:text-slate-900 ml-2"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="group flex items-center gap-2 pt-1">
          <span className="text-muted-foreground/60 text-sm italic">Keine Tags</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-700 hover:text-slate-900"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default InlineEditTags;