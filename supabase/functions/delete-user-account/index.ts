import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
      }
    );
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { userId } = await req.json();

    // Verify that the user can only delete their own account
    if (user.id !== userId) {
      console.error('User ID mismatch:', user.id, 'vs', userId);
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Starting account deletion for user:', userId);

    // Delete user data in the correct order to respect foreign key constraints
    
    // 1. Delete comments (including any orphaned ones)
    const { error: commentsError } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('user_id', userId);
    
    if (commentsError) {
      console.error('Error deleting comments:', commentsError);
      throw commentsError;
    }
    console.log('Deleted comments for user:', userId);

    // 2. Delete ignored recipes
    const { error: ignoredError } = await supabaseAdmin
      .from('ignored_recipes')
      .delete()
      .eq('user_id', userId);
    
    if (ignoredError) {
      console.error('Error deleting ignored recipes:', ignoredError);
      throw ignoredError;
    }
    console.log('Deleted ignored recipes for user:', userId);

    // 3. Delete recipes
    const { error: recipesError } = await supabaseAdmin
      .from('recipes')
      .delete()
      .eq('user_id', userId);
    
    if (recipesError) {
      console.error('Error deleting recipes:', recipesError);
      throw recipesError;
    }
    console.log('Deleted recipes for user:', userId);

    // 4. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      throw profileError;
    }
    console.log('Deleted profile for user:', userId);

    // 5. Delete any storage objects in user folders
    try {
      const { data: userFiles } = await supabaseAdmin.storage
        .from('recipe-images')
        .list(userId);
      
      if (userFiles && userFiles.length > 0) {
        const filePaths = userFiles.map(file => `${userId}/${file.name}`);
        const { error: storageError } = await supabaseAdmin.storage
          .from('recipe-images')
          .remove(filePaths);
        
        if (storageError) {
          console.error('Error deleting storage files:', storageError);
        } else {
          console.log('Deleted storage files for user:', userId);
        }
      }
    } catch (storageError) {
      console.error('Error checking/deleting storage:', storageError);
      // Continue with user deletion even if storage cleanup fails
    }

    // 6. Finally, delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      throw authError;
    }
    console.log('Deleted auth user:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in delete-user-account function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
