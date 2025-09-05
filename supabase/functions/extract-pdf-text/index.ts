import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced PDF text extraction using multiple approaches
function extractTextFromPdf(uint8Array: Uint8Array): string {
  const text: string[] = [];
  const decoder = new TextDecoder('latin1');
  const pdfString = decoder.decode(uint8Array);
  
  console.log('PDF size in bytes:', uint8Array.length);
  console.log('PDF string preview (first 500 chars):', pdfString.substring(0, 500));
  
  // Method 1: Look for text objects between BT and ET
  const textObjectRegex = /BT\s+(.*?)\s+ET/gs;
  const textMatches = pdfString.matchAll(textObjectRegex);
  
  for (const match of textMatches) {
    const textContent = match[1];
    console.log('Found BT/ET block:', textContent.substring(0, 100));
    
    // Extract strings within parentheses
    const stringRegex = /\((.*?)\)/g;
    const strings = textContent.matchAll(stringRegex);
    
    for (const stringMatch of strings) {
      const extractedText = stringMatch[1];
      if (extractedText && extractedText.length > 1) {
        const cleanText = extractedText
          .replace(/\\[rn]/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (cleanText.length > 0 && !cleanText.match(/^[0-9\s.]+$/)) {
          text.push(cleanText);
          console.log('Extracted text from BT/ET:', cleanText);
        }
      }
    }
  }
  
  // Method 2: Look for stream content
  if (text.length === 0) {
    console.log('No BT/ET content found, trying stream method...');
    const streamRegex = /stream\s*(.*?)\s*endstream/gs;
    const streamMatches = pdfString.matchAll(streamRegex);
    
    for (const match of streamMatches) {
      const streamContent = match[1];
      console.log('Found stream content preview:', streamContent.substring(0, 100));
      
      // Try to find text patterns in stream
      const textPatterns = streamContent.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\s,.:;!?\d\-]{5,}/g);
      if (textPatterns) {
        const filteredText = textPatterns.filter(t => 
          t.length > 10 && 
          !t.includes('obj') && 
          !t.includes('endobj') &&
          !t.match(/^[0-9\s.]+$/)
        );
        text.push(...filteredText);
        console.log('Extracted from stream:', filteredText.slice(0, 3));
      }
    }
  }
  
  // Method 3: Look for any readable text sequences (fallback)
  if (text.length === 0) {
    console.log('No stream content found, trying direct text extraction...');
    
    // Look for common German words to identify text sections
    const germanWords = ['und', 'mit', 'der', 'die', 'das', 'für', 'von', 'zu', 'in', 'auf', 'bei', 'aus', 'nach', 'über'];
    const sections = pdfString.split(/[\x00-\x1F\x7F-\x9F]/); // Split on control characters
    
    for (const section of sections) {
      const words = section.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\s,.:;!?\d\-]{10,}/g);
      if (words) {
        const validWords = words.filter(word => {
          const lowerWord = word.toLowerCase();
          return germanWords.some(gw => lowerWord.includes(gw)) || 
                 word.length > 20 || // Long words are likely content
                 word.match(/\d+\s*(g|ml|tl|el|kg|liter)/i); // Measurements
        });
        
        if (validWords.length > 0) {
          text.push(...validWords);
          console.log('Extracted via word detection:', validWords.slice(0, 2));
        }
      }
    }
  }
  
  const result = text.join(' ').replace(/\s+/g, ' ').trim();
  console.log('Final extracted text length:', result.length);
  console.log('Final text preview:', result.substring(0, 200));
  
  return result;
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