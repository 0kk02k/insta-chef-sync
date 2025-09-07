import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { ChefHat, LogOut, Loader2, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AddRecipeDialog from '@/components/AddRecipeDialog';
import RecipeCard from '@/components/RecipeCard';
import Footer from '@/components/Footer';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string | null;
  image_url: string | null;
  ingredients: string[];
  structured_ingredients?: any[] | null;
  instructions: string[];
  cooking_time: number | null;
  servings: number | null;
  rating: number | null;
  tags?: string[] | null;
  created_at: string;
  user_id: string;
  creator_name?: string;
  published: boolean;
}

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      // Don't redirect, allow viewing published recipes
      fetchPublishedRecipes();
    }
  }, [user, loading, navigate]);

  const fetchRecipes = async () => {
    if (!user) return;
    
    try {
      // Fetch user's own recipes (all) and published recipes from others
      const [ownRecipesResponse, publishedRecipesResponse] = await Promise.all([
        // User's own recipes (published and unpublished)
        supabase
          .from('recipes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        // Published recipes from other users
        supabase
          .from('recipes')
          .select('*')
          .eq('published', true)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (ownRecipesResponse.error) {
        throw ownRecipesResponse.error;
      }
      if (publishedRecipesResponse.error) {
        throw publishedRecipesResponse.error;
      }

      const ownRecipes = ownRecipesResponse.data || [];
      const publishedRecipes = publishedRecipesResponse.data || [];
      
      // Combine and sort all recipes by creation date
      const allRecipes = [...ownRecipes, ...publishedRecipes]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (allRecipes.length === 0) {
        setRecipes([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(allRecipes.map(recipe => recipe.user_id))];

      // Fetch profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      // Create a map of user_id to display_name
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile.display_name])
      );

      // Transform recipes to include creator_name
      const recipesWithCreators = allRecipes.map(recipe => ({
        ...recipe,
        creator_name: profilesMap.get(recipe.user_id) || 'Unbekannt'
      }));

        setRecipes(recipesWithCreators.map(recipe => ({
          ...recipe,
          structured_ingredients: Array.isArray(recipe.structured_ingredients) 
            ? recipe.structured_ingredients as unknown as any[]
            : null
        })));
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

  const fetchPublishedRecipes = async () => {
    try {
      // Fetch all published recipes for non-authenticated users
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (recipesError) {
        throw recipesError;
      }

      if (!recipesData || recipesData.length === 0) {
        setRecipes([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(recipesData.map(recipe => recipe.user_id))];

      // Fetch profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      // Create a map of user_id to display_name
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile.display_name])
      );

      // Transform recipes to include creator_name
      const recipesWithCreators = recipesData.map(recipe => ({
        ...recipe,
        creator_name: profilesMap.get(recipe.user_id) || 'Unbekannt'
      }));

      setRecipes(recipesWithCreators.map(recipe => ({
        ...recipe,
        structured_ingredients: Array.isArray(recipe.structured_ingredients) 
          ? recipe.structured_ingredients as unknown as any[]
          : null
      })));
    } catch (error) {
      console.error('Error fetching published recipes:', error);
      toast({
        title: "Fehler",
        description: "Veröffentlichte Rezepte konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setRecipesLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecipes();
    } else {
      fetchPublishedRecipes();
    }
  }, [user]);

  const handleRecipeAdded = () => {
    fetchRecipes();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Get unique creators for filter dropdown
  const uniqueCreators = Array.from(
    new Map(recipes.map(recipe => [recipe.user_id, recipe.creator_name])).entries()
  ).map(([userId, creatorName]) => ({ userId, creatorName }));

  // Filter recipes based on search term and user filter
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = !searchTerm.trim() || (() => {
      const searchLower = searchTerm.toLowerCase();
      return (
        recipe.title.toLowerCase().includes(searchLower) ||
        (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
        recipe.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes(searchLower)
        ) ||
        (recipe.tags && recipe.tags.some(tag => 
          tag.toLowerCase().includes(searchLower)
        ))
      );
    })();

    const matchesUser = !selectedUser || selectedUser === 'all' || recipe.user_id === selectedUser;

    return matchesSearch && matchesUser;
  });

  if (loading || recipesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Header mit Pink Gradient */}
      <div className="header" style={{ background: 'var(--gradient-header)' }}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-3 sm:p-4 bg-slate-700 rounded-xl shadow-lg">
                <ChefHat className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold px-2 sm:px-4 py-2" style={{ color: 'hsl(var(--primary))' }}>
                  CookingCompiler
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              {user && <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />}
              {user ? (
                <Button 
                  size="lg"
                  onClick={handleSignOut}
                  className="bg-slate-700 hover:bg-slate-600 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <LogOut className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'hsl(var(--primary))' }} />
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="border-coral/30 hover:bg-coral/5 hover:border-coral/50"
                >
                  Anmelden
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Bar and User Filter */}
        {recipes.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rezepte durchsuchen (Titel, Beschreibung, Zutaten, Tags)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface border-border/50 focus:border-primary"
                />
              </div>
              <div className="sm:w-48">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="bg-accent-2 text-white border-accent-2 hover:bg-accent-2/90" style={{ backgroundColor: 'hsl(var(--accent-2))' }}>
                    <SelectValue placeholder="Alle Benutzer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Benutzer</SelectItem>
                    {uniqueCreators.map(({ userId, creatorName }) => (
                      <SelectItem key={userId} value={userId}>
                        {creatorName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                  {user ? 'Noch keine Rezepte vorhanden' : 'Willkommen bei CookingCompiler'}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {user 
                    ? 'Fügen Sie Ihr erstes Rezept hinzu, um Ihre kulinarische Sammlung zu starten!'
                    : 'Entdecken Sie köstliche Rezepte aus der Community oder melden Sie sich an, um eigene Rezepte zu teilen!'
                  }
                </p>
                {user ? (
                  <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
                ) : (
                  <Button onClick={() => navigate('/auth')}>
                    Jetzt anmelden
                  </Button>
                )}
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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                  >
                    Suche zurücksetzen
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedUser('')}
                  >
                    Filter zurücksetzen
                  </Button>
                </div>
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
      <Footer />
    </div>
  );
};

export default Index;