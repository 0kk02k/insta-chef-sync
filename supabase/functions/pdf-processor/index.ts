import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "npm:pdf-parse";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path } = await req.json();
    console.log("Processing PDF:", path);

    // 1) PDF aus Supabase Storage holen
    const { data, error } = await supabase.storage
      .from("pdf-uploads")
      .download(path);

    if (error) {
      console.error("Storage download error:", error);
      throw error;
    }

    const buffer = await data.arrayBuffer();
    console.log("PDF downloaded, size:", buffer.byteLength);

    // 2) Text extrahieren
    const parsed = await pdf(new Uint8Array(buffer));
    const text = parsed.text.substring(0, 4000); // Text begrenzen
    console.log("Extracted text length:", text.length);

    // 3) DeepSeek Chat API anfragen für Rezept-Extraktion
    const completion = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: "Du bist ein Rezept-Extraktions-Experte. Analysiere den Text und extrahiere Rezeptdaten. Antworte nur mit gültigem JSON ohne zusätzlichen Text." 
          },
          { 
            role: "user", 
            content: `Analysiere diesen PDF-Text und extrahiere Rezeptdaten. Antworte NUR mit einem gültigen JSON-Objekt:

{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2", ...],
  "instructions": ["Schritt 1", "Schritt 2", ...],
  "cooking_time": Minuten_als_Zahl_oder_null,
  "servings": Portionen_als_Zahl_oder_null
}

Text:
${text}` 
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    const result = await completion.json();
    console.log("DeepSeek response:", result);

    if (!result.choices?.[0]?.message?.content) {
      throw new Error("Keine gültige Antwort von DeepSeek");
    }

    const answer = result.choices[0].message.content.trim();
    console.log("DeepSeek answer raw:", answer);
    
    // JSON parsen und validieren
    let recipeData;
    try {
      // Entferne eventuelle Markdown-Formatierung
      const cleanAnswer = answer.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recipeData = JSON.parse(cleanAnswer);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw answer was:", answer);
      
      // Fallback: Erstelle ein einfaches Rezept aus dem Text
      recipeData = {
        title: "PDF Rezept",
        description: "Aus PDF extrahiert",
        ingredients: text.split('\n').filter(line => line.includes('-') || line.includes('•')).slice(0, 10),
        instructions: ["Bitte bearbeiten Sie das Rezept manuell"],
        cooking_time: null,
        servings: null
      };
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: recipeData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("PDF processor error:", err);
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});