import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, ExternalLink, Edit, Trash2, Loader2, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import EditRecipeDialog from '@/components/EditRecipeDialog';
import StarRating from '@/components/StarRating';

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
  tags?: string[] | null;
  created_at: string;
}

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchRecipe();
  }, [id, user]);

  const fetchRecipe = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        toast({
          title: "Fehler",
          description: "Rezept nicht gefunden.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setRecipe(data);
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

      toast({
        title: "Erfolgreich!",
        description: "Rezept wurde gelöscht.",
      });

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

  const handleRecipeUpdated = () => {
    fetchRecipe();
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
    <div className="min-h-screen bg-gradient-to-br from-orange-warm/5 via-purple-soft/5 to-pink-vibrant/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="border-purple-soft/30 hover:bg-purple-soft/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          
          <div className="flex items-center space-x-2">
            <EditRecipeDialog recipe={recipe} onRecipeUpdated={handleRecipeUpdated} />
            <Button 
              variant="outline" 
              onClick={handleDelete}
              disabled={deleting}
              className="border-coral/30 hover:bg-coral/5 text-coral"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Löschen
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Image & Title */}
            <Card className="overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
              {recipe.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-warm via-purple-soft to-pink-vibrant bg-clip-text text-transparent mb-2">
                      {recipe.title}
                    </CardTitle>
                    {recipe.description && (
                      <p className="text-muted-foreground text-lg">{recipe.description}</p>
                    )}
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
                
                <div className="flex flex-wrap gap-3 pt-4">
                  {recipe.cooking_time && (
                    <Badge variant="secondary" className="text-sm py-2 px-4">
                      <Clock className="h-4 w-4 mr-2" />
                      {recipe.cooking_time} Minuten
                    </Badge>
                  )}
                  {recipe.servings && (
                    <Badge variant="secondary" className="text-sm py-2 px-4">
                      <Users className="h-4 w-4 mr-2" />
                      {recipe.servings} Portionen
                    </Badge>
                  )}
                  {recipe.tags && recipe.tags.length > 0 && recipe.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      className="text-sm py-2 px-4 bg-purple-soft text-white border-purple-soft hover:bg-purple-soft/90"
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      {tag}
                    </Badge>
                  ))}
                </div>

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
            <div className="lg:hidden">
              {recipe.ingredients.length > 0 && (
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl text-pink-vibrant">Zutaten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gradient-to-br from-pink-vibrant to-purple-soft rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-foreground">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Instructions */}
            {recipe.instructions.length > 0 && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-purple-soft">Zubereitung</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {recipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-lavender text-primary rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="text-foreground pt-1">{instruction}</p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Only visible on desktop */}
          <div className="hidden lg:block space-y-6">
            {/* Ingredients */}
            {recipe.ingredients.length > 0 && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-pink-vibrant">Zutaten</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gradient-to-br from-pink-vibrant to-purple-soft rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-foreground">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
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
      </div>
    </div>
  );
};

export default RecipeDetail;