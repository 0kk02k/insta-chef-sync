-- Add category column to shopping_list_items table
ALTER TABLE public.shopping_list_items 
ADD COLUMN category text DEFAULT 'Sonstiges';

-- Create function to categorize ingredients
CREATE OR REPLACE FUNCTION public.categorize_ingredient(ingredient_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Convert to lowercase for case-insensitive matching
  ingredient_name := lower(ingredient_name);
  
  -- Obst & Gemüse
  IF ingredient_name ~ '(apfel|birne|banane|orange|zitrone|limette|erdbeere|himbeere|blaubeere|traube|ananas|mango|kiwi|melone|pfirsich|pflaume|kirsche|avocado|tomate|gurke|paprika|zwiebel|knoblauch|karotte|möhre|kartoffel|süßkartoffel|brokkoli|blumenkohl|spinat|salat|rucola|kohl|zucchini|aubergine|kürbis|radieschen|rettich|sellerie|lauch|porree|pilz|champignon|ingwer|chili|peperoni|mais|erbse|bohne|linse|kichererbse|petersilie|basilikum|schnittlauch|dill|koriander|minze|thymian|rosmarin|oregano|salbei)' THEN
    RETURN 'Obst & Gemüse';
  
  -- Fleisch & Fisch
  ELSIF ingredient_name ~ '(fleisch|rindfleisch|schweinefleisch|lammfleisch|hähnchen|huhn|pute|truthahn|ente|gans|wurst|bratwurst|speck|schinken|salami|hackfleisch|schnitzel|steak|kotelett|fisch|lachs|thunfisch|kabeljau|seelachs|forelle|hering|sardine|makrele|garnele|shrimp|krabbe|muschel|tintenfisch|kalmar)' THEN
    RETURN 'Fleisch & Fisch';
  
  -- Milchprodukte & Eier
  ELSIF ingredient_name ~ '(milch|sahne|butter|käse|joghurt|quark|frischkäse|mozzarella|parmesan|gouda|emmental|cheddar|feta|ricotta|mascarpone|crème|schmand|sauerrahm|ei|eier|eiweiss|eigelb)' THEN
    RETURN 'Milchprodukte & Eier';
  
  -- Gewürze & Würzmittel
  ELSIF ingredient_name ~ '(salz|pfeffer|paprika|curry|kurkuma|zimt|muskat|kardamom|kümmel|fenchel|anis|lorbeer|nelke|piment|cayenne|chili|paprikapulver|knoblauchpulver|zwiebelpulver|kräuter|gewürz|würze)' THEN
    RETURN 'Gewürze & Würzmittel';
  
  -- Öle & Essig
  ELSIF ingredient_name ~ '(öl|olivenöl|sonnenblumenöl|rapsöl|kokosöl|sesamöl|walnussöl|leinöl|essig|balsamico|weinessig|apfelessig|reisessig)' THEN
    RETURN 'Öle & Essig';
  
  -- Saucen & Dressings
  ELSIF ingredient_name ~ '(sauce|soße|ketchup|senf|mayonnaise|mayo|dressing|vinaigrette|sojasauce|worcestershire|tabasco|sriracha|pesto|tomatensauce|hollandaise|bechamel|brühe|fond|stock|bouillon)' THEN
    RETURN 'Saucen & Dressings';
  
  -- Backzutaten & Haltbares
  ELSIF ingredient_name ~ '(mehl|zucker|backpulver|natron|hefe|vanille|kakao|schokolade|nuss|mandel|haselnuss|walnuss|pekanuss|cashew|pistazie|sesam|mohn|kokosflocken|rosine|sultanine|honig|sirup|agavendicksaft|reis|nudel|pasta|spaghetti|brot|brötchen|toast|müsli|haferflocken|quinoa|bulgur|couscous|polenta|grieß|stärke|gelatine|agar|konserve|dose|glas|tiefkühl)' THEN
    RETURN 'Backzutaten & Haltbares';
  
  -- Default category
  ELSE
    RETURN 'Sonstiges';
  END IF;
END;
$$;

-- Update existing items to have categories
UPDATE public.shopping_list_items 
SET category = public.categorize_ingredient(ingredient_name)
WHERE category = 'Sonstiges' OR category IS NULL;

-- Create trigger to automatically categorize new items
CREATE OR REPLACE FUNCTION public.auto_categorize_shopping_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set category if it's not already set or if it's the default
  IF NEW.category IS NULL OR NEW.category = 'Sonstiges' THEN
    NEW.category = public.categorize_ingredient(NEW.ingredient_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_categorize_shopping_item
  BEFORE INSERT OR UPDATE ON public.shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_categorize_shopping_item();