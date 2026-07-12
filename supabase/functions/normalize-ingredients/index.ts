import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingListItem {
  id: string;
  ingredient_name: string;
  amount: number | null;
  unit: string | null;
}

interface NormalizedIngredient {
  canonical_name: string;
  amount: number | null;
  unit: string | null;
  original_items: string[];
}

// Input validation constants
const MAX_EXISTING_ITEMS = 500;
const MAX_NEW_INGREDIENTS = 100;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Methode nicht erlaubt' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authentication: Validate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    if (!xaiApiKey) {
      throw new Error('XAI_API_KEY nicht konfiguriert');
    }

    const { existingItems, newIngredients, shoppingListId } = await req.json();
    
    // Input validation
    if (!shoppingListId || typeof shoppingListId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'shoppingListId ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!Array.isArray(newIngredients)) {
      return new Response(
        JSON.stringify({ success: false, error: 'newIngredients Array ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (Array.isArray(existingItems) && existingItems.length > MAX_EXISTING_ITEMS) {
      return new Response(
        JSON.stringify({ success: false, error: `Maximal ${MAX_EXISTING_ITEMS} existierende Items erlaubt` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (newIngredients.length > MAX_NEW_INGREDIENTS) {
      return new Response(
        JSON.stringify({ success: false, error: `Maximal ${MAX_NEW_INGREDIENTS} neue Zutaten erlaubt` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify shopping list ownership
    const { data: listData, error: listError } = await supabase
      .from('shopping_lists')
      .select('user_id')
      .eq('id', shoppingListId)
      .single();
    
    if (listError || !listData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Einkaufsliste nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check ownership
    if (listData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Keine Berechtigung für diese Einkaufsliste' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let language = 'de';
    let unitPref = 'metric';

    const { data: profile } = await supabase
      .from('profiles')
      .select('language, measurement_unit')
      .eq('id', listData.user_id)
      .single();
    if (profile) {
      language = profile.language || language;
      unitPref = profile.measurement_unit || unitPref;
    }

    // Create a comprehensive list for AI analysis
    const safeExistingItems = Array.isArray(existingItems) ? existingItems : [];
    const allItems = [
      ...safeExistingItems.map((item: ShoppingListItem) => ({
        name: item.ingredient_name,
        amount: item.amount,
        unit: item.unit,
        type: 'existing',
        id: item.id
      })),
      ...newIngredients.map((ingredient: { ingredient: string; amount: number; unit: string }) => ({
        name: ingredient.ingredient,
        amount: ingredient.amount,
        unit: ingredient.unit,
        type: 'new'
      }))
    ];

    const languageInstructions = language === 'de' ? 
      'Antworte auf Deutsch und verwende deutsche Zutatennamen.' : 
      language === 'en' ? 'Respond in English and use English ingredient names.' :
      language === 'fr' ? 'Répondez en français et utilisez des noms d\'ingrédients français.' :
      language === 'es' ? 'Responde en español y usa nombres de ingredientes en español.' :
      language === 'it' ? 'Rispondi in italiano e usa nomi di ingredienti italiani.' :
      'Respond in the original language.';

    const unitInstructions = unitPref === 'metric' ? 
      'Verwende metrische Einheiten (g, kg, ml, l).' :
      'Verwende imperiale Einheiten (oz, lb, fl oz, cups).';

    const prompt = `Analysiere diese Zutatenliste und führe ähnliche Zutaten zusammen. 
    
AUFGABE:
1. Erkenne Zutaten, die dasselbe Lebensmittel bezeichnen (z.B. "Tomate", "Tomaten", "tomate", "cherry tomaten")
2. Konvertiere Einheiten und addiere Mengen (z.B. 500g + 1kg = 1.5kg, 200ml + 1l = 1.2l)
3. Wähle die beste Einheit für die Gesamtmenge
4. Verwende kanonische deutsche Zutatennamen

REGELN:
- ${languageInstructions}
- ${unitInstructions}
- Fasse nur wirklich identische Zutaten zusammen (Tomaten ≠ Tomatensauce)
- Bei unklaren Fällen, erstelle separate Einträge
- Konvertiere: g↔kg (1000g=1kg), ml↔l (1000ml=1l), etc.

EINGABE: ${JSON.stringify(allItems)}

ANTWORT NUR als JSON Array:
[{
  "canonical_name": "string",
  "amount": number|null,
  "unit": "string"|null,
  "original_items": ["item_id_or_name"],
  "action": "merge"|"keep"|"add"
}]`;

    console.log('Sending request to xAI Grok with prompt length:', prompt.length);

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Zutatennormalisierer. Antworte ausschließlich mit valider JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      })
    });

    if (!grokRes.ok) {
      const errorText = await grokRes.text();
      console.error('xAI Grok Error:', errorText);
      throw new Error('xAI Grok API Fehler');
    }

    const data = await grokRes.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?|\n?```/g, '').trim();

    console.log('xAI Grok response length:', content.length);

    let normalizedItems: NormalizedIngredient[];
    try {
      normalizedItems = JSON.parse(content);
      if (!Array.isArray(normalizedItems)) throw new Error('Kein Array');
    } catch (e) {
      console.error('Parse Error:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Ungültige AI-Antwort' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        normalized_items: normalizedItems,
        debug: { original_count: allItems.length, normalized_count: normalizedItems.length }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('normalize-ingredients error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
