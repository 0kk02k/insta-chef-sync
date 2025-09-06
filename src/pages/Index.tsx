import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ChefHat, LogOut, Loader2, Plus, Search } from 'lucide-react';
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
  rating: number | null;
  created_at: string;
}

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter(recipe => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in title, description, and ingredients
    return (
      recipe.title.toLowerCase().includes(searchLower) ||
      (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
      recipe.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(searchLower)
      )
    );
  });

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
      {/* Hero Header mit Pink Gradient */}
      <div className="header" style={{ background: 'var(--gradient-header)' }}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-orange-warm to-coral rounded-xl shadow-lg">
                <ChefHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary bg-lavender px-4 py-2 rounded-lg">
                  CookingCompiler
                </h1>
                
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleSignOut}
                className="border-coral/30 hover:bg-coral/5 hover:border-coral/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        {recipes.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rezepte durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-border/50 focus:border-primary"
              />
            </div>
            {searchTerm && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  {filteredRecipes.length} {filteredRecipes.length === 1 ? 'Rezept gefunden' : 'Rezepte gefunden'}
                  {filteredRecipes.length > 0 && searchTerm && (
                    <span> für "{searchTerm}"</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-warm/20 via-purple-soft/20 to-pink-vibrant/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-xl">
                <div className="p-6 bg-gradient-to-br from-orange-warm/10 to-purple-soft/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <ChefHat className="h-10 w-10 text-orange-warm" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Noch keine Rezepte vorhanden
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Fügen Sie Ihr erstes Rezept hinzu, um Ihre kulinarische Sammlung zu starten!
                </p>
                <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
              </div>
            </div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-warm/20 via-purple-soft/20 to-pink-vibrant/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-xl">
                <div className="p-6 bg-gradient-to-br from-orange-warm/10 to-purple-soft/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-10 w-10 text-orange-warm" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Keine Rezepte gefunden
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Keine Rezepte entsprechen Ihrer Suche nach "{searchTerm}". 
                  Versuchen Sie es mit anderen Begriffen.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="mr-3"
                >
                  Suche zurücksetzen
                </Button>
                <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredRecipes.map((recipe) => (
                <div key={recipe.id} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-warm/10 via-purple-soft/10 to-pink-vibrant/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-95 group-hover:scale-100 pointer-events-none"></div>
                  <div className="relative z-10">
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