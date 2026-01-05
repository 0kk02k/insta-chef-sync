import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, ExternalLink, Trash2, Loader2, Hash, Sparkles, EyeOff, Copy, Share2, Link, FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import { useAuth } from '@/hooks/useAuth';
import StarRating from '@/components/StarRating';
import CommentsSection from '@/components/CommentsSection';
import InlineEditTitle from '@/components/InlineEditTitle';
import InlineEditDescription from '@/components/InlineEditDescription';
import InlineEditIngredients from '@/components/InlineEditIngredients';
import PortionConverter from '@/components/PortionConverter';
import InlineEditInstructions from '@/components/InlineEditInstructions';
import InlineEditMetadata from '@/components/InlineEditMetadata';
import InlineEditImage from '@/components/InlineEditImage';
import InlineEditTags from '@/components/InlineEditTags';
import PublishButtons from '@/components/PublishButtons';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import RecipeSchema from '@/components/RecipeSchema';

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
  shareable?: boolean;
  original_recipe_id?: string | null;
  is_forked?: boolean;
  original_creator_id?: string | null;
  original_creator_name?: string;
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
  const [ignoring, setIgnoring] = useState(false);
  const [forking, setForking] = useState(false);
  const [displayedIngredients, setDisplayedIngredients] = useState<string[]>([]);
  const [currentPortions, setCurrentPortions] = useState<number>(1);
  const [canScale, setCanScale] = useState<boolean>(true);
  const [isProcessingIngredients, setIsProcessingIngredients] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  // Helper function to format structured ingredients into text format
  const formatStructuredIngredients = (structuredIngredients: StructuredIngredient[]): string[] => {
    return structuredIngredients.map(ingredient => {
      if (ingredient.amount && ingredient.unit) {
        return `${ingredient.amount} ${ingredient.unit} ${ingredient.ingredient}`;
      } else if (ingredient.amount) {
        return `${ingredient.amount} ${ingredient.ingredient}`;
      } else {
        return ingredient.ingredient;
      }
    });
  };

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
      if (!recipeData.published && !recipeData.shareable && (!user || user.id !== recipeData.user_id)) {
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

      // If this is a forked recipe, also fetch the original creator's profile
      let originalCreatorData = null;
      if (recipeData.is_forked && recipeData.original_creator_id) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', recipeData.original_creator_id)
          .single();
        originalCreatorData = data;
      }

      // Combine recipe with creator name and ensure structured_ingredients is properly typed
      const recipeWithCreator = {
        ...recipeData,
        creator_name: profileData?.display_name || 'Unbekannt',
        original_creator_name: originalCreatorData?.display_name || null,
        structured_ingredients: Array.isArray(recipeData.structured_ingredients) 
          ? recipeData.structured_ingredients as unknown as StructuredIngredient[]
          : null
      } as Recipe;

      setRecipe(recipeWithCreator);
      
      // Initialize displayed ingredients - prefer structured_ingredients (metric) over original ingredients
      if (recipeWithCreator.structured_ingredients && recipeWithCreator.structured_ingredients.length > 0) {
        setDisplayedIngredients(formatStructuredIngredients(recipeWithCreator.structured_ingredients));
      } else if (recipeWithCreator.ingredients) {
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

    if (!confirm('Bist du sicher, dass du dieses Rezept löschen möchtest?')) {
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

  const handleGenerateImage = async (provider: 'kie' | 'together' = 'kie') => {
    if (!recipe || !user) return;

    console.log(`🚀 RecipeDetail: Starting image generation with ${provider} (SeaDream as default)...`);
    setGeneratingImage(true);

    try {
      // Try KiE.ai SeaDream first
      const functionName = provider === 'kie' ? 'generate-recipe-image-kie' : 'generate-recipe-image';
      console.log(`📡 RecipeDetail: Calling function: ${functionName}`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          recipeId: recipe.id,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients
        }
      });

      console.log(`📋 RecipeDetail: ${provider} response:`, { data, error });

      if (error) {
        console.error(`❌ RecipeDetail: Error with ${provider}:`, error);
        
        // Fallback to the other provider if KiE.ai fails
        if (provider === 'kie') {
          console.log('🔄 RecipeDetail: Falling back to Together AI...');
          await handleGenerateImage('together');
          return;
        }
        
        throw error;
      }

      if (data?.success) {
        console.log(`✅ RecipeDetail: ${provider} generated image successfully:`, data.imageUrl);
        setRecipe({ ...recipe, image_url: data.imageUrl });
        const providerName = provider === 'kie' ? 'SeaDream' : 'FLUX';
      } else {
        throw new Error(data?.details || 'Failed to generate image');
      }
    } catch (error) {
      console.error(`❌ RecipeDetail: Error generating image with ${provider}:`, error);
      
      // Fallback to the other provider if KiE.ai fails
      if (provider === 'kie') {
        console.log('🔄 RecipeDetail: Exception fallback to Together AI...');
        await handleGenerateImage('together');
        return;
      }
      
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

  const handleImageUpdate = (newImageUrl: string | null) => {
    if (recipe) {
      setRecipe({ ...recipe, image_url: newImageUrl });
    }
  };

  const handleTagsUpdate = (newTags: string[]) => {
    if (recipe) {
      setRecipe({ ...recipe, tags: newTags });
    }
  };

  const handlePublishUpdate = (published: boolean) => {
    if (recipe) {
      setRecipe({ ...recipe, published });
    }
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
    // Sichtbare Liste sofort aktualisieren
    setDisplayedIngredients(newIngredients);

    // Während Re-Parsing Skalierung deaktivieren
    setCanScale(false);
    setIsProcessingIngredients(true);

    // AI-Reprocessing der Zutaten anstoßen (structured_ingredients aktualisieren)
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('restructure-ingredients', {
          body: { recipeId: recipe?.id, ingredients: newIngredients }
        });
        if (error) throw error;
        if (data?.success && data.structured_ingredients) {
          setRecipe(prev => prev ? { ...prev, structured_ingredients: data.structured_ingredients } as any : prev);
          // Falls Portionen bereits geändert wurden, neu skalieren
          if (recipe?.servings) {
            const factor = currentPortions / recipe.servings;
            const scaled = data.structured_ingredients.map((ing: any) => ({
              ...ing,
              amount: ing.amount ? Math.round(ing.amount * factor * 100) / 100 : null
            }));
            const scaledText = scaled.map((ingredient: any) => {
              if (ingredient.amount && ingredient.unit) return `${ingredient.amount} ${ingredient.unit} ${ingredient.ingredient}`;
              if (ingredient.amount) return `${ingredient.amount} ${ingredient.ingredient}`;
              return ingredient.ingredient;
            });
            setDisplayedIngredients(scaledText);
          }
        }
      } catch (e) {
        console.error('Reprocessing error:', e);
      } finally {
        setCanScale(true);
        setIsProcessingIngredients(false);
      }
    })();
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
    if (!canScale) {
      return; // Während Re-Parsing nicht überschreiben
    }
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

  const handleIgnoreRecipe = async () => {
    if (!recipe || !user) return;

    if (!confirm('Möchtest du dieses Rezept ignorieren? Es wird dann nicht mehr in deiner Rezeptliste angezeigt.')) {
      return;
    }

    setIgnoring(true);

    try {
      const { error } = await supabase
        .from('ignored_recipes')
        .insert({
          user_id: user.id,
          recipe_id: recipe.id
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Rezept ignoriert",
        description: "Das Rezept wird nicht mehr in deiner Liste angezeigt.",
      });

      navigate('/');
    } catch (error) {
      console.error('Error ignoring recipe:', error);
      toast({
        title: "Fehler",
        description: "Rezept konnte nicht ignoriert werden.",
        variant: "destructive",
      });
    } finally {
      setIgnoring(false);
    }
  };

  const handleForkRecipe = async () => {
    if (!recipe || !user) return;

    if (!confirm('Möchtest du dieses Rezept übernehmen und als eigenes bearbeiten?')) {
      return;
    }

    setForking(true);

    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          structured_ingredients: recipe.structured_ingredients as any,
          instructions: recipe.instructions,
          cooking_time: recipe.cooking_time,
          servings: recipe.servings,
          tags: recipe.tags,
          user_id: user.id,
          published: false, // New forked recipes start as unpublished
          is_forked: true,
          original_recipe_id: recipe.id,
          original_creator_id: recipe.user_id,
          image_url: recipe.image_url // Copy the image URL as well
        })
        .select()
        .single();

      if (error) {
        throw error;
      }


      // Navigate to the new forked recipe
      navigate(`/recipe/${data.id}`);
    } catch (error) {
      console.error('Error forking recipe:', error);
      toast({
        title: "Fehler",
        description: "Rezept konnte nicht übernommen werden.",
        variant: "destructive",
      });
    } finally {
      setForking(false);
    }
  };

  const handleShareRecipe = async () => {
    if (!recipe) return;

    // Make recipe shareable if it isn't already
    if (!recipe.shareable && !recipe.published && user && user.id === recipe.user_id) {
      const { error } = await supabase
        .from('recipes')
        .update({ shareable: true })
        .eq('id', recipe.id)
        .eq('user_id', user.id);
      
      if (error) {
        toast({
          title: 'Fehler',
          description: 'Fehler beim Teilen des Rezepts.',
          variant: 'destructive',
        });
        return;
      }
      setRecipe({ ...recipe, shareable: true });
    }

    const shareUrl = `${window.location.origin}/recipe/${recipe.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link kopiert!',
        description: 'Der Rezept-Link wurde in die Zwischenablage kopiert.',
      });
    } catch (error) {
      toast({ title: 'Rezept teilen', description: shareUrl });
    }
  };

  const handleExportPDF = async () => {
    if (!recipe) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Helper function for page breaks
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Title - Elegant serif style
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      const titleLines = doc.splitTextToSize(recipe.title, contentWidth);
      titleLines.forEach((line: string) => {
        checkPageBreak(10);
        doc.text(line, margin, yPos);
        yPos += 10;
      });

      // Description as subtitle (directly under title)
      if (recipe.description) {
        yPos += 2;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(recipe.description, contentWidth);
        descLines.forEach((line: string) => {
          doc.text(line, margin, yPos);
          yPos += 4;
        });
      }

      // Tags as subtitle (under description)
      if (recipe.tags && recipe.tags.length > 0) {
        yPos += 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const tagsText = recipe.tags.map(t => `#${t}`).join('  ');
        doc.text(tagsText, margin, yPos);
        yPos += 5;
      }

      // Thin decorative line under title/description/tags
      yPos += 3;
      doc.setLineWidth(0.5);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Two-column layout: Ingredients (left) + Image (right)
      const leftColWidth = contentWidth * 0.45;
      const rightColWidth = contentWidth * 0.50;
      const colGap = contentWidth * 0.05;
      const leftColX = margin;
      const rightColX = margin + leftColWidth + colGap;
      const twoColumnStartY = yPos;

      // Section header helper for columns
      const addColumnSectionHeader = (title: string, x: number, colWidth: number, startY: number): number => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(title, x, startY);
        const lineY = startY + 2;
        doc.setLineWidth(0.3);
        doc.setDrawColor(150, 150, 150);
        doc.line(x, lineY, x + colWidth, lineY);
        return startY + 8;
      };

      // Render ingredients in left column
      let leftColY = addColumnSectionHeader('Zutaten', leftColX, leftColWidth, twoColumnStartY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);

      displayedIngredients.forEach((ingredient) => {
        const ingredientLines = doc.splitTextToSize('• ' + ingredient, leftColWidth - 5);
        ingredientLines.forEach((line: string) => {
          doc.text(line, leftColX, leftColY);
          leftColY += 4;
        });
      });

      // Render image in right column (proportionally scaled)
      let rightColEndY = twoColumnStartY;
      if (recipe.image_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const imgMaxWidth = rightColWidth;
              const imgMaxHeight = 70;
              
              // Calculate proportional scaling (no distortion)
              const aspectRatio = img.width / img.height;
              let imgWidth = imgMaxWidth;
              let imgHeight = imgWidth / aspectRatio;
              
              // Constrain to max height if needed
              if (imgHeight > imgMaxHeight) {
                imgHeight = imgMaxHeight;
                imgWidth = imgHeight * aspectRatio;
              }
              
              // Center image horizontally in column if smaller than column width
              const imgX = rightColX + (rightColWidth - imgWidth) / 2;
              
              doc.addImage(img, 'JPEG', imgX, twoColumnStartY, imgWidth, imgHeight);
              rightColEndY = twoColumnStartY + imgHeight;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = recipe.image_url;
          });
        } catch (error) {
          console.error('Error loading image for PDF:', error);
        }
      }

      // Move yPos below both columns
      yPos = Math.max(leftColY, rightColEndY) + 8;

      // Metadata section (compact)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      
      const metaInfo = [];
      if (recipe.cooking_time) metaInfo.push(`${recipe.cooking_time} Min.`);
      metaInfo.push(`${currentPortions} Portionen`);
      if (recipe.rating) metaInfo.push(`${'★'.repeat(recipe.rating)}${'☆'.repeat(5 - recipe.rating)}`);
      
      doc.text(metaInfo.join('  •  '), margin, yPos);
      yPos += 8;

      // Section header helper for full width
      const addSectionHeader = (title: string) => {
        checkPageBreak(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin, yPos);
        yPos += 2;
        doc.setLineWidth(0.3);
        doc.setDrawColor(150, 150, 150);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
      };

      // Instructions Section (compact spacing)
      if (recipe.instructions && recipe.instructions.length > 0) {
        addSectionHeader('Zubereitung');
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);

        recipe.instructions.forEach((step, index) => {
          checkPageBreak(8);
          
          // Step number
          doc.setFont("helvetica", "bold");
          doc.text(`${index + 1}.`, margin, yPos);
          
          // Step text
          doc.setFont("helvetica", "normal");
          const stepText = step.trim();
          const stepLines = doc.splitTextToSize(stepText, contentWidth - 12);
          stepLines.forEach((line: string, lineIndex: number) => {
            if (lineIndex > 0) checkPageBreak(4);
            doc.text(line, margin + 12, yPos);
            if (lineIndex < stepLines.length - 1) yPos += 4;
          });
          
          yPos += 6;
        });
      }

      // Footer
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Erstellt am ${new Date().toLocaleDateString('de-DE')}`,
          margin,
          pageHeight - 10
        );
        doc.text(
          `Seite ${i} von ${totalPages}`,
          pageWidth - margin - 20,
          pageHeight - 10
        );
      }

      // Save
      const fileName = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${currentPortions}_portionen.pdf`;
      doc.save(fileName);

      toast({
        title: 'PDF exportiert!',
        description: 'Das Rezept wurde als PDF heruntergeladen.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Fehler',
        description: 'PDF konnte nicht erstellt werden.',
        variant: 'destructive',
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

  // Generate description for SEO
  const seoDescription = recipe.description 
    ? recipe.description.substring(0, 155) + (recipe.description.length > 155 ? '...' : '')
    : `${recipe.title} - Ein köstliches Rezept mit ${recipe.ingredients?.length || 0} Zutaten. Jetzt auf CookingCompiler entdecken!`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-warm/5 via-purple-soft/5 to-pink-vibrant/5 flex flex-col">
      <SEO 
        title={recipe.title}
        description={seoDescription}
        image={recipe.image_url || undefined}
        url={`/recipe/${recipe.id}`}
        type="article"
      />
      <RecipeSchema 
        name={recipe.title}
        description={recipe.description}
        image={recipe.image_url}
        totalTime={recipe.cooking_time}
        servings={recipe.servings}
        ingredients={displayedIngredients}
        instructions={recipe.instructions || []}
        rating={recipe.rating}
        author={recipe.creator_name}
        datePublished={recipe.created_at}
        tags={recipe.tags}
      />
      {/* Header with dark blue background */}
      <header className="header" style={{ background: 'hsl(var(--brand))' }}>
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
            
            {user && user.id === recipe.user_id ? (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon"
                      variant="ghost" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
                      style={{ 
                        backgroundColor: 'hsl(var(--primary))', 
                        color: 'hsl(var(--primary-foreground))',
                        borderColor: 'hsl(var(--foreground))'
                      }}
                      title="Teilen & Exportieren"
                    >
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                    <DropdownMenuItem onClick={handleShareRecipe}>
                      <Link className="h-4 w-4 mr-2" />
                      Link kopieren
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF exportieren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            ) : user && user.id !== recipe.user_id && (recipe.published || recipe.shareable) ? (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon"
                      variant="ghost" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
                      style={{ 
                        backgroundColor: 'hsl(var(--primary))', 
                        color: 'hsl(var(--primary-foreground))',
                        borderColor: 'hsl(var(--foreground))'
                      }}
                      title="Teilen & Exportieren"
                    >
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                    <DropdownMenuItem onClick={handleShareRecipe}>
                      <Link className="h-4 w-4 mr-2" />
                      Link kopieren
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF exportieren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  size="icon"
                  variant="ghost" 
                  onClick={handleForkRecipe}
                  disabled={forking}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
                  style={{ 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--foreground))'
                  }}
                  title="Rezept übernehmen"
                >
                  {forking ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Copy className="h-6 w-6" />
                  )}
                </Button>
                <Button 
                  size="icon"
                  variant="ghost" 
                  onClick={handleIgnoreRecipe}
                  disabled={ignoring}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
                  style={{ 
                    backgroundColor: 'hsl(var(--primary))', 
                    color: 'hsl(var(--primary-foreground))',
                    borderColor: 'hsl(var(--foreground))'
                  }}
                  title="Rezept ignorieren"
                >
                  {ignoring ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <EyeOff className="h-6 w-6" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon"
                      variant="ghost" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 border border-foreground h-10 w-10"
                      style={{ 
                        backgroundColor: 'hsl(var(--primary))', 
                        color: 'hsl(var(--primary-foreground))',
                        borderColor: 'hsl(var(--foreground))'
                      }}
                      title="Teilen & Exportieren"
                    >
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                    <DropdownMenuItem onClick={handleShareRecipe}>
                      <Link className="h-4 w-4 mr-2" />
                      Link kopieren
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF exportieren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-3">
            {/* Recipe Image & Title */}
            <Card className="overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
              <InlineEditImage
                value={recipe.image_url}
                recipeId={recipe.id}
                recipeTitle={recipe.title}
                isOwner={user?.id === recipe.user_id}
                onUpdate={handleImageUpdate}
                onGenerateImage={handleGenerateImage}
                generatingImage={generatingImage}
              />
              
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
                
                <InlineEditTags
                  value={recipe.tags || []}
                  recipeId={recipe.id}
                  isOwner={user?.id === recipe.user_id}
                  onUpdate={handleTagsUpdate}
                />

                {/* Rating Section */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex flex-col gap-1">
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
            <div className="lg:hidden space-y-3">
              {/* Portion Converter */}
              {recipe.structured_ingredients && recipe.servings && (
                <PortionConverter
                  originalServings={recipe.servings}
                  structuredIngredients={recipe.structured_ingredients}
                  onPortionChange={handlePortionChange}
                  recipeId={recipe.id}
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
                    structuredIngredients={recipe.structured_ingredients}
                    currentPortions={currentPortions}
                    originalPortions={recipe.servings}
                    isProcessing={isProcessingIngredients}
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
          <div className="hidden lg:block space-y-3">
            {/* Portion Converter */}
            {recipe.structured_ingredients && recipe.servings && (
              <PortionConverter
                originalServings={recipe.servings}
                structuredIngredients={recipe.structured_ingredients}
                onPortionChange={handlePortionChange}
                recipeId={recipe.id}
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
                  structuredIngredients={recipe.structured_ingredients}
                  currentPortions={currentPortions}
                  originalPortions={recipe.servings}
                  isProcessing={isProcessingIngredients}
                />
                </CardContent>
              </Card>
            )}

            {/* Recipe Info */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-coral">Rezept Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {recipe.is_forked ? 'Geändert von:' : 'Erstellt von:'}
                  </span>
                  <div className="font-medium">{recipe.creator_name}</div>
                  {recipe.is_forked && recipe.original_creator_name && (
                    <>
                      <span className="text-muted-foreground block mt-1">Original von:</span>
                      <div className="font-medium">{recipe.original_creator_name}</div>
                    </>
                  )}
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

        {/* Publish Buttons */}
        <PublishButtons
          recipeId={recipe.id}
          isPublished={recipe.published}
          isOwner={user?.id === recipe.user_id}
          onUpdate={handlePublishUpdate}
        />

        {/* Comments Section */}
        <CommentsSection recipeId={recipe.id} isPublished={Boolean(recipe.published || recipe.shareable)} />
      </div>
      <Footer />
    </div>
  );
};

export default RecipeDetail;