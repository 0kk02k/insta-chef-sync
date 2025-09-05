import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ExternalLink } from 'lucide-react';

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

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard = ({ recipe }: RecipeCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/recipe/${recipe.id}`);
  };

  return (
    <Card 
      className="h-full overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
      onClick={handleClick}
    >
      {recipe.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {recipe.title}
          </CardTitle>
          {recipe.instagram_url && (
            <a
              href={recipe.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {recipe.cooking_time && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {recipe.cooking_time} Min.
            </Badge>
          )}
          {recipe.servings && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {recipe.servings} Portionen
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {recipe.description && (
          <p className="text-sm text-muted-foreground">{recipe.description}</p>
        )}
        
        {recipe.ingredients.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Zutaten:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
              {recipe.ingredients.length > 3 && (
                <li className="text-xs italic">
                  +{recipe.ingredients.length - 3} weitere...
                </li>
              )}
            </ul>
          </div>
        )}
        
        {recipe.instructions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Anweisungen:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              {recipe.instructions.slice(0, 2).map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 font-medium">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
              {recipe.instructions.length > 2 && (
                <li className="text-xs italic">
                  +{recipe.instructions.length - 2} weitere Schritte...
                </li>
              )}
            </ol>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground pt-2 border-t flex items-center justify-between">
          <span>Hinzugefügt am {new Date(recipe.created_at).toLocaleDateString('de-DE')}</span>
          <span className="text-primary/60 group-hover:text-primary transition-colors">→ Details ansehen</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeCard;