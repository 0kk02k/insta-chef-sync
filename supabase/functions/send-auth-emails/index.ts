import React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22'
import { WelcomeEmail } from './_templates/welcome.tsx'
import { PasswordResetEmail } from './_templates/password-reset.tsx'
import { EmailChangeEmail } from './_templates/email-change.tsx'
import { InvitationEmail } from './_templates/invitation.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface EmailData {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
  token_new?: string
  token_hash_new?: string
}

interface WebhookPayload {
  user: {
    email: string
    user_metadata?: {
      display_name?: string
      full_name?: string
    }
  }
  email_data: EmailData
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as WebhookPayload

    // Extract user name from metadata
    const userName = user.user_metadata?.display_name || 
                    user.user_metadata?.full_name || 
                    user.email.split('@')[0]

    let html: string
    let subject: string
    let emailComponent: React.ReactElement

    // Determine email type and create appropriate template
    switch (email_action_type) {
      case 'signup':
      case 'email_confirmation':
        subject = 'Willkommen bei InstaChef - E-Mail bestätigen'
        emailComponent = React.createElement(WelcomeEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
          userName,
        })
        break

      case 'recovery':
      case 'password_recovery':
        subject = 'Passwort zurücksetzen - InstaChef'
        emailComponent = React.createElement(PasswordResetEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
          userName,
        })
        break

      case 'email_change':
        subject = 'E-Mail-Adresse ändern - InstaChef'
        emailComponent = React.createElement(EmailChangeEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
          userName,
          newEmail: user.email, // The new email is in user.email
        })
        break

      case 'invite':
      case 'invitation':
        subject = 'Einladung zu InstaChef - Entdecken Sie köstliche Rezepte!'
        emailComponent = React.createElement(InvitationEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
          inviterName: 'Ein Kochbegeisterter', // Could be customized
        })
        break

      default:
        // Fallback to welcome email for unknown types
        subject = 'InstaChef - E-Mail Bestätigung'
        emailComponent = React.createElement(WelcomeEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
          userName,
        })
        break
    }

    // Render the email template
    html = await renderAsync(emailComponent)

    // Send email via Resend
    const { error } = await resend.emails.send({
      from: 'InstaChef <noreply@instachef.app>',
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Error sending email:', error)
      throw error
    }

    console.log(`Email sent successfully: ${email_action_type} to ${user.email}`)

    return new Response(JSON.stringify({ 
      success: true,
      email_type: email_action_type,
      recipient: user.email 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })

  } catch (error: any) {
    console.error('Error in send-auth-emails function:', error)
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
        },
      }),
      {
        status: error.code === 'WEBHOOK_VERIFICATION_ERROR' ? 401 : 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})