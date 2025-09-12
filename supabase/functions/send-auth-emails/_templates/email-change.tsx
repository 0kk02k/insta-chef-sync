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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface EmailChangeProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  userName?: string
  newEmail?: string
}

export const EmailChangeEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  userName = 'Kochbegeisterte/r',
  newEmail,
}: EmailChangeProps) => (
  <Html>
    <Head />
    <Preview>E-Mail-Adresse ändern bestätigen - InstaChef</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>📧 E-Mail-Adresse ändern</Heading>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>
            Hallo {userName}!
          </Text>
          
          <Text style={text}>
            Sie haben eine Änderung Ihrer E-Mail-Adresse für Ihr InstaChef-Konto beantragt.
          </Text>
          
          {newEmail && (
            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>Neue E-Mail-Adresse:</strong><br />
                {newEmail}
              </Text>
            </Section>
          )}
          
          <Text style={text}>
            Um die Änderung zu bestätigen, klicken Sie bitte auf den Button unten:
          </Text>
          
          <Section style={buttonContainer}>
            <Link
              href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
              style={button}
            >
              E-Mail-Änderung bestätigen
            </Link>
          </Section>
          
          <Text style={alternativeText}>
            Oder verwenden Sie diesen Code:
          </Text>
          <Section style={codeContainer}>
            <Text style={code}>{token}</Text>
          </Section>
          
          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ Nach der Bestätigung erhalten Sie zukünftige E-Mails an die neue Adresse.
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footerText}>
            Falls Sie diese Änderung nicht beantragt haben, kontaktieren Sie uns bitte umgehend. 
            Ihre aktuelle E-Mail-Adresse bleibt aktiv, bis Sie die Änderung bestätigen.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            Mit vertrauensvollen Grüßen,<br />
            Ihr InstaChef Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
  info: '#E7F3FF',
  infoText: '#0066CC',
  warning: '#FFF3CD',
  warningText: '#856404',
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

const infoBox = {
  backgroundColor: colors.info,
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const infoText = {
  color: colors.infoText,
  fontSize: '14px',
  margin: '0',
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

const warningBox = {
  backgroundColor: colors.warning,
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const warningText = {
  color: colors.warningText,
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
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