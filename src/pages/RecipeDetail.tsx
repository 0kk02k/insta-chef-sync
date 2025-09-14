import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, ExternalLink, Edit, Trash2, Loader2, Hash, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import EditRecipeDialog from '@/components/EditRecipeDialog';
import StarRating from '@/components/StarRating';
import CommentsSection from '@/components/CommentsSection';
import InlineEditTitle from '@/components/InlineEditTitle';
import InlineEditDescription from '@/components/InlineEditDescription';
import InlineEditIngredients from '@/components/InlineEditIngredients';
import PortionConverter from '@/components/PortionConverter';
import InlineEditInstructions from '@/components/InlineEditInstructions';
import InlineEditMetadata from '@/components/InlineEditMetadata';
import Footer from '@/components/Footer';

interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string | null;
  image_url: string | null;
  ingredients: string[];
  structured_ingredients?: StructuredIngredient[] | null;
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

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [displayedIngredients, setDisplayedIngredients] = useState<string[]>([]);
  const [currentPortions, setCurrentPortions] = useState<number>(1);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    if (!id) return;

    try {
      // First try to fetch the recipe (accessible to everyone for published recipes)
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (recipeError) {
        throw recipeError;
      }

      if (!recipeData) {
        toast({
          title: "Fehler",
          description: "Rezept nicht gefunden.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Check if user has access to this recipe
      if (!recipeData.published && (!user || user.id !== recipeData.user_id)) {
        toast({
          title: "Zugriff verweigert",
          description: "Dieses Rezept ist nicht veröffentlicht.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Then fetch the creator's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', recipeData.user_id)
        .single();

      // Combine recipe with creator name and ensure structured_ingredients is properly typed
      const recipeWithCreator = {
        ...recipeData,
        creator_name: profileData?.display_name || 'Unbekannt',
        structured_ingredients: Array.isArray(recipeData.structured_ingredients) 
          ? recipeData.structured_ingredients as unknown as StructuredIngredient[]
          : null
      } as Recipe;

      setRecipe(recipeWithCreator);
      
      // Initialize displayed ingredients and current portions
      if (recipeWithCreator.ingredients) {
        setDisplayedIngredients(recipeWithCreator.ingredients);
      }
      if (recipeWithCreator.servings) {
        setCurrentPortions(recipeWithCreator.servings);
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
      toast({
        title: "Fehler",
        description: "Rezept konnte nicht geladen werden.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !user) return;

    if (!confirm('Sind Sie sicher, dass Sie dieses Rezept löschen möchten?')) {
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      navigate('/');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: "Fehler",
        description: "Rezept konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!recipe || !user) return;

    setGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe-image', {
        body: {
          recipeId: recipe.id,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setRecipe({ ...recipe, image_url: data.imageUrl });
      } else {
        throw new Error(data.details || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Fehler",
        description: "KI-Bild konnte nicht generiert werden.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleRecipeUpdated = () => {
    fetchRecipe();
  };

  const handleTitleUpdate = (newTitle: string) => {
    if (recipe) {
      setRecipe({ ...recipe, title: newTitle });
    }
  };

  const handleDescriptionUpdate = (newDescription: string | null) => {
    if (recipe) {
      setRecipe({ ...recipe, description: newDescription });
    }
  };

  const handleIngredientsUpdate = (newIngredients: string[]) => {
    if (recipe) {
      setRecipe({ ...recipe, ingredients: newIngredients });
    }
  };

  const handleInstructionsUpdate = (newInstructions: string[]) => {
    if (recipe) {
      setRecipe({ ...recipe, instructions: newInstructions });
    }
  };

  const handleMetadataUpdate = (cookingTime: number | null, servings: number | null) => {
    if (recipe) {
      setRecipe({ ...recipe, cooking_time: cookingTime, servings: servings });
    }
  };

  const handlePortionChange = (newPortions: number, scaledIngredients: StructuredIngredient[]) => {
    setCurrentPortions(newPortions);
    // Convert structured ingredients back to text format for display
    const scaledTextIngredients = scaledIngredients.map(ingredient => {
      if (ingredient.amount && ingredient.unit) {
        return `${ingredient.amount} ${ingredient.unit} ${ingredient.ingredient}`;
      } else if (ingredient.amount) {
        return `${ingredient.amount} ${ingredient.ingredient}`;
      } else {
        return ingredient.ingredient;
      }
    });
    setDisplayedIngredients(scaledTextIngredients);
  };

  const handleRatingChange = async (newRating: number) => {
    if (!recipe || !user) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .update({ rating: newRating })
        .eq('id', recipe.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setRecipe({ ...recipe, rating: newRating });
      
      toast({
        title: "Bewertung gespeichert!",
        description: `${newRating} Sterne vergeben.`,
      });
    } catch (error) {
      console.error('Error updating rating:', error);
      toast({
        title: "Fehler",
        description: "Bewertung konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-warm/5 via-purple-soft/5 to-pink-vibrant/5 flex flex-col">
      {/* Header with dark blue background */}
      <div className="header" style={{ background: 'var(--gradient-header)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              size="icon"
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-primary border border-primary h-10 w-10 bg-white hover:bg-white"
              style={{ color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            
            {user && user.id === recipe.user_id && (
              <div className="flex items-center space-x-2">
                <div className="[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:border [&>button]:border-foreground">
                  <EditRecipeDialog recipe={recipe} onRecipeUpdated={handleRecipeUpdated} />
                </div>
                <Button 
                  size="icon"
                  variant="ghost" 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
                  style={{ 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--foreground))'
                  }}
                >
                  {deleting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Trash2 className="h-6 w-6" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Image & Title */}
            <Card className="overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
              {recipe.image_url ? (
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : user?.id === recipe.user_id && (
                <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="text-muted-foreground mb-4">
                      <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-60" />
                      <p className="text-lg font-medium">Noch kein Bild vorhanden</p>
                      <p className="text-sm">Generiere ein appetitliches Bild mit KI</p>
                    </div>
                    <Button
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="bg-gradient-to-r from-purple-soft to-hot-pink text-white hover:from-purple-soft/90 hover:to-hot-pink/90"
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generiere Bild...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          KI-Bild generieren
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <InlineEditTitle
                      value={recipe.title}
                      recipeId={recipe.id}
                      isOwner={user?.id === recipe.user_id}
                      onUpdate={handleTitleUpdate}
                    />
                    <InlineEditDescription
                      value={recipe.description}
                      recipeId={recipe.id}
                      isOwner={user?.id === recipe.user_id}
                      onUpdate={handleDescriptionUpdate}
                    />
                  </div>
                  {recipe.instagram_url && (
                    <a
                      href={recipe.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors ml-4"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  )}
                </div>
                
                <InlineEditMetadata
                  cookingTime={recipe.cooking_time}
                  servings={recipe.servings}
                  recipeId={recipe.id}
                  isOwner={user?.id === recipe.user_id}
                  onUpdate={handleMetadataUpdate}
                />
                
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {recipe.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center text-sm py-2 px-4 bg-hot-pink text-white rounded-md"
                      >
                        <Hash className="h-4 w-4 mr-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rating Section */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Bewertung:</span>
                    <StarRating 
                      rating={recipe.rating} 
                      onRatingChange={handleRatingChange} 
                      size="lg"
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Ingredients - Moved above Instructions for mobile */}
            <div className="lg:hidden space-y-6">
              {/* Portion Converter */}
              {recipe.structured_ingredients && recipe.servings && (
                <PortionConverter
                  originalServings={recipe.servings}
                  structuredIngredients={recipe.structured_ingredients}
                  onPortionChange={handlePortionChange}
                />
              )}
              
              {recipe.ingredients.length > 0 && (
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                  <CardContent className="pt-6">
                    <InlineEditIngredients
                      value={displayedIngredients.length > 0 ? displayedIngredients : recipe.ingredients}
                      recipeId={recipe.id}
                      isOwner={user?.id === recipe.user_id}
                      onUpdate={handleIngredientsUpdate}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Instructions */}
            {recipe.instructions.length > 0 && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardContent className="pt-6">
                  <InlineEditInstructions
                    value={recipe.instructions}
                    recipeId={recipe.id}
                    isOwner={user?.id === recipe.user_id}
                    onUpdate={handleInstructionsUpdate}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Only visible on desktop */}
          <div className="hidden lg:block space-y-6">
            {/* Portion Converter */}
            {recipe.structured_ingredients && recipe.servings && (
              <PortionConverter
                originalServings={recipe.servings}
                structuredIngredients={recipe.structured_ingredients}
                onPortionChange={handlePortionChange}
              />
            )}
            
            {/* Ingredients */}
            {recipe.ingredients.length > 0 && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardContent className="pt-6">
                  <InlineEditIngredients
                    value={displayedIngredients.length > 0 ? displayedIngredients : recipe.ingredients}
                    recipeId={recipe.id}
                    isOwner={user?.id === recipe.user_id}
                    onUpdate={handleIngredientsUpdate}
                  />
                </CardContent>
              </Card>
            )}

            {/* Recipe Info */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-coral">Rezept Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Erstellt von:</span>
                  <div className="font-medium">{recipe.creator_name}</div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Erstellt am:</span>
                  <div className="font-medium">{new Date(recipe.created_at).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
                {recipe.instagram_url && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Quelle:</span>
                    <div>Instagram Post</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <CommentsSection recipeId={recipe.id} isPublished={recipe.published} />
      </div>
      <Footer />
    </div>
  );
};

export default RecipeDetail;