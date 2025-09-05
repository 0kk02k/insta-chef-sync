import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF text extraction using basic heuristics
function extractTextFromPdf(uint8Array: Uint8Array): string {
  const text: string[] = [];
  const decoder = new TextDecoder('latin1'); // Use latin1 for better binary handling
  const pdfString = decoder.decode(uint8Array);
  
  // Look for text objects in PDF
  const textObjectRegex = /BT\s+(.*?)\s+ET/gs;
  const textMatches = pdfString.matchAll(textObjectRegex);
  
  for (const match of textMatches) {
    const textContent = match[1];
    
    // Extract strings within parentheses or brackets
    const stringRegex = /\((.*?)\)|\[(.*?)\]/g;
    const strings = textContent.matchAll(stringRegex);
    
    for (const stringMatch of strings) {
      const extractedText = stringMatch[1] || stringMatch[2];
      if (extractedText && extractedText.length > 1) {
        // Clean up the text
        const cleanText = extractedText
          .replace(/\\[rn]/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (cleanText.length > 0) {
          text.push(cleanText);
        }
      }
    }
  }
  
  // If no text found through BT/ET blocks, try alternative approach
  if (text.length === 0) {
    // Look for readable ASCII text sequences
    const readableTextRegex = /[A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9\s,.:;!?\-]{5,}/g;
    const matches = pdfString.match(readableTextRegex);
    
    if (matches) {
      // Filter out PDF commands and keep only likely content
      const filteredMatches = matches.filter(match => {
        const lower = match.toLowerCase();
        return !lower.includes('obj') && 
               !lower.includes('endobj') && 
               !lower.includes('stream') && 
               !lower.includes('endstream') &&
               !lower.includes('xref') &&
               !lower.match(/^[0-9\s.]+$/) && // Skip number-only strings
               match.length > 10; // Minimum length for content
      });
      
      text.push(...filteredMatches);
    }
  }
  
  return text.join(' ').replace(/\s+/g, ' ').trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No PDF file provided');
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    console.log(`Processing PDF: ${file.name}, Size: ${file.size} bytes`);

    // Convert PDF to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Extract text from PDF
    let extractedText = '';
    
    try {
      extractedText = extractTextFromPdf(uint8Array);
      console.log('Extracted text length:', extractedText.length);
      console.log('Extracted text preview:', extractedText.substring(0, 200));
    } catch (error) {
      console.error('Error in text extraction:', error);
      throw new Error('Could not extract text from PDF. The PDF might be encrypted, password-protected, or contain only images.');
    }

    if (!extractedText.trim() || extractedText.length < 20) {
      throw new Error('No readable text found in PDF. The PDF might contain only images, be encrypted, or use an unsupported format.');
    }

    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    return new Response(
      JSON.stringify({ 
        text: cleanedText,
        success: true,
        extractedLength: cleanedText.length
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