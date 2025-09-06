import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ExternalLink, Star, ImageIcon } from 'lucide-react';

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
  user_id: string;
  creator_name?: string;
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
      className="aspect-square overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group relative"
      onClick={handleClick}
    >
      {/* Vollflächiges Bild */}
      <div className="absolute inset-0 w-full h-full">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full recipe-card__media recipe-card__media--empty flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-60" />
          </div>
        )}
        
        {/* Creator name in top right */}
        {recipe.creator_name && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10">
            {recipe.creator_name}
          </div>
        )}
        
        {recipe.instagram_url && (
          <a
            href={recipe.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 text-white hover:text-primary transition-colors bg-black/50 p-1 rounded z-10 mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      
      {/* Textbereich - slided von unten über das Bild */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-white/95 backdrop-blur-sm p-4 transform translate-y-1/3 group-hover:translate-y-0 transition-transform duration-300 ease-out flex flex-col justify-between">{/* Increased height for 2-line titles */}
        {/* Titel und Tags - immer sichtbar */}
        <div className="space-y-2">
          <h3 className="recipe-card__title font-semibold text-base line-clamp-2 text-slate-800 group-hover:text-slate-800 transition-colors">
            {recipe.title}
          </h3>
          
          <div className="meta flex flex-wrap gap-1">
            {recipe.rating && (
              <Badge variant="default" className="badge badge--primary text-xs px-2 py-0.5">
                <Star className="h-3 w-3 mr-1 fill-current" />
                {recipe.rating}
              </Badge>
            )}
            {recipe.cooking_time && (
              <Badge variant="secondary" className="badge text-xs px-2 py-0.5 bg-slate-100 text-slate-700 border-slate-200">
                <Clock className="h-3 w-3 mr-1" />
                {recipe.cooking_time}m
              </Badge>
            )}
            {recipe.servings && (
              <Badge variant="secondary" className="badge text-xs px-2 py-0.5 bg-slate-100 text-slate-700 border-slate-200">
                <Users className="h-3 w-3 mr-1" />
                {recipe.servings}
              </Badge>
            )}
          </div>
          
          {/* Beschreibung - wird beim Hover sichtbar */}
          {recipe.description && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <p className="text-xs text-slate-600 line-clamp-3 mt-2">
                {recipe.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RecipeCard;