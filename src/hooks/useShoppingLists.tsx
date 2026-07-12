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
  category?: string;
}

export interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

// Helper function to normalize ingredient names for comparison
const normalizeIngredientName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,.!?]/g, '');
};

// Helper function to convert units
const convertUnit = (amount: number, fromUnit: string, toUnit: string): number | null => {
  const normalizedFrom = fromUnit?.toLowerCase().trim() || '';
  const normalizedTo = toUnit?.toLowerCase().trim() || '';
  
  // Same unit, no conversion needed
  if (normalizedFrom === normalizedTo) return amount;
  
  // Weight conversions
  if (normalizedFrom === 'g' && normalizedTo === 'kg') return amount / 1000;
  if (normalizedFrom === 'kg' && normalizedTo === 'g') return amount * 1000;
  
  // Volume conversions
  if (normalizedFrom === 'ml' && normalizedTo === 'l') return amount / 1000;
  if (normalizedFrom === 'l' && normalizedTo === 'ml') return amount * 1000;
  
  // Cannot convert between incompatible units
  return null;
};

// Helper function to determine if two units are compatible
const areUnitsCompatible = (unit1: string | null, unit2: string | null): boolean => {
  if (!unit1 || !unit2) return !unit1 && !unit2;
  
  const normalized1 = unit1.toLowerCase().trim();
  const normalized2 = unit2.toLowerCase().trim();
  
  if (normalized1 === normalized2) return true;
  
  // Weight units are compatible
  const weightUnits = ['g', 'kg', 'gramm'];
  if (weightUnits.includes(normalized1) && weightUnits.includes(normalized2)) return true;
  
  // Volume units are compatible
  const volumeUnits = ['ml', 'l', 'liter'];
  if (volumeUnits.includes(normalized1) && volumeUnits.includes(normalized2)) return true;
  
  return false;
};

