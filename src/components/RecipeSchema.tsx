import { Helmet } from 'react-helmet-async';

interface RecipeSchemaProps {
  name: string;
  description?: string | null;
  image?: string | null;
  prepTime?: number | null; // in minutes
  cookTime?: number | null; // in minutes
  totalTime?: number | null; // in minutes
  servings?: number | null;
  ingredients: string[];
  instructions: string[];
  rating?: number | null;
  author?: string;
  datePublished?: string;
  tags?: string[] | null;
}

export const RecipeSchema = ({
  name,
  description,
  image,
  prepTime,
  cookTime,
  totalTime,
  servings,
  ingredients,
  instructions,
  rating,
  author = 'CookingCompiler',
  datePublished,
  tags,
}: RecipeSchemaProps) => {
  // Convert minutes to ISO 8601 duration format
  const formatDuration = (minutes: number | null | undefined): string | undefined => {
    if (!minutes) return undefined;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `PT${hours}H${mins}M`;
    } else if (hours > 0) {
      return `PT${hours}H`;
    } else {
      return `PT${mins}M`;
    }
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name,
    ...(description && { description }),
    ...(image && { 
      image: [image],
    }),
    ...(author && {
      author: {
        '@type': 'Person',
        name: author,
      },
    }),
    ...(datePublished && { datePublished }),
    ...(prepTime && { prepTime: formatDuration(prepTime) }),
    ...(cookTime && { cookTime: formatDuration(cookTime) }),
    ...(totalTime && { totalTime: formatDuration(totalTime) }),
    ...(servings && { recipeYield: `${servings} Portionen` }),
    ...(ingredients.length > 0 && { recipeIngredient: ingredients }),
    ...(instructions.length > 0 && {
      recipeInstructions: instructions.map((instruction, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        text: instruction,
      })),
    }),
    ...(rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        ratingCount: 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(tags && tags.length > 0 && { keywords: tags.join(', ') }),
    recipeCategory: 'Hauptgericht',
    recipeCuisine: 'Internationale Küche',
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default RecipeSchema;
