import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "npm:pdfjs-dist";
import { createCanvas } from "npm:canvas";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function extractTextAndImages(arrayBuffer: ArrayBuffer) {
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  let text = "";
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // ---- Text extrahieren ----
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";

    // ---- Seite als Bild rendern ----
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    const pngBase64 = canvas.toBuffer("image/png").toString("base64");
    images.push(`data:image/png;base64,${pngBase64}`);
  }

  return { text, images };
}

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

    // 2) Text + Bilder extrahieren
    const { text, images } = await extractTextAndImages(buffer);
    console.log("Extracted text length:", text.length);
    console.log("Extracted images count:", images.length);

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
${text.slice(0, 4000)}` 
          },
          ...images.map((img) => ({
            role: "user",
            content: [{ type: "image_url", image_url: { url: img } }],
          })),
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
    
    // JSON parsen und validieren
    let recipeData;
    try {
      recipeData = JSON.parse(answer);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("DeepSeek hat kein gültiges JSON zurückgegeben");
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