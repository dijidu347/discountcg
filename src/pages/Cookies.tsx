import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function Cookies() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Politique de Cookies"
        description="Politique de cookies du site Discount Carte Grise - types de cookies utilises et gestion"
        noindex
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Politique de cookies</h1>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Qu'est-ce qu'un cookie ?</h2>
            <p>
              Un cookie est un petit fichier texte depose sur votre terminal (ordinateur, smartphone,
              tablette) lors de votre visite sur notre site. Il permet de stocker des informations
              relatives a votre navigation et de vous reconnaitre lors de vos visites ulterieures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Cookies utilises sur notre site</h2>

            <h3 className="text-lg font-medium text-foreground mt-4">Cookies strictement necessaires</h3>
            <p>
              Ces cookies sont indispensables au fonctionnement du site. Ils permettent notamment :
            </p>
            <ul>
              <li>La gestion de votre session et de votre authentification</li>
              <li>La memorisation de vos preferences de theme (clair/sombre)</li>
              <li>Le fonctionnement du panier de commande</li>
            </ul>
            <p>Ces cookies ne peuvent pas etre desactives car ils sont essentiels au service.</p>

            <h3 className="text-lg font-medium text-foreground mt-4">Cookies de performance et d'analyse</h3>
            <p>
              Ces cookies nous permettent de mesurer l'audience du site et d'analyser la navigation
              afin d'ameliorer nos services. Ils collectent des informations de maniere anonyme
              (pages visitees, temps passe, origine du trafic).
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4">Cookies de paiement</h3>
            <p>
              Notre prestataire de paiement Stripe utilise des cookies pour securiser les transactions
              et prevenir la fraude. Ces cookies sont necessaires au traitement de vos paiements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Gestion des cookies</h2>
            <p>
              Vous pouvez a tout moment gerer vos preferences en matiere de cookies en configurant
              votre navigateur. Voici comment proceder selon votre navigateur :
            </p>
            <ul>
              <li>
                <strong>Google Chrome</strong> : Parametres &gt; Confidentialite et securite &gt; Cookies et autres donnees de site
              </li>
              <li>
                <strong>Mozilla Firefox</strong> : Options &gt; Vie privee et securite &gt; Cookies et donnees de site
              </li>
              <li>
                <strong>Safari</strong> : Preferences &gt; Confidentialite &gt; Gerer les donnees de site web
              </li>
              <li>
                <strong>Microsoft Edge</strong> : Parametres &gt; Cookies et autorisations de site
              </li>
            </ul>
            <p>
              La desactivation de certains cookies peut affecter le fonctionnement du site et limiter
              l'acces a certaines fonctionnalites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Duree de conservation</h2>
            <p>
              Les cookies de session sont supprimes a la fermeture de votre navigateur. Les cookies
              persistants sont conserves pour une duree maximale de 13 mois, conformement aux
              recommandations de la CNIL.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Contact</h2>
            <p>
              Pour toute question concernant notre politique de cookies, contactez-nous a l'adresse
              contact@discountcartegrise.fr.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
