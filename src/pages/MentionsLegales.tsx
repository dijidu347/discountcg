import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Mentions Legales"
        description="Mentions legales du site Discount Carte Grise - DISCOUNT DRIVER SAS"
        noindex
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mentions legales</h1>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Editeur du site</h2>
            <p>
              Le site discountcartegrise.fr est edite par la societe <strong>DISCOUNT DRIVER SAS</strong>.
            </p>
            <ul className="list-none space-y-1">
              <li>Siege social : 24 RUE DU CROUZET, 34770 GIGEAN</li>
              <li>Email : contact@discountcartegrise.fr</li>
              <li>Habilitation Prefecture N° 285046</li>
              <li>Agrement Tresor Public N° 63198</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Directeur de la publication</h2>
            <p>Le directeur de la publication est le representant legal de la societe DISCOUNT DRIVER SAS.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Hebergement</h2>
            <p>
              Le site est heberge par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, Etats-Unis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Propriete intellectuelle</h2>
            <p>
              L'ensemble des contenus (textes, images, logos, elements graphiques) presents sur le site discountcartegrise.fr
              sont la propriete exclusive de DISCOUNT DRIVER SAS, sauf mention contraire. Toute reproduction, representation,
              modification ou exploitation, totale ou partielle, est interdite sans autorisation prealable ecrite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Responsabilite</h2>
            <p>
              DISCOUNT DRIVER SAS s'efforce d'assurer l'exactitude et la mise a jour des informations diffusees sur le site.
              Toutefois, la societe ne peut garantir l'exactitude, la precision ou l'exhaustivite des informations
              mises a disposition. En consequence, l'utilisateur reconnait utiliser ces informations sous sa responsabilite exclusive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Donnees personnelles</h2>
            <p>
              Pour en savoir plus sur le traitement de vos donnees personnelles, consultez notre{" "}
              <a href="/politique-confidentialite" className="text-primary hover:underline">
                Politique de confidentialite
              </a>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
