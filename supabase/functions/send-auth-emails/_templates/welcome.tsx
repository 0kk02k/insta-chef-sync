import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Section,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface WelcomeEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  userName?: string
}

export const WelcomeEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  userName = 'Kochbegeisterte/r',
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Willkommen bei InstaChef - Bestätigen Sie Ihre E-Mail-Adresse</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>🍳 Willkommen bei InstaChef!</Heading>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>
            Hallo {userName}!
          </Text>
          
          <Text style={text}>
            Schön, dass Sie dabei sind! Wir freuen uns, Sie in unserer Community von Kochbegeisterten zu begrüßen. 
            Mit InstaChef können Sie Ihre Lieblingsrezepte sammeln, teilen und entdecken.
          </Text>
          
          <Text style={text}>
            Um Ihr Konto zu aktivieren, bestätigen Sie bitte Ihre E-Mail-Adresse:
          </Text>
          
          <Section style={buttonContainer}>
            <Link
              href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
              style={button}
            >
              E-Mail-Adresse bestätigen
            </Link>
          </Section>
          
          <Text style={alternativeText}>
            Alternativ können Sie diesen Code verwenden:
          </Text>
          <Section style={codeContainer}>
            <Text style={code}>{token}</Text>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footerText}>
            Falls Sie sich nicht bei InstaChef registriert haben, können Sie diese E-Mail ignorieren.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Mit kulinarischen Grüßen,<br />
            Ihr InstaChef Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

// Design System Colors based on index.css
const colors = {
  background: '#F9F7F2', // --bg
  surface: '#FFFFFF', // --surface
  text: '#2A2E32', // --ink-900
  textMuted: '#5A646C', // --ink-700
  primary: '#FFC6A1', // --brand (carrot pastel)
  primaryHover: '#FF7A3D', // --brand-600 (carrot neon)
  secondary: '#AEE5B2', // --accent-2 (pea pastel)
  border: '#E6E6E8', // --border
}

const main = {
  backgroundColor: colors.background,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
}

const header = {
  textAlign: 'center' as const,
  paddingBottom: '24px',
}

const h1 = {
  color: colors.text,
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
}

const content = {
  backgroundColor: colors.surface,
  borderRadius: '12px',
  padding: '32px',
  border: `1px solid ${colors.border}`,
  boxShadow: '0 1px 2px rgba(42,59,73,0.06)',
}

const greeting = {
  color: colors.text,
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: colors.text,
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: colors.primary,
  color: colors.text,
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  borderRadius: '10px',
  transition: 'background-color 0.2s ease',
}

const alternativeText = {
  color: colors.textMuted,
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '24px 0 8px',
}

const codeContainer = {
  textAlign: 'center' as const,
  margin: '16px 0 32px',
}

const code = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: colors.background,
  borderRadius: '8px',
  border: `1px solid ${colors.border}`,
  color: colors.text,
  fontSize: '18px',
  fontWeight: '600',
  letterSpacing: '2px',
}

const hr = {
  borderColor: colors.border,
  margin: '32px 0',
}

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
}

const footerText = {
  color: colors.textMuted,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0',
  textAlign: 'center' as const,
}