// Helper function to get standardized unit (prefer kg over g, l over ml)
const getStandardUnit = (unit1: string | null, unit2: string | null): string | null => {
  if (!unit1) return unit2;
  if (!unit2) return unit1;
  
  const normalized1 = unit1.toLowerCase().trim();
  const normalized2 = unit2.toLowerCase().trim();
  
  // Prefer larger units
  if ((normalized1 === 'kg' || normalized2 === 'kg') && (normalized1 === 'g' || normalized2 === 'g')) return 'kg';
  if ((normalized1 === 'l' || normalized2 === 'l') && (normalized1 === 'ml' || normalized2 === 'ml')) return 'l';
  
  return unit1;
};

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

  const addIngredientsToList = async (
    shoppingListId: string,
    ingredients: StructuredIngredient[],
    recipeId?: string,
    portionMultiplier: number = 1
  ) => {
    try {
      // Ensure user is authenticated
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Nicht angemeldet. Bitte einloggen.');

      console.log('Adding ingredients to list:', { shoppingListId, ingredients, recipeId, portionMultiplier });

      // Verify ownership of the shopping list (prevents silent RLS denials)
      const { data: listData, error: listCheckError } = await supabase
        .from('shopping_lists')
        .select('id, user_id')
        .eq('id', shoppingListId)
        .maybeSingle();
      if (listCheckError) throw listCheckError;
      if (!listData || listData.user_id !== userData.user.id) {
        throw new Error('Keine Berechtigung für diese Einkaufsliste.');
      }

      // Fetch existing items
      const { data: existingItems, error: fetchError } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', shoppingListId);

      if (fetchError) throw fetchError;

      console.log('Existing items:', existingItems);

      // Scale ingredients by portion multiplier
      const scaledIngredients = ingredients.map(ingredient => ({
        ...ingredient,
        amount: ingredient.amount ? ingredient.amount * portionMultiplier : null
      }));

      console.log('Scaled ingredients:', scaledIngredients);

      const itemsToInsert: Array<{ shopping_list_id: string; ingredient_id: string; amount: string; unit: string; ingredient_name: string; checked: boolean }> = [];
      const itemsToUpdate: Array<{ id: string; amount: string; unit: string }> = [];

      // Process each new ingredient
      for (const newIngredient of scaledIngredients) {
        const normalizedNewName = normalizeIngredientName(newIngredient.ingredient);
        
        // Try to find a matching existing item
        const matchingItem = existingItems?.find(existingItem => {
          const normalizedExistingName = normalizeIngredientName(existingItem.ingredient_name);
          
          // Check if names match
          if (normalizedNewName !== normalizedExistingName) return false;
          
          // Check if units are compatible
          return areUnitsCompatible(existingItem.unit, newIngredient.unit);
        });

        if (matchingItem && newIngredient.amount !== null) {
          // Merge with existing item
          const standardUnit = getStandardUnit(matchingItem.unit, newIngredient.unit);
          
          let combinedAmount = matchingItem.amount || 0;
          
          // Convert existing amount to standard unit
          if (matchingItem.unit && standardUnit && matchingItem.unit !== standardUnit) {
            const converted = convertUnit(matchingItem.amount || 0, matchingItem.unit, standardUnit);
            if (converted !== null) combinedAmount = converted;
          }
          
          // Convert new amount to standard unit
          if (newIngredient.unit && standardUnit && newIngredient.unit !== standardUnit) {
            const converted = convertUnit(newIngredient.amount, newIngredient.unit, standardUnit);
            if (converted !== null) {
              combinedAmount += converted;
            } else {
              combinedAmount += newIngredient.amount;
            }
          } else {
            combinedAmount += newIngredient.amount;
          }

          itemsToUpdate.push({
            id: matchingItem.id,
            amount: combinedAmount,
            unit: standardUnit,
          });

          console.log('Merging ingredient:', {
            existing: matchingItem,
            new: newIngredient,
            combined: { amount: combinedAmount, unit: standardUnit }
          });
        } else {
          // Add as new item
          itemsToInsert.push({
            shopping_list_id: shoppingListId,
            recipe_id: recipeId,
            ingredient_name: newIngredient.ingredient,
            amount: newIngredient.amount,
            unit: newIngredient.unit,
            portion_multiplier: portionMultiplier,
            is_checked: false,
          });

          console.log('Adding new ingredient:', newIngredient);
        }
      }

      // Execute database operations
      if (itemsToUpdate.length > 0) {
        console.log('Updating items:', itemsToUpdate);
        for (const updateItem of itemsToUpdate) {
          const { error: updateError } = await supabase
            .from('shopping_list_items')
            .update({ 
              amount: updateItem.amount,
              unit: updateItem.unit 
            })
            .eq('id', updateItem.id);

          if (updateError) throw updateError;
        }
      }

      if (itemsToInsert.length > 0) {
        console.log('Inserting items:', itemsToInsert);
        const { error: insertError } = await supabase
          .from('shopping_list_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Erfolgreich',
        description: `${itemsToInsert.length + itemsToUpdate.length} Zutat${itemsToInsert.length + itemsToUpdate.length !== 1 ? 'en' : ''} hinzugefügt.`,
      });
      
    } catch (error) {
      console.error('Error adding ingredients to shopping list:', error);
      toast({
        title: 'Fehler',
        description: `Zutaten konnten nicht hinzugefügt werden: ${error instanceof Error ? error.message : String(error)}`,
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
      const normalizedName = normalizeIngredientName(itemData.ingredient_name);
      
      // Check if a similar item already exists
      const existingItem = items.find(item => 
        normalizeIngredientName(item.ingredient_name) === normalizedName
      );

      if (existingItem) {
        // Check if units are compatible
        if (areUnitsCompatible(existingItem.unit, itemData.unit || null)) {
          // Merge with existing item
          const standardUnit = getStandardUnit(existingItem.unit, itemData.unit || null);
          
          let newAmount = existingItem.amount || 0;
          
          if (itemData.amount) {
            if (existingItem.unit && itemData.unit && existingItem.unit !== itemData.unit) {
              // Convert to standard unit
              const convertedAmount = convertUnit(itemData.amount, itemData.unit, standardUnit || existingItem.unit);
              if (convertedAmount !== null) {
                newAmount = (existingItem.unit === standardUnit ? existingItem.amount || 0 : 
                           convertUnit(existingItem.amount || 0, existingItem.unit, standardUnit || existingItem.unit) || 0) + convertedAmount;
              } else {
                newAmount = (existingItem.amount || 0) + itemData.amount;
              }
            } else {
              newAmount = (existingItem.amount || 0) + itemData.amount;
            }
          }

          // Update existing item
          const { error } = await supabase
            .from('shopping_list_items')
            .update({ 
              amount: newAmount,
              unit: standardUnit
            })
            .eq('id', existingItem.id);

          if (error) throw error;
          
          setItems(items.map(item => 
            item.id === existingItem.id 
              ? { ...item, amount: newAmount, unit: standardUnit }
              : item
          ));

          
          return true;
        }
      }

      // No existing item found or units incompatible - add new item
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
