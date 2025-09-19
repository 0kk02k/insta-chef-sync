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
import { ArrowLeft, MoreVertical, Trash2, CheckCheck, X, Apple, Fish, Milk, Sparkles, Droplets, ChefHat, ShoppingBasket, Package } from 'lucide-react';
import { useShoppingLists, useShoppingListItems } from '@/hooks/useShoppingLists';
import { useToast } from '@/hooks/use-toast';
import AddManualItemDialog from '@/components/AddManualItemDialog';

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

  const handleAddManualItem = async (item: {
    ingredient_name: string;
    amount: number | null;
    unit: string | null;
  }) => {
    await addItem({
      ingredient_name: item.ingredient_name,
      amount: item.amount,
      unit: item.unit,
      portion_multiplier: 1,
      recipe_id: null
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Obst & Gemüse':
        return Apple;
      case 'Fleisch & Fisch':
        return Fish;
      case 'Milchprodukte & Eier':
        return Milk;
      case 'Gewürze & Würzmittel':
        return Sparkles;
      case 'Öle & Essig':
        return Droplets;
      case 'Saucen & Dressings':
        return ChefHat;
      case 'Backzutaten & Haltbares':
        return Package;
      default:
        return ShoppingBasket;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Obst & Gemüse':
        return 'text-green-600';
      case 'Fleisch & Fisch':
        return 'text-red-600';
      case 'Milchprodukte & Eier':
        return 'text-blue-600';
      case 'Gewürze & Würzmittel':
        return 'text-purple-600';
      case 'Öle & Essig':
        return 'text-yellow-600';
      case 'Saucen & Dressings':
        return 'text-orange-600';
      case 'Backzutaten & Haltbares':
        return 'text-amber-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getCategoryBackgroundColor = (category: string) => {
    switch (category) {
      case 'Obst & Gemüse':
        return 'bg-green-50 dark:bg-green-950/30';
      case 'Fleisch & Fisch':
        return 'bg-red-50 dark:bg-red-950/30';
      case 'Milchprodukte & Eier':
        return 'bg-blue-50 dark:bg-blue-950/30';
      case 'Gewürze & Würzmittel':
        return 'bg-purple-50 dark:bg-purple-950/30';
      case 'Öle & Essig':
        return 'bg-yellow-50 dark:bg-yellow-950/30';
      case 'Saucen & Dressings':
        return 'bg-orange-50 dark:bg-orange-950/30';
      case 'Backzutaten & Haltbares':
        return 'bg-amber-50 dark:bg-amber-950/30';
      default:
        return 'bg-muted/30';
    }
  };

  const groupItemsByCategory = (items: any[]) => {
    const grouped = items.reduce((acc, item) => {
      const category = item.category || 'Sonstiges';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort categories by predefined order
    const categoryOrder = [
      'Obst & Gemüse',
      'Fleisch & Fisch',
      'Milchprodukte & Eier',
      'Backzutaten & Haltbares',
      'Gewürze & Würzmittel',
      'Öle & Essig',
      'Saucen & Dressings',
      'Sonstiges'
    ];

    const sortedCategories: Record<string, any[]> = {};
    categoryOrder.forEach(category => {
      if (grouped[category] && grouped[category].length > 0) {
        sortedCategories[category] = grouped[category];
      }
    });

    // Add any remaining categories not in the predefined order
    Object.keys(grouped).forEach(category => {
      if (!categoryOrder.includes(category)) {
        sortedCategories[category] = grouped[category];
      }
    });

    return sortedCategories;
  };

  const renderCategorySection = (category: string, categoryItems: any[], isChecked: boolean) => {
    if (categoryItems.length === 0) return null;

    const IconComponent = getCategoryIcon(category);
    const iconColor = getCategoryColor(category);
    const backgroundColor = getCategoryBackgroundColor(category);

    return (
      <div key={category} className="space-y-1">
        <div className={`flex items-center gap-2 px-3 py-2 -mx-6 ${backgroundColor} rounded-md`}>
          <IconComponent className={`h-4 w-4 ${iconColor}`} />
          <h4 className={`text-sm font-medium ${iconColor}`}>{category}</h4>
          <Badge variant="outline" className="text-xs">{categoryItems.length}</Badge>
        </div>
        <div className="space-y-0.5">
          {categoryItems.map((item) => (
            <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${isChecked ? 'opacity-60' : ''}`}>
              <Checkbox
                checked={item.is_checked}
                onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
              />
              <span className={`flex-1 text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
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
        </div>
      </div>
    );
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
            {/* Unchecked Items by Category */}
            {uncheckedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Einzukaufen
                    <Badge variant="secondary">{uncheckedItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(groupItemsByCategory(uncheckedItems)).map(([category, categoryItems]) =>
                    renderCategorySection(category, categoryItems, false)
                  )}
                </CardContent>
              </Card>
            )}

            {/* Checked Items by Category */}
            {checkedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                    Erledigt
                    <Badge variant="outline">{checkedItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(groupItemsByCategory(checkedItems)).map(([category, categoryItems]) =>
                    renderCategorySection(category, categoryItems, true)
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Floating Add Manual Item Button */}
        {items.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <AddManualItemDialog onItemAdd={handleAddManualItem} />
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