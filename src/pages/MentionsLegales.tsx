import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Mentions Legales"
        description="Mentions legales du site Discount Carte Grise - DISCOUNT AUTO / PAREBRISE"
        noindex
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mentions légales — discountcartegrise.fr</h1>
        <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 26 juin 2026</p>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <p>
            Conformément à l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie
            numérique (LCEN), les présentes mentions légales informent les utilisateurs du site{" "}
            <strong>discountcartegrise.fr</strong> (ci-après « le Site ») de l'identité de son éditeur et de son
            hébergeur.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Éditeur du Site</h2>
            <p>Le Site est édité par :</p>
            <p>
              <strong>DISCOUNT AUTO / PAREBRISE</strong> (DISCOUNT AUTO PARE BRISE)<br />
              Société par actions simplifiée (SAS) au capital de 10 000 €<br />
              Siège social : ZA de l'Avenir, 30600 Vestric-et-Candiac<br />
              SIRET (siège) : 830 888 277 00027<br />
              RCS : Nîmes 830 888 277 (Greffe du Tribunal de Commerce de Nîmes)<br />
              N° TVA intracommunautaire : FR68 830 888 277<br />
              Adresse e-mail : contact@discountcartegrise.fr<br />
              Horaires du service client : du lundi au vendredi, de 9h30 à 12h et de 14h à 17h30
            </p>
            <p>
              <strong>Directeur de la publication :</strong> Jimmy Sourasith Douangsiddhi, en sa qualité de Président.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Habilitation et agrément</h2>
            <p>Dans le cadre de son activité d'assistance aux démarches d'immatriculation, l'éditeur est :</p>
            <ul>
              <li>
                <strong>habilité par la Préfecture</strong> à accéder au Système d'Immatriculation des Véhicules (SIV)
                sous le numéro d'habilitation <strong>285046</strong> ;
              </li>
              <li>
                <strong>agréé par le Trésor Public</strong> sous le numéro <strong>63198</strong> pour la perception
                des taxes liées à l'immatriculation des véhicules.
              </li>
            </ul>
            <p>
              discountcartegrise.fr est un service <strong>commercial et privé</strong>,{" "}
              <strong>indépendant des administrations publiques</strong>. Il ne s'agit pas du site officiel de l'État.
              Les démarches d'immatriculation peuvent être réalisées par l'usager lui-même, sans frais de service, sur
              le site officiel de l'Agence Nationale des Titres Sécurisés (ANTS) :{" "}
              <a href="https://immatriculation.ants.gouv.fr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://immatriculation.ants.gouv.fr
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Hébergeur du Site</h2>
            <p>Le Site est hébergé par :</p>
            <p>
              <strong>Lovable Labs Incorporated</strong><br />
              1111B South Governors Avenue, Dover, DE 19904, États-Unis<br />
              Site web : https://lovable.dev
            </p>
            <p>
              Représentant dans l'Union européenne : Lovable Labs AB, Regeringsgatan 25, 111 53 Stockholm, Suède.
            </p>
            <p>
              Les données et traitements applicatifs s'appuient par ailleurs sur les services techniques de{" "}
              <strong>Supabase</strong> (base de données et fonctions serveur) et, pour les paiements, sur la plateforme{" "}
              <strong>Sogecommerce (Société Générale)</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments composant le Site (structure, textes, images, graphismes, logos, marques, bases de
              données) est protégé par le Code de la propriété intellectuelle et demeure la propriété exclusive de
              l'éditeur ou de ses partenaires.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, de ces
              éléments, par quelque procédé que ce soit et sur quelque support que ce soit, est interdite sans
              l'autorisation écrite préalable de l'éditeur, sous peine de constituer une contrefaçon sanctionnée par les
              articles L. 335-2 et suivants du Code de la propriété intellectuelle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Données personnelles</h2>
            <p>
              Le traitement des données personnelles des utilisateurs est décrit dans la{" "}
              <strong>Politique de Confidentialité</strong> accessible sur le Site, conformément au Règlement (UE)
              2016/679 (RGPD) et à la loi « Informatique et Libertés » modifiée.
            </p>
            <p>
              Pour toute question relative à vos données ou pour exercer vos droits : contact@discountcartegrise.fr.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Médiation de la consommation</h2>
            <p>
              Conformément à l'article L. 612-1 du Code de la consommation, le consommateur peut recourir gratuitement à
              un médiateur de la consommation. L'éditeur adhère au médiateur suivant :
            </p>
            <p>
              <strong>Médiateur de Mobilians</strong><br />
              43 bis, Route de Vaugirard – CS 80016, 92197 Meudon Cedex<br />
              Saisine en ligne : https://www.mediateur-mobilians.fr — E-mail : mediateur@mediateur-mobilians.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Responsabilité</h2>
            <p>
              L'éditeur s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le Site, sans
              pouvoir en garantir l'exhaustivité. L'éditeur ne saurait être tenu responsable des erreurs, d'une absence
              de disponibilité du Site, ou de la présence de virus ou autres éléments nuisibles provenant de tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. Tout litige relatif à leur
              interprétation ou à l'utilisation du Site relève de la compétence des tribunaux français.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
