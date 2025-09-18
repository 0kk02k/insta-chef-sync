import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import { useToast } from '@/hooks/use-toast';

export interface ShoppingList {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  recipe_id?: string;
  ingredient_name: string;
  amount?: number;
  unit?: string;
  portion_multiplier: number;
  is_checked: boolean;
  created_at: string;
}

export interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

export const useShoppingLists = () => {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchShoppingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setShoppingLists(data || []);
    } catch (error) {
      console.error('Error fetching shopping lists:', error);
      toast({
        title: 'Fehler',
        description: 'Einkaufslisten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createShoppingList = async (name: string): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{ name, user_id: userData.user.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchShoppingLists();
      toast({
        title: 'Erfolg',
        description: 'Einkaufsliste wurde erstellt.',
      });
      
      return data.id;
    } catch (error) {
      console.error('Error creating shopping list:', error);
      toast({
        title: 'Fehler',
        description: 'Einkaufsliste konnte nicht erstellt werden.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteShoppingList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchShoppingLists();
      toast({
        title: 'Erfolg',
        description: 'Einkaufsliste wurde gelöscht.',
      });
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      toast({
        title: 'Fehler',
        description: 'Einkaufsliste konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  const addIngredientsToList = async (
    shoppingListId: string,
    ingredients: StructuredIngredient[],
    recipeId?: string,
    portionMultiplier: number = 1
  ) => {
    try {
      const items = ingredients.map(ingredient => ({
        shopping_list_id: shoppingListId,
        recipe_id: recipeId,
        ingredient_name: ingredient.ingredient,
        amount: ingredient.amount ? ingredient.amount * portionMultiplier : null,
        unit: ingredient.unit,
        portion_multiplier: portionMultiplier,
      }));

      const { error } = await supabase
        .from('shopping_list_items')
        .insert(items);

      if (error) throw error;
      
      toast({
        title: 'Erfolg',
        description: 'Zutaten zur Einkaufsliste hinzugefügt.',
      });
    } catch (error) {
      console.error('Error adding ingredients to shopping list:', error);
      toast({
        title: 'Fehler',
        description: 'Zutaten konnten nicht hinzugefügt werden.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchShoppingLists();
  }, []);

  return {
    shoppingLists,
    isLoading,
    fetchShoppingLists,
    createShoppingList,
    deleteShoppingList,
    addIngredientsToList,
  };
};

export const useShoppingListItems = (shoppingListId: string) => {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', shoppingListId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shopping list items:', error);
      toast({
        title: 'Fehler',
        description: 'Einkaufsliste konnte nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = async (itemId: string, isChecked: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ is_checked: isChecked })
        .eq('id', itemId);

      if (error) throw error;
      
      setItems(items.map(item => 
        item.id === itemId ? { ...item, is_checked: isChecked } : item
      ));
    } catch (error) {
      console.error('Error toggling item:', error);
      toast({
        title: 'Fehler',
        description: 'Element konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  };

  const deleteItem = async (itemId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      setItems(items.filter(item => item.id !== itemId));
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Fehler',
        description: 'Element konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const addItem = async (itemData: {
    ingredient_name: string;
    amount?: number | null;
    unit?: string | null;
    portion_multiplier: number;
    recipe_id?: string | null;
    is_checked?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert([{
          shopping_list_id: shoppingListId,
          ...itemData,
          is_checked: itemData.is_checked || false
        }])
        .select()
        .single();

      if (error) throw error;
      
      setItems([...items, data]);
      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Fehler',
        description: 'Element konnte nicht hinzugefügt werden.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const clearCheckedItems = async () => {
    try {
      const checkedItems = items.filter(item => item.is_checked);
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .in('id', checkedItems.map(item => item.id));

      if (error) throw error;
      
      await fetchItems();
      toast({
        title: 'Erfolg',
        description: 'Erledigte Elemente wurden entfernt.',
      });
    } catch (error) {
      console.error('Error clearing checked items:', error);
      toast({
        title: 'Fehler',
        description: 'Erledigte Elemente konnten nicht entfernt werden.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (shoppingListId) {
      fetchItems();
    }
  }, [shoppingListId]);

  return {
    items,
    isLoading,
    toggleItem,
    deleteItem,
    addItem,
    clearCheckedItems,
    fetchItems,
  };
};