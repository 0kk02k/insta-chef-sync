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

interface InvitationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  inviterName?: string
  recipeName?: string
}

export const InvitationEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  inviterName = 'Jemand',
  recipeName,
}: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Einladung zu InstaChef - Entdecken Sie köstliche Rezepte!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>🍽️ Sie sind eingeladen!</Heading>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>
            Hallo!
          </Text>
          
          <Text style={text}>
            <strong>{inviterName}</strong> hat Sie zu InstaChef eingeladen, der besten Plattform 
            zum Sammeln, Teilen und Entdecken von Rezepten!
          </Text>
          
          {recipeName && (
            <Section style={highlightBox}>
              <Text style={highlightText}>
                🍳 <strong>Speziell für Sie geteilt:</strong><br />
                „{recipeName}"
              </Text>
            </Section>
          )}
          
          <Text style={text}>
            Mit InstaChef können Sie:
          </Text>
          
          <Section style={featureList}>
            <Text style={featureItem}>✨ Rezepte aus Instagram-Posts extrahieren</Text>
            <Text style={featureItem}>📸 Screenshots automatisch in Rezepte umwandeln</Text>
            <Text style={featureItem}>🗂️ Ihre Lieblingsrezepte organisieren</Text>
            <Text style={featureItem}>👥 Rezepte mit Freunden und Familie teilen</Text>
            <Text style={featureItem}>🔍 Neue kulinarische Inspirationen entdecken</Text>
          </Section>
          
          <Text style={text}>
            Klicken Sie auf den Button unten, um Ihr kostenloses Konto zu erstellen:
          </Text>
          
          <Section style={buttonContainer}>
            <Link
              href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
              style={button}
            >
              Jetzt bei InstaChef anmelden
            </Link>
          </Section>
          
          <Text style={alternativeText}>
            Oder verwenden Sie diesen Einladungscode:
          </Text>
          <Section style={codeContainer}>
            <Text style={code}>{token}</Text>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footerText}>
            Diese Einladung ist 7 Tage gültig. Falls Sie kein Interesse haben, 
            können Sie diese E-Mail einfach ignorieren.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Kulinarische Grüße,<br />
            Ihr InstaChef Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InvitationEmail

// Design System Colors
const colors = {
  background: '#F9F7F2',
  surface: '#FFFFFF',
  text: '#2A2E32',
  textMuted: '#5A646C',
  primary: '#FFC6A1',
  primaryHover: '#FF7A3D',
  secondary: '#AEE5B2',
  border: '#E6E6E8',
  highlight: '#E7F7E8',
  highlightText: '#2D5A2E',
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

const highlightBox = {
  backgroundColor: colors.highlight,
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const highlightText = {
  color: colors.highlightText,
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const featureList = {
  margin: '20px 0',
  paddingLeft: '0',
}

const featureItem = {
  color: colors.text,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
  paddingLeft: '0',
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
  padding: '14px 36px',
  borderRadius: '10px',
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