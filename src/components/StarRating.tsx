import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number | null;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating = ({ rating, onRatingChange, readonly = false, size = 'md' }: StarRatingProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleStarClick = (newRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(newRating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleStarClick(star)}
          disabled={readonly}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
            !readonly && "hover:text-primary"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-all",
              (rating && star <= rating) 
                ? "fill-primary text-primary" 
                : "fill-transparent text-muted-foreground"
            )}
          />
        </button>
      ))}
      {rating && (
        <span className="ml-2 text-sm text-muted-foreground">
          ({rating}/5)
        </span>
      )}
    </div>
  );
};

export default StarRating;