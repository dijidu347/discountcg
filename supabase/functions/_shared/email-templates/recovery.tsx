/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe - DiscountCarteGrise</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>DiscountCarteGrise</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Réinitialisez votre mot de passe</Heading>
          <Text style={text}>Bonjour,</Text>
          <Text style={text}>
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez
            sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </Text>
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button style={button} href={confirmationUrl}>
              Réinitialiser mon mot de passe
            </Button>
          </Section>
          <Text style={smallText}>
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
          </Text>
          <Link href={confirmationUrl} style={linkUrl}>
            {confirmationUrl}
          </Link>
          <Text style={footer}>
            Si vous n'avez pas demandé cette réinitialisation, vous pouvez
            ignorer cet email. Votre mot de passe actuel reste inchangé.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '20px' }
const header = { background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', padding: '30px', borderRadius: '10px 10px 0 0', textAlign: 'center' as const }
const brand = { color: '#ffffff', margin: 0, fontSize: '28px' }
const content = { background: '#ffffff', padding: '40px 30px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: 'bold' as const, marginTop: 0, marginBottom: '20px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '13px', color: '#6b7280', margin: '20px 0 6px' }
const linkUrl = { color: '#2563eb', fontSize: '12px', wordBreak: 'break-all' as const }
const button = { background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '8px', padding: '14px 30px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }
