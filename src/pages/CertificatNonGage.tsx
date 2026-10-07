// Le certificat de situation administrative, dit « non-gage ».
//
// 246 000 recherches par mois, et aucune page chez nous alors que nous le
// fournissons sur toutes les cartes grises, déclarations d'achat et de cession.
//
// Le parti pris de cette page : le document est gratuit chez le ministère, et
// le dire franchement. Les trois sites privés qui se classent sur cette requête
// entretiennent le flou ; un visiteur qui découvre la gratuité ailleurs ne
// revient pas. Ce qui se vend ici n'est pas le document, c'est de ne pas avoir
// à le demander — et surtout de savoir le lire, ce que personne n'explique.

import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { webPageSchema, faqSchema, breadcrumbSchema } from "@/components/seo/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, ChevronRight, ExternalLink, FileSearch, HelpCircle, Info, ShieldCheck } from "lucide-react";
import { NON_GAGE_PRICE_PARTICULIER, NON_GAGE_PRICE_PRO } from "@/lib/nonGage";

// Les six rubriques du certificat, dans l'ordre où le ministère les imprime.
// Recopiées de la fiche qui sert à nos contrôles : c'est la même grille de
// lecture, appliquée tous les jours à de vrais documents.
const RUBRIQUES = [
  {
    titre: "Opposition au transfert du certificat d'immatriculation (OTCI)",
    vierge: "Aucune",
    sens: "Une administration bloque le changement de titulaire : amendes impayées, expertise non levée, procédure en cours.",
  },
  {
    titre: "Opposition véhicule endommagé",
    vierge: "Aucune",
    sens: "Le véhicule a été expertisé après un accident. Il ne peut être revendu qu'une fois la procédure levée.",
  },
  {
    titre: "Déclaration valant saisie",
    vierge: "Aucune",
    sens: "Un huissier ou le Trésor public a saisi le véhicule. La vente est impossible.",
  },
  {
    titre: "Gage",
    vierge: "Aucun",
    sens: "Un organisme de crédit a financé le véhicule et garde un droit dessus. Le nom du créancier apparaît.",
  },
  {
    titre: "Immatriculation suspendue",
    vierge: "Non",
    sens: "Le certificat d'immatriculation a été suspendu : le véhicule ne peut plus circuler en l'état.",
  },
  {
    titre: "Véhicule volé",
    vierge: "Non",
    sens: "Le véhicule est déclaré volé. N'allez pas plus loin.",
  },
];

const FAQ = [
  {
    question: "Le certificat de non-gage est-il payant ?",
    answer: "Non. Il est délivré gratuitement par le ministère de l'Intérieur, sur le site du SIV ou via Histovec. Il vous faut le numéro d'immatriculation, la date du certificat d'immatriculation et le nom du titulaire. Comptez deux minutes. Les services qui le facturent vendent le fait de s'en occuper à votre place, pas le document lui-même.",
  },
  {
    question: "Combien de temps un certificat de situation administrative est-il valable ?",
    answer: "Quinze jours. Passé ce délai, il n'est plus recevable pour une démarche d'immatriculation : la situation d'un véhicule peut changer d'un jour à l'autre. Demandez-le au moment de la vente, pas trois semaines avant.",
  },
  {
    question: "Pour quelles démarches le certificat est-il exigé ?",
    answer: "Pour une carte grise, une déclaration d'achat et une déclaration de cession. Il prouve que rien ne s'oppose au transfert du véhicule. Les autres démarches — duplicata, changement d'adresse, quitus fiscal — ne le demandent pas.",
  },
  {
    question: "Que faire si le véhicule est gagé ?",
    answer: "Un gage ne rend pas la vente impossible, mais il la complique : l'organisme de crédit garde un droit sur le véhicule tant que le financement court. Le vendeur doit solder son crédit et obtenir la mainlevée. Tant qu'elle n'est pas enregistrée, la carte grise ne pourra pas être établie au nom de l'acheteur.",
  },
  {
    question: "Un document Histovec remplace-t-il le certificat ?",
    answer: "Pas toujours. Histovec délivre deux choses : un rapport d'historique du véhicule, qui n'est pas un certificat de situation administrative, et le certificat lui-même. Seul le second conclut sur la situation administrative, rubrique par rubrique. Un rapport d'historique seul sera refusé.",
  },
  {
    question: "Qui doit demander le certificat, le vendeur ou l'acheteur ?",
    answer: "C'est au vendeur de le fournir : il est le seul à disposer des informations nécessaires pour l'obtenir, et c'est à lui de prouver que son véhicule est libre de tout obstacle. L'acheteur, lui, a tout intérêt à le lire avant de payer.",
  },
];

