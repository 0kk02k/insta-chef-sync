import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Methode nicht erlaubt' }),
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
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log('Authenticated admin request:', userId);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Keine Admin-Berechtigung' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    // Fetch recipe counts for all users
    const { data: recipeCounts, error: recipeError } = await supabase
      .from('recipes')
      .select('user_id, published');

    if (recipeError) {
      throw recipeError;
    }

    // Fetch last activity (most recent recipe update) for each user
    const { data: lastActivities, error: activityError } = await supabase
      .from('recipes')
      .select('user_id, updated_at')
      .order('updated_at', { ascending: false });

    if (activityError) {
      throw activityError;
    }

    // Fetch admin roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');

    if (rolesError) {
      throw rolesError;
    }

    const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));

    // Calculate stats for each user
    const userRecipeCounts = new Map<string, { total: number; published: number }>();
    (recipeCounts || []).forEach(recipe => {
      const current = userRecipeCounts.get(recipe.user_id) || { total: 0, published: 0 };
      current.total += 1;
      if (recipe.published) current.published += 1;
      userRecipeCounts.set(recipe.user_id, current);
    });

    const userLastActivity = new Map<string, string>();
    (lastActivities || []).forEach(activity => {
      if (!userLastActivity.has(activity.user_id)) {
        userLastActivity.set(activity.user_id, activity.updated_at);
      }
    });

    // Build response
    const users = (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email || '',
      display_name: profile.display_name,
      created_at: profile.created_at,
      recipe_count: userRecipeCounts.get(profile.id)?.total || 0,
      published_count: userRecipeCounts.get(profile.id)?.published || 0,
      last_activity: userLastActivity.get(profile.id) || null,
      role: adminUserIds.has(profile.id) ? 'admin' : 'user'
    }));

    return new Response(
      JSON.stringify({ users }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('admin-get-users error:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
