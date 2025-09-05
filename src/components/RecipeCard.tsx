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
      className="aspect-square overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col"
      onClick={handleClick}
    >
      {/* Obere Hälfte: Bild */}
      <div className="flex-1 w-full overflow-hidden relative">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Kein Bild</span>
          </div>
        )}
        
        {recipe.instagram_url && (
          <a
            href={recipe.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 text-white hover:text-primary transition-colors bg-black/50 p-1 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      
      {/* Untere Hälfte: Titel, Tags und Beschreibung */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          
          <div className="flex flex-wrap gap-1">
            {recipe.cooking_time && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                <Clock className="h-3 w-3 mr-1" />
                {recipe.cooking_time}m
              </Badge>
            )}
            {recipe.servings && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                <Users className="h-3 w-3 mr-1" />
                {recipe.servings}
              </Badge>
            )}
          </div>
          
          {recipe.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground/60 group-hover:text-primary/60 transition-colors pt-2 text-center">
          → Details ansehen
        </div>
      </div>
    </Card>
  );
};

export default RecipeCard;