export default function CertificatNonGage() {
  const schemas = [
    webPageSchema(
      "Certificat de situation administrative (non-gage) : l'obtenir et le lire",
      "Le certificat de non-gage est gratuit et s'obtient en deux minutes auprès du ministère. Ce qu'il contient, comment le lire sans se tromper, et quand il est exigé.",
      "https://discountcartegrise.fr/certificat-de-non-gage",
    ),
    breadcrumbSchema([
      { name: "Accueil", url: "https://discountcartegrise.fr/" },
      { name: "Certificat de non-gage", url: "https://discountcartegrise.fr/certificat-de-non-gage" },
    ]),
    faqSchema(FAQ),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Certificat de Non-Gage Gratuit | Situation Administrative"
        description="Le certificat de non-gage est gratuit auprès du ministère de l'Intérieur et s'obtient en deux minutes. Ses six rubriques expliquées, sa durée de validité, et les démarches qui l'exigent."
        canonical="https://discountcartegrise.fr/certificat-de-non-gage"
        schema={schemas}
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Certificat de non-gage</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Certificat de situation administrative, dit « non-gage »
        </h1>

        <div className="prose prose-lg max-w-none text-muted-foreground mb-12 space-y-4">
          <p>
            Le <strong>certificat de situation administrative</strong>, que tout le monde appelle le
            « non-gage », dit si quelque chose s'oppose à la vente d'un véhicule : un crédit en
            cours, une saisie, une opposition, un vol. Sans lui, l'acheteur ne peut pas faire établir
            la carte grise à son nom.
          </p>
          <p>
            Il est délivré par le <strong>ministère de l'Intérieur</strong>, et il est{" "}
            <strong>gratuit</strong>. Autant le dire tout de suite : personne n'a besoin de le payer.
            Ce qui demande un peu d'attention, en revanche, c'est de le lire — sa mise en page
            trompe beaucoup de monde, et c'est ce que cette page explique.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            L'obtenir gratuitement, en deux minutes
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ce qu'il faut sous la main</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Le <strong>numéro d'immatriculation</strong> du véhicule.</p>
                <p>La <strong>date du certificat d'immatriculation</strong>, repère I de la carte grise.</p>
                <p>Le <strong>nom du titulaire</strong>, tel qu'il figure au repère C.1.</p>
                <p className="pt-1">Ces trois informations sont toutes sur la carte grise : le vendeur les a, l'acheteur non.</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Où le demander</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>
                  Deux services officiels, qui se valent : le <strong>site du SIV</strong> et{" "}
                  <strong>Histovec</strong>. Le résultat s'affiche immédiatement et se télécharge en PDF.
                </p>
                <a
                  href="https://siv.interieur.gouv.fr/map-usg-ui/do/accueil_certificat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  Demander mon certificat sur le site du ministère
                  <ExternalLink className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <FileSearch className="w-7 h-7 text-primary" />
            Les six rubriques, et le piège de la mise en page
          </h2>
          <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Chaque rubrique est imprimée même quand il n'y a rien à signaler.</strong> Lire
              « Gage » sur le document ne veut pas dire que le véhicule est gagé : c'est un titre. La
              réponse est sur la ligne en dessous. Beaucoup d'acheteurs renoncent à une vente pour
              avoir confondu les deux.
            </p>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rubrique</TableHead>
                    <TableHead className="whitespace-nowrap">Si tout va bien</TableHead>
                    <TableHead>Ce que ça veut dire sinon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RUBRIQUES.map((r) => (
                    <TableRow key={r.titre}>
                      <TableCell className="font-medium">{r.titre}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="whitespace-nowrap">{r.vierge}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.sens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <Info className="w-4 h-4 inline mr-1" />
            Un certificat où les six lignes répondent « Aucune », « Aucun » ou « Non » est vierge :
            le véhicule est libre de tout obstacle.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Calendar className="w-7 h-7 text-primary" />
            Quinze jours, pas un de plus
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              Le certificat n'est <strong>recevable que quinze jours</strong> après sa date
              d'édition. La raison est simple : la situation d'un véhicule peut changer du jour au
              lendemain — un gage s'inscrit, une opposition tombe.
            </p>
            <p>
              C'est l'erreur la plus fréquente sur les dossiers que nous traitons : un certificat
              demandé en même temps que la mise en vente, et produit six semaines plus tard au
              moment de la carte grise. Il faut le redemander, et le dossier attend. Demandez-le{" "}
              <strong>le jour de la vente</strong>.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Info className="w-7 h-7 text-primary" />
            Quand il est exigé
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4">
                <Link to="/simulateur" className="font-medium text-primary hover:underline">Carte grise</Link>
                <p className="mt-1 text-sm text-muted-foreground">Changement de titulaire : le certificat prouve que rien ne bloque le transfert.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <Link to="/declaration-cession" className="font-medium text-primary hover:underline">Déclaration de cession</Link>
                <p className="mt-1 text-sm text-muted-foreground">Le vendeur le fournit à l'acheteur avec la carte grise barrée.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <Link to="/declaration-achat" className="font-medium text-primary hover:underline">Déclaration d'achat</Link>
                <p className="mt-1 text-sm text-muted-foreground">Le professionnel qui reprend un véhicule vérifie sa situation avant de le revendre.</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground mt-6">
            Les autres démarches — duplicata, changement d'adresse, quitus fiscal — ne le demandent pas.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-primary" />
            Histovec : deux documents à ne pas confondre
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              Histovec délivre un <strong>rapport d'historique</strong> — sinistres, changements de
              propriétaire, contrôles techniques — et, séparément, le{" "}
              <strong>certificat de situation administrative</strong>.
            </p>
            <p>
              Seul le second conclut rubrique par rubrique sur la situation du véhicule. Un rapport
              d'historique produit à la place sera refusé : il raconte le passé du véhicule, il ne
              dit pas si quelque chose s'oppose à sa vente aujourd'hui.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Et si vous préférez ne pas vous en occuper
              </h2>
              <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                <p>
                  Le document est gratuit, nous venons de le dire et rien ne change. Mais sur une
                  démarche que nous traitons, nous pouvons nous en charger : nous le demandons, nous
                  le lisons, et nous vérifions qu'il est vierge avant de déposer le dossier — ce qui
                  évite un rejet découvert trois semaines plus tard.
                </p>
                <p>
                  C'est une option à <strong>{NON_GAGE_PRICE_PRO} €</strong> pour un professionnel,{" "}
                  <strong>{NON_GAGE_PRICE_PARTICULIER} €</strong> pour un particulier, proposée au
                  moment de la commande. Si vous avez déjà le certificat, vous le déposez et
                  l'option ne s'applique pas.
                </p>
              </div>
              <Button asChild size="lg" className="mt-6">
                <Link to="/simulateur">Calculer le prix de ma carte grise</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            Questions fréquentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <Footer />
    </div>
  );
}
