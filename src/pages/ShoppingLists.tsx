import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, ShoppingCart, Trash2, Calendar, ArrowLeft } from 'lucide-react';
import { useShoppingLists } from '@/hooks/useShoppingLists';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Footer from '@/components/Footer';

const ShoppingLists = () => {
  const { shoppingLists, createShoppingList, deleteShoppingList, isLoading } = useShoppingLists();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    const listId = await createShoppingList(newListName.trim());
    if (listId) {
      setShowCreateDialog(false);
      setNewListName('');
      navigate(`/shopping-lists/${listId}`);
    }
  };

  const handleDeleteList = async () => {
    if (deleteListId) {
      await deleteShoppingList(deleteListId);
      setDeleteListId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex flex-col">
        <div style={{ background: 'hsl(var(--brand))' }} className="px-4 py-6">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white border-none"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Einkaufslisten
                </h1>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Lade Einkaufslisten...</p>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex flex-col">
      <div style={{ background: 'hsl(var(--brand))' }} className="px-4 py-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white border-none"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Einkaufslisten
              </h1>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-3 sm:p-4">
        <div className="container mx-auto max-w-4xl">

        {shoppingLists.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Einkaufslisten</h3>
              <p className="text-muted-foreground mb-4">
                Erstelle deine erste Einkaufsliste, um Rezeptzutaten zu sammeln.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Erste Liste erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shoppingLists.map((list) => (
              <Card key={list.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle 
                      className="text-xl sm:text-lg hover:text-primary transition-colors cursor-pointer"
                      onClick={() => navigate(`/shopping-lists/${list.id}`)}
                    >
                      {list.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteListId(list.id);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Erstellt am {format(new Date(list.created_at), 'dd.MM.yyyy', { locale: de })}
                  </div>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/shopping-lists/${list.id}`)}
                    >
                      Liste öffnen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>

      <Footer />

      {/* Create List Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Einkaufsliste erstellen</DialogTitle>
              <DialogDescription>
                Gib einen Namen für deine neue Einkaufsliste ein.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="z.B. Wocheneinkauf"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateList} disabled={!newListName.trim()}>
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Einkaufsliste löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Bist du sicher, dass du diese Einkaufsliste löschen möchtest? 
                Alle Einträge gehen verloren. Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default ShoppingLists;