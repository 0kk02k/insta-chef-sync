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
        description: "Rezepte konnten nicht geladen werden.",
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
    navigate('/auth');
  };

  if (loading || recipesLoading) {
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
    <div className="min-h-screen">
      {/* Hero Header mit Gradient */}
      <div className="bg-gradient-to-br from-orange-warm/10 via-purple-soft/10 to-pink-vibrant/10 border-b border-border/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-orange-warm to-coral rounded-xl shadow-lg">
                <ChefHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-warm via-purple-soft to-pink-vibrant bg-clip-text text-transparent">
                  InstaChef
                </h1>
                <p className="text-muted-foreground">Willkommen, {user?.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="border-coral/30 hover:bg-coral/5 hover:border-coral/50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {recipes.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-warm/20 via-purple-soft/20 to-pink-vibrant/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-12 border border-border/50 shadow-xl">
                <div className="p-6 bg-gradient-to-br from-orange-warm/10 to-purple-soft/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <ChefHat className="h-12 w-12 text-orange-warm" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Noch keine Rezepte vorhanden
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Fügen Sie Ihr erstes Rezept hinzu, um Ihre kulinarische Sammlung zu starten!
                </p>
                <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-soft to-pink-vibrant bg-clip-text text-transparent">
                Meine Rezepte ({recipes.length})
              </h2>
              <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="group">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-warm/10 via-purple-soft/10 to-pink-vibrant/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-95 group-hover:scale-100"></div>
                  <div className="relative">
                    <RecipeCard recipe={recipe} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;