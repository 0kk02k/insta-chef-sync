import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';

interface PublishButtonsProps {
  recipeId: string;
  isPublished: boolean;
  isOwner: boolean;
  onUpdate: (published: boolean) => void;
}

const PublishButtons = ({ recipeId, isPublished, isOwner, onUpdate }: PublishButtonsProps) => {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handlePublishToggle = async (shouldPublish: boolean) => {
    if (!isOwner) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ published: shouldPublish })
        .eq('id', recipeId);

      if (error) throw error;

      onUpdate(shouldPublish);
      
      toast({
        title: shouldPublish ? "Rezept veröffentlicht" : "Rezept auf privat gesetzt",
        description: shouldPublish 
          ? "Das Rezept ist jetzt für alle sichtbar."
          : "Das Rezept ist jetzt nur für dich sichtbar.",
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="my-8 flex gap-4 justify-center">
      <Button
        onClick={() => handlePublishToggle(true)}
        disabled={updating}
        variant={isPublished ? "default" : "outline"}
        className={`flex-1 max-w-48 h-12 ${
          isPublished 
            ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
            : "border-green-600 text-green-600 hover:bg-green-50"
        }`}
      >
        {updating ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <Globe className="h-5 w-5 mr-2" />
        )}
        Öffentlich
      </Button>
      
      <Button
        onClick={() => handlePublishToggle(false)}
        disabled={updating}
        variant={!isPublished ? "default" : "outline"}
        className={`flex-1 max-w-48 h-12 ${
          !isPublished 
            ? "bg-gray-600 hover:bg-gray-700 text-white border-gray-600" 
            : "border-gray-600 text-gray-600 hover:bg-gray-50"
        }`}
      >
        {updating ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <Lock className="h-5 w-5 mr-2" />
        )}
        Privat
      </Button>
    </div>
  );
};

export default PublishButtons;