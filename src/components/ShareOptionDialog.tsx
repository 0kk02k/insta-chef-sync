import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Globe, Link, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShareOptionDialogProps {
  recipe: {
    id: string;
    title: string;
    published: boolean;
    shareable?: boolean;
    user_id: string;
  };
  user: any;
  onRecipeUpdate: (updates: { published?: boolean; shareable?: boolean }) => void;
}

const ShareOptionDialog: React.FC<ShareOptionDialogProps> = ({ recipe, user, onRecipeUpdate }) => {
  const [loading, setLoading] = useState<'private' | 'public' | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const createPrivateLink = async () => {
    if (!user || user.id !== recipe.user_id) return;
    
    setLoading('private');
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ shareable: true })
        .eq('id', recipe.id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      onRecipeUpdate({ shareable: true });
      
      const shareUrl = `${window.location.origin}/recipe/${recipe.id}`;
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: 'Privater Link erstellt',
        description: 'Das Rezept ist jetzt über den Link zugänglich, erscheint aber nicht öffentlich. Link wurde kopiert!',
      });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Erstellen des privaten Links fehlgeschlagen.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const publishPublicly = async () => {
    if (!user || user.id !== recipe.user_id) return;
    
    setLoading('public');
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ published: true })
        .eq('id', recipe.id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      onRecipeUpdate({ published: true });
      
      const shareUrl = `${window.location.origin}/recipe/${recipe.id}`;
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: 'Veröffentlicht',
        description: 'Das Rezept ist jetzt öffentlich auf der Hauptseite sichtbar. Link wurde kopiert!',
      });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Veröffentlichen fehlgeschlagen.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const copyExistingLink = async () => {
    const shareUrl = `${window.location.origin}/recipe/${recipe.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link kopiert!',
        description: 'Der Rezept-Link wurde in die Zwischenablage kopiert.',
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Rezept teilen',
        description: shareUrl,
      });
    }
  };

  const getRecipeStatus = () => {
    if (recipe.published) return 'Öffentlich';
    if (recipe.shareable) return 'Teilbar';
    return 'Privat';
  };

  const getStatusIcon = () => {
    if (recipe.published) return <Globe className="h-4 w-4" />;
    if (recipe.shareable) return <Link className="h-4 w-4" />;
    return <Lock className="h-4 w-4" />;
  };

  // If already published or shareable, just copy the link
  if (recipe.published || recipe.shareable) {
    return (
      <Button
        onClick={copyExistingLink}
        size="icon"
        variant="ghost" 
        className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
        style={{ 
          backgroundColor: 'hsl(var(--primary))', 
          color: 'hsl(var(--primary-foreground))',
          borderColor: 'hsl(var(--foreground))'
        }}
        title={`Rezept teilen (${getRecipeStatus()})`}
      >
        <Share2 className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="icon"
          variant="ghost" 
          className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
          style={{ 
            backgroundColor: 'hsl(var(--primary))', 
            color: 'hsl(var(--primary-foreground))',
            borderColor: 'hsl(var(--foreground))'
          }}
          title="Rezept teilen"
        >
          <Share2 className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rezept teilen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Wählen Sie, wie Sie "{recipe.title}" teilen möchten:
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={createPrivateLink}
              disabled={loading !== null}
              className="w-full justify-start gap-3 h-auto p-4"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <Link className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium">Privaten Link erstellen</div>
                  <div className="text-sm text-muted-foreground">
                    Nur Personen mit dem Link können das Rezept sehen
                  </div>
                </div>
              </div>
              {loading === 'private' && <div className="ml-auto">...</div>}
            </Button>
            
            <Button
              onClick={publishPublicly}
              disabled={loading !== null}
              className="w-full justify-start gap-3 h-auto p-4"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-green-500" />
                <div className="text-left">
                  <div className="font-medium">Öffentlich veröffentlichen</div>
                  <div className="text-sm text-muted-foreground">
                    Rezept erscheint auf der Hauptseite und ist für alle sichtbar
                  </div>
                </div>
              </div>
              {loading === 'public' && <div className="ml-auto">...</div>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareOptionDialog;