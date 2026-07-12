import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { ChefHat, User, LogOut, Loader2, Plus, Search, Users, ShoppingCart, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import AddRecipeDialog from '@/components/AddRecipeDialog';
import RecipeCard from '@/components/RecipeCard';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string | null;
  image_url: string | null;
  ingredients: string[];
  structured_ingredients?: Array<{ amount: string; unit: string; ingredient: string }> | null;
  instructions: string[];
  cooking_time: number | null;
  servings: number | null;
  rating: number | null;
  tags?: string[] | null;
  created_at: string;
  user_id: string;
  creator_name?: string;
  published: boolean;
  shareable?: boolean;
}

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdminRole();
  const atTop = useScrollPosition();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightOffset, setRightOffset] = useState(16);
  const updateRightOffset = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offset = Math.max(0, Math.round(window.innerWidth - rect.right));
    setRightOffset(offset);
  };

  useEffect(() => {
    updateRightOffset();
    window.addEventListener('resize', updateRightOffset);
    return () => window.removeEventListener('resize', updateRightOffset);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // Don't redirect, allow viewing published recipes
      fetchPublishedRecipes();
    }
  }, [user, loading, navigate]);

  const fetchRecipes = async () => {
    if (!user) return;
    
    try {
      // First, get the list of ignored recipes for this user
      const { data: ignoredRecipesData } = await supabase
        .from('ignored_recipes')
        .select('recipe_id')
        .eq('user_id', user.id);
      
      const ignoredRecipeIds = (ignoredRecipesData || []).map(item => item.recipe_id);

      // Fetch user's own recipes (all) and published recipes from others
      const [ownRecipesResponse, publishedRecipesResponse] = await Promise.all([
        // User's own recipes (published and unpublished)
        supabase
          .from('recipes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        // Published recipes from other users, excluding ignored ones
        ignoredRecipeIds.length > 0 
          ? supabase
              .from('recipes')
              .select('*')
              .eq('published', true)
              .neq('user_id', user.id)
              .not('id', 'in', `(${ignoredRecipeIds.join(',')})`)
              .order('created_at', { ascending: false })
          : supabase
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
            ? recipe.structured_ingredients as Array<{ amount: string; unit: string; ingredient: string }>
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
          ? recipe.structured_ingredients as unknown as Array<{ amount: string; unit: string; ingredient: string }>
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
    navigate('/');
  };

  // Get unique creators for filter dropdown
  const uniqueCreators = Array.from(
    new Map(recipes.map(recipe => [recipe.user_id, recipe.creator_name])).entries()
  ).map(([userId, creatorName]) => ({ userId, creatorName }));

  // Filter users based on search term
  const filteredUsers = uniqueCreators.filter(({ creatorName }) =>
    creatorName.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleUserSelect = (userId: string, creatorName: string) => {
    setSelectedUser(userId);
    setUserSearchTerm(creatorName);
    setShowUserDropdown(false);
  };

  const clearUserFilter = () => {
    setSelectedUser('');
    setUserSearchTerm('');
    setShowUserDropdown(false);
  };

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

  useEffect(() => {
    updateRightOffset();
  }, [filteredRecipes.length]);

  if (loading || recipesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Startseite"
        description="Entdecke und teile köstliche Rezepte. CookingCompiler ist deine digitale Rezeptsammlung zum Organisieren, Speichern und Teilen von Lieblingsrezepten."
        url="/"
      />
      {/* Hero Header with Scroll-Shrink */}
      {atTop ? (
        // HERO MODE - Full screen landing style
        <header className="header hero-header">
          <div className="container mx-auto px-4 py-12 sm:py-16">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-xl border border-black/5 mb-4">
                <ChefHat className="h-16 w-16 sm:h-24 sm:w-24" style={{ color: '#FF7A3D' }} />
              </div>
              <div className="space-y-2">
                <h1 className="brand text-5xl sm:text-7xl font-bold tracking-tight">
                  CookingCompiler
                </h1>
                <p className="text-base sm:text-lg text-white/90">KI-gestützte Rezepteverwaltung</p>
              </div>
              {/* Auth buttons */}
              <div className="flex items-center space-x-3 sm:space-x-4 mt-4">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button
                        onClick={() => navigate('/admin')}
                        variant="outline"
                        className="h-12 px-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                        title="Admin Dashboard"
                      >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Admin</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => navigate('/shopping-lists')}
                      variant="outline"
                      className="h-12 px-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-medium">Listen</span>
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      className="h-12 px-6 flex items-center gap-2 bg-white text-brand hover:bg-white/90"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Logout</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => navigate('/auth')}
                    className="h-12 px-6 flex items-center gap-2 bg-white text-brand hover:bg-white/90"
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Login</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>
      ) : (
        // COMPACT MODE - Sticky header
        <header className="header compact-header sticky top-0 z-40 shadow-md">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                  <ChefHat className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#FF7A3D' }} />
                </div>
                <div className="leading-tight">
                  <h1 className="brand text-xl sm:text-2xl font-bold leading-none">
                    CookingCompiler
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button
                        onClick={() => navigate('/admin')}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                        title="Admin"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => navigate('/shopping-lists')}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      size="sm"
                      className="h-8 px-3 bg-white text-brand hover:bg-white/90"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => navigate('/auth')}
                    size="sm"
                    className="h-8 px-3 bg-white text-brand hover:bg-white/90"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6" ref={containerRef}>
        {/* Search Bar and User Filter */}
        {recipes.length > 0 && (
          <div className={atTop ? "mb-8" : "mb-6"}>
            <div className={`flex flex-col ${atTop ? 'sm:flex-row' : 'sm:flex-row'} gap-${atTop ? '6' : '4'} ${atTop ? 'max-w-3xl mx-auto' : 'max-w-2xl mx-auto'}`}>
              <div className="relative flex-1">
                <Search className={`absolute left-${atTop ? '4' : '3'} top-1/2 transform -translate-y-1/2 ${atTop ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
                <Input
                  type="text"
                  placeholder="Rezepte durchsuchen (Titel, Beschreibung, Zutaten, Tags)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-${atTop ? '12' : '10'} ${atTop ? 'h-12 text-lg bg-white/95' : 'bg-surface'} border-border/50 focus:border-primary`}
                />
              </div>
              <div className={`${atTop ? 'sm:w-64' : 'sm:w-48'} relative`} ref={userDropdownRef}>
                <div className="relative">
                  <Users className={`absolute left-${atTop ? '4' : '3'} top-1/2 transform -translate-y-1/2 ${atTop ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
                  <Input
                    type="text"
                    placeholder="Nach Benutzer suchen..."
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserDropdown(true);
                      if (e.target.value === '') {
                        clearUserFilter();
                      }
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className={`pl-${atTop ? '12' : '10'} ${atTop ? 'h-12 text-lg bg-white/95' : 'bg-surface'} border-border/50 focus:border-primary`}
                  />
                  {userSearchTerm && (
                    <button
                      onClick={clearUserFilter}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedUser('');
                        setUserSearchTerm('');
                        setShowUserDropdown(false);
                      }}
                    >
                      Alle Benutzer
                    </div>
                    {filteredUsers.map(({ userId, creatorName }) => (
                      <div
                        key={userId}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => handleUserSelect(userId, creatorName)}
                      >
                        {creatorName}
                      </div>
                    ))}
                  </div>
                )}
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
                    ? 'Füge dein erstes Rezept hinzu, um deine kulinarische Sammlung zu starten!'
                    : 'Entdecke köstliche Rezepte aus der Community oder melde dich an, um eigene Rezepte zu teilen!'
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
                  Keine Rezepte entsprechen deiner Suche nach "{searchTerm}". 
                  Versuche es mit anderen Begriffen.
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
                    onClick={() => {
                      setSelectedUser('');
                      setUserSearchTerm('');
                    }}
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
      
      {/* Floating Add Recipe Button */}
      {user && (
        <div className="fixed bottom-6 z-50" style={{ right: rightOffset }}>
          <AddRecipeDialog onRecipeAdded={handleRecipeAdded} />
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;