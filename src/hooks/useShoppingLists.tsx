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
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      toast({
        title: 'Fehler',
        description: 'Einkaufsliste konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  // Fallback function for simple ingredient adding (without AI)
  const addIngredientsSimple = async (
    shoppingListId: string,
    ingredients: StructuredIngredient[],
    recipeId?: string,
    existingItems: any[] = []
  ) => {
    const itemsToInsert = [];
    const itemsToUpdate = [];

    for (const ingredient of ingredients) {
      // Check if an item with the same ingredient name and unit already exists
      const existingItem = existingItems?.find(
        item => 
          item.ingredient_name.toLowerCase() === ingredient.ingredient.toLowerCase() &&
          item.unit === ingredient.unit
      );

      if (existingItem && ingredient.amount) {
        // Combine amounts if both have amounts
        const newAmount = (existingItem.amount || 0) + ingredient.amount;
        itemsToUpdate.push({
          id: existingItem.id,
          amount: newAmount,
        });
      } else {
        // Create new item
        itemsToInsert.push({
          shopping_list_id: shoppingListId,
          recipe_id: recipeId,
          ingredient_name: ingredient.ingredient,
          amount: ingredient.amount,
          unit: ingredient.unit,
          portion_multiplier: 1,
        });
      }
    }

    // Insert new items
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert);

      if (insertError) throw insertError;
    }

    // Update existing items
    for (const updateItem of itemsToUpdate) {
      const { error: updateError } = await supabase
        .from('shopping_list_items')
        .update({ amount: updateItem.amount })
        .eq('id', updateItem.id);

      if (updateError) throw updateError;
    }
  };

  const addIngredientsToList = async (
    shoppingListId: string,
    ingredients: StructuredIngredient[],
    recipeId?: string,
    portionMultiplier: number = 1
  ) => {
    try {
      // First, get existing items in the shopping list
      const { data: existingItems, error: fetchError } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', shoppingListId);

      if (fetchError) throw fetchError;

      // Scale ingredients by portion multiplier
      const scaledIngredients = ingredients.map(ingredient => ({
        ...ingredient,
        amount: ingredient.amount ? ingredient.amount * portionMultiplier : null
      }));

      // Use AI to normalize and merge ingredients
      const { data: normalizeResponse, error: normalizeError } = await supabase.functions.invoke(
        'normalize-ingredients',
        {
          body: {
            existingItems: existingItems || [],
            newIngredients: scaledIngredients,
            shoppingListId
          }
        }
      );

      if (normalizeError) {
        console.error('Normalization error:', normalizeError);
        // Fallback to simple logic if AI fails
        await addIngredientsSimple(shoppingListId, scaledIngredients, recipeId, existingItems || []);
        return;
      }

      if (!normalizeResponse?.success) {
        console.error('Normalization failed:', normalizeResponse?.error);
        // Fallback to simple logic if AI fails
        await addIngredientsSimple(shoppingListId, scaledIngredients, recipeId, existingItems || []);
        return;
      }

      const normalizedItems = normalizeResponse.normalized_items;
      console.log('Normalized items:', normalizedItems);

      const itemsToInsert = [];
      const itemsToUpdate = [];
      const itemsToDelete = [];

      for (const normalizedItem of normalizedItems) {
        if (normalizedItem.action === 'merge') {
          // Find existing items to merge
          const existingItem = existingItems?.find(item => 
            normalizedItem.original_items.includes(item.id)
          );
          
          if (existingItem) {
            itemsToUpdate.push({
              id: existingItem.id,
              ingredient_name: normalizedItem.canonical_name,
              amount: normalizedItem.amount,
              unit: normalizedItem.unit,
            });

            // Mark other items for deletion if they were merged
            const otherItems = existingItems?.filter(item => 
              normalizedItem.original_items.includes(item.id) && item.id !== existingItem.id
            );
            if (otherItems) {
              itemsToDelete.push(...otherItems.map(item => item.id));
            }
          } else {
            // No existing item matched – this is a merge between new incoming ingredients
            // Treat as a new insert of the merged canonical item
            itemsToInsert.push({
              shopping_list_id: shoppingListId,
              recipe_id: recipeId,
              ingredient_name: normalizedItem.canonical_name,
              amount: normalizedItem.amount,
              unit: normalizedItem.unit,
              portion_multiplier: portionMultiplier,
            });
          }
        } else if (normalizedItem.action === 'add' || normalizedItem.action === 'keep') {
          // Add new item or keep item (both mean: insert new item)
          // Check if this is a new ingredient (not an existing item ID)
          const isNewIngredient = !existingItems?.some(item => 
            normalizedItem.original_items.includes(item.id)
          );
          
          if (isNewIngredient) {
            itemsToInsert.push({
              shopping_list_id: shoppingListId,
              recipe_id: recipeId,
              ingredient_name: normalizedItem.canonical_name,
              amount: normalizedItem.amount,
              unit: normalizedItem.unit,
              portion_multiplier: portionMultiplier,
            });
          }
        }
      }

      // Execute database operations
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('shopping_list_items')
          .delete()
          .in('id', itemsToDelete);

        if (deleteError) throw deleteError;
      }

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('shopping_list_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      for (const updateItem of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('shopping_list_items')
          .update({ 
            ingredient_name: updateItem.ingredient_name,
            amount: updateItem.amount,
            unit: updateItem.unit 
          })
          .eq('id', updateItem.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Erfolgreich',
        description: 'Zutaten wurden zur Einkaufsliste hinzugefügt.',
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
