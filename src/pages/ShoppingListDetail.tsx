import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, MoreVertical, Trash2, CheckCheck, X } from 'lucide-react';
import { useShoppingLists, useShoppingListItems } from '@/hooks/useShoppingLists';
import { useToast } from '@/hooks/use-toast';

const ShoppingListDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shoppingLists, deleteShoppingList } = useShoppingLists();
  const { items, isLoading, toggleItem, deleteItem, clearCheckedItems, addItem } = useShoppingListItems(id || '');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const currentList = shoppingLists.find(list => list.id === id);

  const handleDeleteList = async () => {
    if (id) {
      await deleteShoppingList(id);
      navigate('/shopping-lists');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const itemToDelete = items.find(item => item.id === itemId);
    if (!itemToDelete) return;

    const success = await deleteItem(itemId);
    if (success) {
      toast({
        title: "Artikel entfernt",
        description: `${formatItemDisplay(itemToDelete)} wurde entfernt.`,
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleUndoDelete(itemToDelete)}
          >
            Rückgängig
          </Button>
        ),
      });
    }
  };

  const handleUndoDelete = async (deletedItem: any) => {
    await addItem({
      ingredient_name: deletedItem.ingredient_name,
      amount: deletedItem.amount,
      unit: deletedItem.unit,
      portion_multiplier: deletedItem.portion_multiplier,
      recipe_id: deletedItem.recipe_id,
      is_checked: deletedItem.is_checked
    });
    
    toast({
      title: "Wiederhergestellt",
      description: `${formatItemDisplay(deletedItem)} wurde wiederhergestellt.`,
    });
  };

  const handleClearCheckedItems = async () => {
    await clearCheckedItems();
    setShowClearDialog(false);
  };

  const formatItemDisplay = (item: any): string => {
    if (item.amount && item.unit) {
      return `${item.amount} ${item.unit} ${item.ingredient_name}`;
    } else if (item.amount) {
      return `${item.amount} ${item.ingredient_name}`;
    } else {
      return item.ingredient_name;
    }
  };

  const checkedItems = items.filter(item => item.is_checked);
  const uncheckedItems = items.filter(item => !item.is_checked);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Lade Einkaufsliste...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Liste nicht gefunden</h3>
              <p className="text-muted-foreground mb-4">
                Die angeforderte Einkaufsliste existiert nicht oder wurde gelöscht.
              </p>
              <Button onClick={() => navigate('/shopping-lists')}>
                Zurück zu den Listen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/shopping-lists')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentList.name}</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} Artikel • {checkedItems.length} erledigt
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {checkedItems.length > 0 && (
                <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Erledigte entfernen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleDeleteList}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Liste löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {items.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Diese Einkaufsliste ist leer. Fügen Sie Zutaten aus Ihren Rezepten hinzu.
              </p>
              <Button onClick={() => navigate('/')}>
                Zu den Rezepten
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Unchecked Items */}
            {uncheckedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Einzukaufen
                    <Badge variant="secondary">{uncheckedItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {uncheckedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
                      />
                      <span className="flex-1 text-sm">
                        {formatItemDisplay(item)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Checked Items */}
            {checkedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                    Erledigt
                    <Badge variant="outline">{checkedItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {checkedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
                      />
                      <span className="flex-1 text-sm line-through text-muted-foreground">
                        {formatItemDisplay(item)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Clear Checked Items Confirmation */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Erledigte Artikel entfernen</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie alle erledigten Artikel aus der Liste entfernen? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCheckedItems}>
                Entfernen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ShoppingListDetail;