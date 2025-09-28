import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { EyeOff, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IgnoredRecipe {
  id: string;
  created_at: string;
  recipe_id: string;
  recipe: {
    id: string;
    title: string;
    description: string;
    image_url: string;
  };
}

const IgnoredRecipesList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ignoredRecipes, setIgnoredRecipes] = useState<IgnoredRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchIgnoredRecipes();
    }
  }, [user]);

  const fetchIgnoredRecipes = async () => {
    try {
      // First get ignored recipe IDs
      const { data: ignoredData, error: ignoredError } = await supabase
        .from('ignored_recipes')
        .select('id, created_at, recipe_id')
        .order('created_at', { ascending: false });

      if (ignoredError) throw ignoredError;

      if (!ignoredData || ignoredData.length === 0) {
        setIgnoredRecipes([]);
        return;
      }

      // Then get the recipe details
      const recipeIds = ignoredData.map(item => item.recipe_id);
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('id, title, description, image_url')
        .in('id', recipeIds);

      if (recipesError) throw recipesError;

      // Combine the data
      const combinedData = ignoredData.map(ignored => {
        const recipe = recipesData?.find(r => r.id === ignored.recipe_id);
        return {
          ...ignored,
          recipe: recipe || {
            id: ignored.recipe_id,
            title: 'Rezept nicht verfügbar',
            description: '',
            image_url: ''
          }
        };
      });

      setIgnoredRecipes(combinedData);
    } catch (error) {
      console.error('Error fetching ignored recipes:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ignorierte Rezepte konnten nicht geladen werden."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromIgnored = async (ignoredRecipeId: string) => {
    try {
      const { error } = await supabase
        .from('ignored_recipes')
        .delete()
        .eq('id', ignoredRecipeId);

      if (error) throw error;

      setIgnoredRecipes(prev => prev.filter(recipe => recipe.id !== ignoredRecipeId));
      
      toast({
        title: "Erfolgreich entfernt",
        description: "Das Rezept wurde aus der Ignorierliste entfernt."
      });
    } catch (error) {
      console.error('Error removing ignored recipe:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Rezept konnte nicht aus der Ignorierliste entfernt werden."
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ink-900">
            <EyeOff className="h-5 w-5" />
            Ignorierte Rezepte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Lädt...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink-900">
          <EyeOff className="h-5 w-5" />
          Ignorierte Rezepte
        </CardTitle>
        <CardDescription>
          Hier sind alle Rezepte aufgelistet, die du ignoriert hast. Sie werden nicht mehr in den Empfehlungen angezeigt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ignoredRecipes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Du hast keine Rezepte ignoriert.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ignoredRecipes.map((ignoredRecipe) => (
              <div 
                key={ignoredRecipe.id}
                className="flex items-center gap-4 p-4 border border-border/30 rounded-lg bg-accent-2/10 hover:bg-accent-2/20 transition-colors"
              >
                {/* Recipe Image */}
                <div className="flex-shrink-0">
                  {ignoredRecipe.recipe.image_url ? (
                    <img
                      src={ignoredRecipe.recipe.image_url}
                      alt={ignoredRecipe.recipe.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-accent-2/30 flex items-center justify-center">
                      <EyeOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-ink-900 truncate">
                    {ignoredRecipe.recipe.title}
                  </h3>
                  {ignoredRecipe.recipe.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {ignoredRecipe.recipe.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Ignoriert am {new Date(ignoredRecipe.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/recipe/${ignoredRecipe.recipe.id}`)}
                    className="flex items-center gap-1 text-xs px-2 py-1 h-7 w-full sm:w-auto"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">Ansehen</span>
                    <span className="sm:hidden">👁️</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveFromIgnored(ignoredRecipe.id)}
                    className="flex items-center gap-1 text-destructive hover:text-destructive text-xs px-2 py-1 h-7 w-full sm:w-auto"
                  >
                    <X className="h-3 w-3" />
                    <span className="hidden sm:inline">Entfernen</span>
                    <span className="sm:hidden">✕</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IgnoredRecipesList;