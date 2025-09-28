import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Globe, Link, Lock } from 'lucide-react';

interface RecipeStatusBadgeProps {
  published: boolean;
  shareable?: boolean;
}

const RecipeStatusBadge: React.FC<RecipeStatusBadgeProps> = ({ published, shareable }) => {
  if (published) {
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
        <Globe className="h-3 w-3" />
        Öffentlich
      </Badge>
    );
  }
  
  if (shareable) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200">
        <Link className="h-3 w-3" />
        Teilbar
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 text-gray-600 border-gray-200">
      <Lock className="h-3 w-3" />
      Privat
    </Badge>
  );
};

export default RecipeStatusBadge;