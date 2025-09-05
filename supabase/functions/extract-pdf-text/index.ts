import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No PDF file provided');
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    // Convert PDF to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Simple PDF text extraction using basic string search
    // This is a basic approach - for production, consider using a more robust solution
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = '';
    
    try {
      // Try to decode the PDF content
      const pdfString = decoder.decode(uint8Array);
      
      // Extract text between stream objects (basic PDF text extraction)
      const streamRegex = /stream\s*(.*?)\s*endstream/gs;
      const matches = pdfString.matchAll(streamRegex);
      
      for (const match of matches) {
        const streamContent = match[1];
        // Remove PDF operators and extract readable text
        const cleanText = streamContent
          .replace(/[<>()[\]{}]/g, ' ')
          .replace(/\d+(\.\d+)?\s+[A-Za-z]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText.length > 10) {
          text += cleanText + '\n';
        }
      }

      // If no text found through streams, try direct text extraction
      if (!text.trim()) {
        // Look for readable text patterns
        const textMatches = pdfString.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\s,.:;!?\d\-]{10,}/g);
        if (textMatches) {
          text = textMatches.join(' ');
        }
      }

    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Could not extract text from PDF. The PDF might be encrypted or contain only images.');
    }

    if (!text.trim()) {
      throw new Error('No readable text found in PDF. The PDF might contain only images or be encrypted.');
    }

    // Clean up the extracted text
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    console.log('Extracted text length:', cleanedText.length);
    console.log('Extracted text preview:', cleanedText.substring(0, 200));

    return new Response(
      JSON.stringify({ 
        text: cleanedText,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in extract-pdf-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});