import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Politique de Confidentialite"
        description="Politique de confidentialite et protection des donnees personnelles - Discount Carte Grise"
        noindex
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Politique de confidentialite</h1>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Responsable du traitement</h2>
            <p>
              Le responsable du traitement des donnees personnelles est la societe DISCOUNT DRIVER SAS,
              sise au 24 RUE DU CROUZET, 34770 GIGEAN.
              Contact : contact@discountcartegrise.fr.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Donnees collectees</h2>
            <p>Dans le cadre de nos services, nous collectons les donnees suivantes :</p>
            <ul>
              <li>Donnees d'identite : nom, prenom, date de naissance</li>
              <li>Coordonnees : adresse postale, email, telephone</li>
              <li>Donnees relatives au vehicule : immatriculation, marque, modele</li>
              <li>Documents administratifs : copies de pieces d'identite, justificatifs de domicile, certificats de cession</li>
              <li>Donnees de paiement : traitees directement par notre prestataire Stripe (nous ne stockons pas vos donnees bancaires)</li>
              <li>Donnees de navigation : cookies, adresse IP, pages consultees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Finalites du traitement</h2>
            <p>Vos donnees sont collectees pour les finalites suivantes :</p>
            <ul>
              <li>Traitement de vos demarches d'immatriculation aupres de l'ANTS</li>
              <li>Gestion de votre commande et suivi de dossier</li>
              <li>Communication relative a votre dossier (emails de suivi, notifications)</li>
              <li>Facturation et comptabilite</li>
              <li>Amelioration de nos services et de l'experience utilisateur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Base legale</h2>
            <p>
              Le traitement de vos donnees repose sur l'execution du contrat de prestation de services
              (article 6.1.b du RGPD) et, pour les cookies non essentiels, sur votre consentement
              (article 6.1.a du RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Destinataires des donnees</h2>
            <p>Vos donnees peuvent etre transmises aux destinataires suivants :</p>
            <ul>
              <li>L'ANTS (Agence Nationale des Titres Securises) pour le traitement de vos demarches</li>
              <li>Notre prestataire de paiement Stripe pour le traitement des transactions</li>
              <li>Notre hebergeur Vercel pour l'hebergement du site</li>
              <li>Supabase pour le stockage securise des donnees</li>
            </ul>
            <p>Aucune donnee n'est transmise a des tiers a des fins commerciales.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Duree de conservation</h2>
            <p>
              Vos donnees personnelles sont conservees pendant la duree necessaire au traitement de
              votre dossier, puis archivees pendant une duree de 5 ans a compter de la fin de la
              prestation, conformement aux obligations legales en matiere de comptabilite et de fiscalite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Vos droits</h2>
            <p>
              Conformement au Reglement General sur la Protection des Donnees (RGPD), vous disposez
              des droits suivants :
            </p>
            <ul>
              <li>Droit d'acces a vos donnees personnelles</li>
              <li>Droit de rectification des donnees inexactes</li>
              <li>Droit a l'effacement (droit a l'oubli)</li>
              <li>Droit a la limitation du traitement</li>
              <li>Droit a la portabilite de vos donnees</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous a l'adresse contact@discountcartegrise.fr.
              Vous disposez egalement du droit d'introduire une reclamation aupres de la CNIL
              (Commission Nationale de l'Informatique et des Libertes).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Cookies</h2>
            <p>
              Pour en savoir plus sur l'utilisation des cookies, consultez notre{" "}
              <a href="/cookies" className="text-primary hover:underline">
                Politique de cookies
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Securite</h2>
            <p>
              Nous mettons en oeuvre des mesures techniques et organisationnelles appropriees pour
              proteger vos donnees personnelles contre tout acces non autorise, modification,
              divulgation ou destruction. Les echanges de donnees sont chiffres via le protocole HTTPS.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
