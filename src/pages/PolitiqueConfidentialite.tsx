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
        <h1 className="text-3xl font-bold text-foreground mb-2">Politique de Confidentialité — discountcartegrise.fr</h1>
        <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 26 juin 2026</p>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <p>
            La présente Politique de Confidentialité décrit la manière dont <strong>DISCOUNT AUTO / PAREBRISE</strong>{" "}
            collecte, utilise et protège les données à caractère personnel des utilisateurs du site{" "}
            <strong>discountcartegrise.fr</strong> (ci-après « le Site »), conformément au Règlement (UE) 2016/679 (RGPD)
            et à la loi n° 78-17 du 6 janvier 1978 modifiée (« Informatique et Libertés »).
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Responsable du traitement</h2>
            <p>Le responsable du traitement est :</p>
            <p>
              <strong>DISCOUNT AUTO / PAREBRISE</strong> (SAS)<br />
              Siège social : ZA de l'Avenir, 30600 Vestric-et-Candiac<br />
              SIRET : 830 888 277 00027<br />
              Contact : contact@discountcartegrise.fr
            </p>
            <p>
              La société n'a pas désigné de Délégué à la Protection des Données (DPO), cette désignation n'étant pas
              obligatoire au regard de son activité. Le point de contact pour toute question relative aux données
              personnelles est : <strong>contact@discountcartegrise.fr</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Données collectées</h2>
            <p>
              Dans le cadre de la fourniture de ses services, le Site est susceptible de collecter et traiter les
              catégories de données suivantes :
            </p>
            <ul>
              <li><strong>Données d'identité</strong> : civilité, nom, prénom, date et lieu de naissance ;</li>
              <li><strong>Coordonnées</strong> : adresse postale, adresse e-mail, numéro de téléphone ;</li>
              <li>
                <strong>Données relatives au véhicule</strong> : immatriculation, numéro de formule, caractéristiques
                techniques, informations figurant sur les documents fournis ;
              </li>
              <li>
                <strong>Pièces justificatives</strong> : copies des documents nécessaires à la démarche (pièce
                d'identité, justificatif de domicile, certificat d'immatriculation, justificatif de cession, etc.) ;
              </li>
              <li>
                <strong>Données de transaction</strong> : montant, date, référence de commande. Les données bancaires
                (numéro de carte) ne sont <strong>pas</strong> collectées ni conservées par l'éditeur : elles sont
                traitées directement par le prestataire de paiement dans un environnement sécurisé ;
              </li>
              <li>
                <strong>Données de connexion</strong> : adresse IP, journaux techniques, données de navigation et
                cookies (voir article 8).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Finalités et bases légales du traitement</h2>
            <table>
              <thead>
                <tr>
                  <th>Finalité</th>
                  <th>Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Création et gestion de la commande, réalisation des démarches d'immatriculation auprès de l'administration</td>
                  <td>Exécution du contrat (art. 6.1.b RGPD)</td>
                </tr>
                <tr>
                  <td>Perception et reversement des taxes, facturation, comptabilité</td>
                  <td>Obligation légale (art. 6.1.c RGPD)</td>
                </tr>
                <tr>
                  <td>Gestion de la relation client, réponse aux demandes et réclamations</td>
                  <td>Exécution du contrat / intérêt légitime (art. 6.1.b et 6.1.f)</td>
                </tr>
                <tr>
                  <td>Lutte contre la fraude et sécurité des traitements</td>
                  <td>Intérêt légitime (art. 6.1.f RGPD)</td>
                </tr>
                <tr>
                  <td>Envoi d'informations commerciales (le cas échéant)</td>
                  <td>Consentement (art. 6.1.a RGPD)</td>
                </tr>
                <tr>
                  <td>Cookies non essentiels</td>
                  <td>Consentement (art. 6.1.a RGPD)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Destinataires des données</h2>
            <p>
              Les données sont destinées aux services habilités de l'éditeur et, dans la stricte mesure nécessaire à
              l'exécution des démarches, aux destinataires suivants :
            </p>
            <ul>
              <li>
                <strong>l'administration compétente</strong> (Ministère de l'Intérieur / ANTS) via le Système
                d'Immatriculation des Véhicules (SIV) ;
              </li>
              <li><strong>Sogecommerce (Société Générale)</strong> — prestataire de paiement ;</li>
              <li><strong>Supabase</strong> — hébergement de la base de données et des fonctions serveur ;</li>
              <li><strong>Lovable Labs Incorporated</strong> — hébergement et déploiement du Site ;</li>
              <li><strong>Resend</strong> — service d'envoi des e-mails transactionnels ;</li>
              <li>les <strong>prestataires techniques</strong> d'interrogation des données du véhicule, le cas échéant.</li>
            </ul>
            <p>L'éditeur ne vend ni ne loue les données personnelles à des tiers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Transferts hors Union européenne</h2>
            <p>
              Certains prestataires (notamment l'hébergeur Lovable Labs Incorporated, situé aux États-Unis) peuvent être
              amenés à traiter des données en dehors de l'Union européenne. Ces transferts sont encadrés par des
              garanties appropriées au sens des articles 44 et suivants du RGPD, notamment les{" "}
              <strong>clauses contractuelles types</strong> adoptées par la Commission européenne.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Durées de conservation</h2>
            <ul>
              <li>
                <strong>Données liées à une commande</strong> : conservées le temps de la relation contractuelle, puis
                archivées conformément aux délais de prescription légale applicables.
              </li>
              <li>
                <strong>Documents comptables et pièces justificatives</strong> : conservés pendant la durée imposée par
                les obligations légales et fiscales (en principe 10 ans pour les pièces comptables).
              </li>
              <li>
                <strong>Pièces justificatives sensibles</strong> (pièce d'identité, justificatif de domicile) :
                supprimées dès que leur conservation n'est plus nécessaire au traitement du dossier et au respect des
                obligations légales.
              </li>
              <li>
                <strong>Données de prospection</strong> : conservées jusqu'au retrait du consentement et, au maximum, 3
                ans à compter du dernier contact.
              </li>
              <li><strong>Cookies</strong> : durée maximale de 13 mois.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Sécurité</h2>
            <p>
              L'éditeur met en œuvre des mesures techniques et organisationnelles appropriées afin de protéger les
              données contre tout accès non autorisé, perte, altération ou divulgation. Les échanges sont chiffrés via le
              protocole SSL/TLS, et les documents transmis sont supprimés une fois le traitement du dossier achevé et les
              obligations légales satisfaites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Cookies</h2>
            <p>
              Le Site utilise des cookies nécessaires à son fonctionnement ainsi que, sous réserve de votre
              consentement, des cookies de mesure d'audience ou de marketing. Vous pouvez à tout moment paramétrer vos
              préférences via le bandeau de gestion des cookies ou les réglages de votre navigateur. Les cookies
              strictement nécessaires ne requièrent pas de consentement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants sur vos données :</p>
            <ul>
              <li>droit d'accès et d'information ;</li>
              <li>droit de rectification ;</li>
              <li>droit à l'effacement (« droit à l'oubli ») ;</li>
              <li>droit à la limitation du traitement ;</li>
              <li>droit d'opposition ;</li>
              <li>droit à la portabilité ;</li>
              <li>droit de définir des directives relatives au sort de vos données après votre décès.</li>
            </ul>
            <p>
              Vous pouvez exercer ces droits en écrivant à <strong>contact@discountcartegrise.fr</strong> ou par
              courrier au siège social, en justifiant de votre identité.
            </p>
            <p>
              Vous disposez également du droit d'introduire une réclamation auprès de la Commission Nationale de
              l'Informatique et des Libertés (CNIL) — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Modifications</h2>
            <p>
              L'éditeur se réserve le droit de modifier la présente Politique de Confidentialité à tout moment afin de
              l'adapter aux évolutions légales, réglementaires ou techniques. La version applicable est celle en vigueur
              à la date de consultation du Site.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
