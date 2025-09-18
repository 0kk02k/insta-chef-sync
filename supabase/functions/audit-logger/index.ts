import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuditLogEntry {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      user = authUser;
    }

    const { action, resource_type, resource_id, details } = await req.json();

    if (!action || !resource_type) {
      throw new Error('Missing required fields: action and resource_type');
    }

    // Get client IP and user agent
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const auditEntry: AuditLogEntry = {
      user_id: user?.id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address: clientIP,
      user_agent: userAgent
    };

    // Log to console for immediate visibility
    console.log('Audit Log:', JSON.stringify(auditEntry, null, 2));

    // Here you could also store to a dedicated audit log table
    // For now, we'll just log to the edge function logs
    
    return new Response(
      JSON.stringify({ success: true, logged_at: new Date().toISOString() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Audit logging error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})