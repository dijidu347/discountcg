// La page qui manquait : celle qui s'adresse aux garages.
//
// Sur douze mois, le canal professionnel a porté 4 047 démarches et 34 020 €
// de frais de service, contre 67 démarches et 1 886 € pour le particulier.
// Autrement dit 95 % de l'activité — et pas une seule page du site ne
// s'adressait à lui. Un garage qui cherche un prestataire d'immatriculation ne
// trouvait qu'un bouton « Espace Pro » menant à un formulaire d'inscription.
//
// Le parti pris est celui qui a marché sur la cession et le non-gage : dire ce
// que le visiteur découvrirait de toute façon ailleurs. Ici, qu'un garage peut
// demander sa propre habilitation au SIV et se passer de nous. Le dire
// d'emblée, puis expliquer ce que la délégation évite.

import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { ROUTES_SEO } from "@/data/seoRoutes";
import { webPageSchema, faqSchema, breadcrumbSchema, organizationSchema } from "@/components/seo/schemas";
import { TarifsPro } from "@/components/pro/TarifsPro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Building2,
  ChevronRight,
  Clock,
  FileCheck2,
  Gift,
  HelpCircle,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const SEO = ROUTES_SEO["/carte-grise-professionnel"];

import { PREUVES, ETAPES, FAQ } from "@/data/professionnelContenu";

// Les donnees nomment leur icone ; la correspondance vit ici, ou React est
// disponible.
const ICONES = { Building2, ShieldCheck, Wallet, FileCheck2 } as const;

// Mesures relevées en base le 7 octobre 2026. À rafraîchir si elles sont citées
// longtemps : une preuve chiffrée ne vaut que si elle reste vraie.
export default function CarteGriseProfessionnel() {
  const schemas = [
    organizationSchema(),
    webPageSchema(SEO.h1, SEO.description, SEO.canonical),
    breadcrumbSchema([
      { name: "Accueil", url: "https://discountcartegrise.fr/" },
      { name: "Professionnels", url: SEO.canonical },
    ]),
    faqSchema(FAQ),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={SEO.title}
        description={SEO.description}
        canonical={SEO.canonical}
        schema={schemas}
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-primary">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Professionnels</span>
        </nav>

        <h1 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
          Carte grise pour les professionnels de l'automobile
        </h1>

        <div className="prose prose-lg mb-10 max-w-none space-y-4 text-muted-foreground">
          <p>
            Garages, concessions, négociants, loueurs : déposez vos immatriculations depuis un
            compte professionnel, sous notre habilitation. Déclaration d'achat et de cession,
            changement de titulaire, véhicule neuf, W garage, WW provisoire — sans vous occuper des
            formalités auprès de la préfecture.
          </p>
          <p>
            Disons-le d'emblée : <strong>vous pouvez demander votre propre habilitation au SIV</strong>.
            Elle est délivrée par le préfet du département de votre siège social. Si vous
            immatriculez beaucoup et que vous voulez tout gérer en interne, c'est la bonne voie, et
            nous ne serons pas le moins cher. Ce qui suit explique ce que la délégation évite.
          </p>
        </div>

        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          {PREUVES.map((p) => (
            <Card key={p.libelle}>
              <CardContent className="py-5">
                <div className="text-3xl font-bold text-foreground">{p.valeur}</div>
                <div className="mt-1 font-medium text-foreground">{p.libelle}</div>
                <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <Receipt className="h-7 w-7 text-primary" />
            La grille tarifaire, en entier
          </h2>
          <p className="mb-6 text-muted-foreground">
            Pas de devis, pas de palier à négocier : voici ce que coûte chaque démarche. La
            déclaration d'achat et la déclaration de cession, qui sont le quotidien d'un garage,
            sont les moins chères parce que ce sont celles que vous faites le plus.
          </p>
          <TarifsPro />
          <div className="mt-6 flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">La première déclaration est offerte.</strong> À
              l'ouverture de votre compte, votre première déclaration d'achat ou de cession ne vous
              est pas débitée — de quoi juger sur pièce avant de créditer quoi que ce soit.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <Clock className="h-7 w-7 text-primary" />
            Comment ça se passe
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {ETAPES.map((e, i) => {
              const Icone = ICONES[e.icone];
              return (
                <Card key={e.titre}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-base">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <Icone className="h-5 w-5 text-primary" />
                      {e.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{e.texte}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Demander son habilitation, ou déléguer
          </h2>
          <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
            <p>
              Les deux autorisations ne se confondent pas. L'<strong>habilitation</strong>, délivrée
              par la préfecture, donne accès au SIV pour effectuer les démarches.
              L'<strong>agrément</strong>, délivré par le Trésor public, autorise à percevoir les
              taxes d'immatriculation pour le compte de l'État. Un professionnel habilité mais non
              agréé ne peut pas encaisser la taxe régionale de son client : il doit la lui faire
              régler séparément.
            </p>
            <p>
              Nous détenons les deux — habilitation <strong>n° 285046</strong>, agrément{" "}
              <strong>n° 63198</strong> — et c'est ce qui permet de vous facturer une démarche
              complète, taxes comprises, en une seule ligne.
            </p>
            <p>
              Si vous voulez la demander, nous avons écrit la procédure complète : conditions,
              pièces, pré-demande ANTS et obligations qui suivent, sur notre page{" "}
              <Link to="/habilitation-siv" className="font-semibold text-primary hover:underline">
                habilitation SIV
              </Link>
              . Une condition y est décisive : il faut plus d'un an d'activité, ce qui ferme la
              voie aux établissements récents.
            </p>
            <p>
              Déléguer a un coût par démarche, et c'est son seul inconvénient. En échange, vous
              n'avez pas de dossier à instruire auprès de la préfecture, pas d'agrément séparé à
              obtenir pour les taxes, pas d'accès SIV à administrer ni de responsabilité à porter
              sur les dépôts. Au-delà d'un certain volume, l'arbitrage s'inverse : demandez votre
              habilitation, c'est le bon choix.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <HelpCircle className="h-7 w-7 text-primary" />
            Questions fréquentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              Ouvrez votre compte professionnel
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
              Kbis et pièce d'identité du dirigeant, et votre première déclaration est offerte. Ni
              abonnement, ni engagement.
            </p>
            <Button asChild size="lg">
              <Link to="/register">Créer mon compte garage</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
