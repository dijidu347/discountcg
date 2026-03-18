import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function CGV() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Conditions Generales de Vente"
        description="CGV du service Discount Carte Grise - DISCOUNT DRIVER SAS"
        noindex
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Conditions generales de vente</h1>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 1 - Objet</h2>
            <p>
              Les presentes Conditions Generales de Vente (CGV) regissent les relations entre la societe
              DISCOUNT DRIVER SAS, sise au 24 RUE DU CROUZET, 34770 GIGEAN, habilitee par la Prefecture
              (N° 285046) et agreee par le Tresor Public (N° 63198), et toute personne effectuant une
              commande sur le site discountcartegrise.fr.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 2 - Services proposes</h2>
            <p>
              DISCOUNT DRIVER SAS propose un service d'intermediation pour les demarches d'immatriculation
              de vehicules aupres de l'ANTS (Agence Nationale des Titres Securises). Les services incluent notamment :
            </p>
            <ul>
              <li>Changement de titulaire (carte grise)</li>
              <li>Declaration de cession</li>
              <li>Changement d'adresse</li>
              <li>Duplicata de carte grise</li>
              <li>Demande d'immatriculation de vehicule neuf</li>
              <li>Autres demarches liees a l'immatriculation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 3 - Tarifs et paiement</h2>
            <p>
              Les tarifs affiches sur le site sont exprimes en euros et comprennent les frais de dossier
              du prestataire. Les taxes et redevances liees a l'immatriculation (taxe regionale, taxe sur
              les vehicules polluants, etc.) sont calculees en fonction du vehicule et du departement
              de residence du demandeur.
            </p>
            <p>
              Le paiement s'effectue en ligne par carte bancaire via une plateforme de paiement securisee (Stripe).
              Le paiement est exigible au moment de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 4 - Droit de retractation</h2>
            <p>
              Conformement a l'article L.221-28 du Code de la consommation, le droit de retractation ne
              peut etre exerce pour les contrats de prestations de services pleinement executes avant la
              fin du delai de retractation. Le client reconnait que l'execution du service commence des
              la validation du dossier et renonce expressement a son droit de retractation une fois le
              traitement du dossier engage aupres de l'ANTS.
            </p>
            <p>
              Avant le debut du traitement, le client peut annuler sa commande en contactant le service
              client a l'adresse contact@discountcartegrise.fr.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 5 - Delais de traitement</h2>
            <p>
              DISCOUNT DRIVER SAS s'engage a traiter les dossiers dans les meilleurs delais. Les delais
              indicatifs sont mentionnes sur les fiches de chaque demarche. Ces delais dependent de la
              completude du dossier fourni par le client et des delais de traitement de l'ANTS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 6 - Responsabilite</h2>
            <p>
              DISCOUNT DRIVER SAS agit en qualite d'intermediaire habilite et ne saurait etre tenu
              responsable des retards de traitement imputables a l'ANTS ou des erreurs resultant
              d'informations erronees fournies par le client.
            </p>
            <p>
              Le client est responsable de l'exactitude et de la completude des informations et documents
              fournis lors de sa commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 7 - Reclamations</h2>
            <p>
              Pour toute reclamation, le client peut contacter DISCOUNT DRIVER SAS par email a
              l'adresse contact@discountcartegrise.fr. Le service client s'engage a repondre dans un
              delai de 48 heures ouvrees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 8 - Droit applicable</h2>
            <p>
              Les presentes CGV sont soumises au droit francais. En cas de litige, les parties
              s'engagent a rechercher une solution amiable. A defaut, les tribunaux competents
              du ressort du siege social de la societe seront seuls competents.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
