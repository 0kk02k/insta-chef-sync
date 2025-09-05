import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ChefHat, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AddRecipeDialog from '@/components/AddRecipeDialog';
import RecipeCard from '@/components/RecipeCard';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string | null;
  image_url: string | null;
  ingredients: string[];
  instructions: string[];
  cooking_time: number | null;
  servings: number | null;
  created_at: string;
}

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchRecipes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Laden der Rezepte.",
        variant: "destructive",
      });
    } finally {
      setRecipesLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  const handleRecipeAdded = () => {
    fetchRecipes();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-primary rounded-full p-2">
              <ChefHat className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">InstaChef</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Willkommen, {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">Ihre Rezeptsammlung</h2>
              <p className="text-muted-foreground mt-2">
                Sammeln und organisieren Sie Ihre Instagram-Rezepte in einem einheitlichen Format.
              </p>
            </div>
            <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
          </div>

          {recipesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto bg-card border border-border rounded-lg p-8">
                <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Noch keine Rezepte</h3>
                <p className="text-muted-foreground mb-4">
                  Fügen Sie Ihr erstes Rezept hinzu, um loszulegen.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
