import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { Shield, Award, Clock, Lock, MapPin, Mail, FileCheck, Users } from "lucide-react";

const APropos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="A propos | Discount Carte Grise - Service Agree par l'Etat"
        description="DISCOUNT DRIVER SAS, service d'immatriculation habilite par la Prefecture (N° 285046) et agree par le Tresor Public (N° 63198). Base a Gigean (34770)."
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8 text-foreground">A propos de Discount Carte Grise</h1>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Notre societe
              </h2>
              <p>
                <strong>DISCOUNT DRIVER SAS</strong> est une societe basee a <strong>Gigean (34770)</strong>, specialisee dans les demarches d'immatriculation de vehicules.
                Notre equipe est composee de professionnels experimentes dans le domaine de l'immatriculation, formes aux procedures de l'ANTS
                (Agence Nationale des Titres Securises) et aux evolutions reglementaires du Code de la route.
              </p>
            </section>

            {/* Credentials Section */}
            <section className="bg-muted/30 rounded-xl p-6 border">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Nos agrements et habilitations
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
                  <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">Habilitation Prefecture</p>
                    <p className="text-sm">N° 285046</p>
                    <p className="text-xs mt-1">Delivree par la Prefecture de l'Herault, cette habilitation nous autorise a traiter les demandes de certificat d'immatriculation.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
                  <FileCheck className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">Agrement Tresor Public</p>
                    <p className="text-sm">N° 63198</p>
                    <p className="text-xs mt-1">Cet agrement nous autorise a percevoir les taxes liees aux demarches d'immatriculation pour le compte du Tresor Public.</p>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-4">
                Vous pouvez verifier nos agrements aupres de l'{" "}
                <a href="https://ants.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ANTS</a>
                {" "}ou de votre prefecture.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Notre mission
              </h2>
              <p>
                Notre mission est de simplifier les demarches de carte grise pour les professionnels et les particuliers.
                Nous prenons en charge l'ensemble du processus administratif afin que vous puissiez vous concentrer sur l'essentiel.
                Chaque dossier est verifie par notre equipe avant transmission a l'ANTS, ce qui garantit un traitement rapide et sans erreur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Nos engagements</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Traitement sous 24h</p>
                    <p className="text-sm">Votre dossier est traite dans les 24 heures ouvrables suivant la reception de tous les documents.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Donnees securisees</p>
                    <p className="text-sm">Chiffrement SSL 256 bits, conformite RGPD. Vos documents sont automatiquement supprimes apres traitement.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Prix transparents</p>
                    <p className="text-sm">Aucun frais cache. Le prix affiche par notre simulateur est le prix final que vous payez.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Federation professionnelle</p>
                    <p className="text-sm">Membre de la Federation Francaise des Professionnels de la Carte Grise en Ligne.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section className="bg-primary/5 rounded-xl p-6 border border-primary/20">
              <h2 className="text-xl font-semibold text-foreground mb-4">Nous contacter</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>24 Rue du Crouzet, 34770 Gigean, France</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <a href="mailto:contact@discountcartegrise.fr" className="text-primary hover:underline">contact@discountcartegrise.fr</a>
                </div>
              </div>
              <p className="text-sm mt-4">Notre equipe repond a vos demandes du lundi au vendredi, sous 24h maximum.</p>
            </section>

            {/* Official Sources */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Sources et references officielles</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://ants.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    ANTS - Agence Nationale des Titres Securises
                  </a>
                  {" "}— organisme qui delivre les certificats d'immatriculation
                </li>
                <li>
                  <a href="https://www.service-public.fr/particuliers/vosdroits/N367" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Service-Public.fr — Carte grise (certificat d'immatriculation)
                  </a>
                  {" "}— informations officielles sur les demarches
                </li>
                <li>
                  <a href="https://www.prefecturedepolice.interieur.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Prefecture — Verification des habilitations
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default APropos;
