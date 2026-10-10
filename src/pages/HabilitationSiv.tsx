// L'habilitation au SIV, expliquée à ceux qui se demandent s'ils doivent la
// demander.
//
// C'est le moment exact où un garage devient un prospect : il cherche comment
// immatriculer lui-même pour ses clients. Les sites qui se positionnent sur
// cette requête vendent leur service sans jamais expliquer la procédure — ce
// qui laisse une place à qui l'explique vraiment.
//
// Les faits viennent d'une page préfectorale (Hérault), qui cite ses textes :
// article R. 322-1 du code de la route pour la qualité de professionnel,
// article 18-1 de l'arrêté du 9 février 2009 pour le casier. Rien n'est
// inventé, et ce qui varie d'une préfecture à l'autre est signalé comme tel.
//
// La page conclut honnêtement : au-dessus d'un certain volume, demander son
// habilitation est le bon choix. Ce qui rend crédible le cas inverse.

import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { ROUTES_SEO } from "@/data/seoRoutes";
import { webPageSchema, faqSchema, breadcrumbSchema, organizationSchema } from "@/components/seo/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Info,
  Scale,
  Users,
} from "lucide-react";

const SEO = ROUTES_SEO["/habilitation-siv"];

import { BENEFICIAIRES, CONDITIONS, OBLIGATIONS, FAQ } from "@/data/habilitationSivContenu";

export default function HabilitationSiv() {
  const schemas = [
    organizationSchema(),
    webPageSchema(SEO.h1, SEO.description, SEO.canonical),
    breadcrumbSchema([
      { name: "Accueil", url: "https://discountcartegrise.fr/" },
      { name: "Professionnels", url: "https://discountcartegrise.fr/carte-grise-professionnel" },
      { name: "Habilitation SIV", url: SEO.canonical },
    ]),
    faqSchema(FAQ),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={SEO.title} description={SEO.description} canonical={SEO.canonical} schema={schemas} />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-primary">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/carte-grise-professionnel" className="transition-colors hover:text-primary">Professionnels</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Habilitation SIV</span>
        </nav>

        <h1 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
          Habilitation SIV : conditions, procédure et obligations
        </h1>

        <div className="prose prose-lg mb-12 max-w-none space-y-4 text-muted-foreground">
          <p>
            L'<strong>habilitation au Système d'Immatriculation des Véhicules</strong> autorise un
            professionnel à télétransmettre lui-même les opérations d'immatriculation de ses
            clients. Elle est délivrée par le préfet du département du siège social de l'entreprise.
          </p>
          <p>
            Cette page explique comment l'obtenir et ce qu'elle engage. Nous sommes nous-mêmes
            habilités et agréés, donc intéressés à ce que vous passiez par nous — raison de plus
            pour vous donner la procédure complète : vous la trouverez de toute façon, autant
            qu'elle soit exacte.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <Users className="h-7 w-7 text-primary" />
            Qui peut la demander
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {BENEFICIAIRES.map((b) => (
              <li key={b} className="flex gap-2 text-muted-foreground">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-muted-foreground">
            Seuls les professionnels du commerce de l'automobile et les loueurs peuvent demander,
            en plus, l'agrément qui autorise à percevoir les taxes.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <Scale className="h-7 w-7 text-primary" />
            Les deux conditions, cumulatives
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {CONDITIONS.map((c, i) => (
              <Card key={c.titre}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-3 text-base">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    {c.titre}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{c.texte}</p>
                  <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{c.bloquant}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-6 flex gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Les préfectures le rappellent noir sur blanc : <strong>l'habilitation SIV n'est pas un
              droit</strong>. L'autorité préfectorale reste seule à apprécier le bien-fondé d'une
              demande, même complète.
            </span>
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <FileText className="h-7 w-7 text-primary" />
            Les pièces et la marche à suivre
          </h2>
          <p className="mb-4 text-muted-foreground">
            Trois pièces sont systématiquement demandées :
          </p>
          <ul className="mb-6 space-y-2">
            {[
              "Un extrait Kbis de moins de six mois — ou, sans inscription au RCS, une attestation d'immatriculation au RNE — ou votre numéro de SIRET",
              "La pièce d'identité du gérant de la société",
              "La pièce d'identité de chaque personne qui aura accès au SIV",
            ].map((p) => (
              <li key={p} className="flex gap-2 text-muted-foreground">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Vient ensuite une <strong>pré-demande en ligne sur le site de l'ANTS</strong>, puis
              l'acquisition du <strong>certificat numérique</strong> indispensable à la
              télétransmission. Les préfectures conseillent d'attendre la validation de votre
              demande avant de l'acheter, pour ne pas le payer en pure perte en cas de refus.
            </p>
            <p className="flex gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Le point d'entrée varie selon les départements : certaines préfectures demandent un
                premier contact par e-mail à leur service SIV, d'autres passent par une
                télé-procédure dédiée. Vérifiez sur le site de la préfecture de votre siège social.
              </span>
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <ClipboardList className="h-7 w-7 text-primary" />
            Ce que l'habilitation engage, une fois obtenue
          </h2>
          <p className="mb-6 text-muted-foreground">
            C'est la partie que l'on découvre généralement après coup. L'habilitation n'est pas un
            simple accès : elle crée des obligations durables.
          </p>
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Obligation</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {OBLIGATIONS.map((o) => (
                    <TableRow key={o.quoi}>
                      <TableCell className="font-medium">{o.quoi}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
            La demander, ou passer par un habilité
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Demandez votre habilitation si…</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Votre établissement a plus d'un an et une activité attestée.</p>
                <p>Vous immatriculez en volume, toute l'année.</p>
                <p>Vous acceptez le certificat numérique, l'archivage sur cinq ans et le contrôle préfectoral.</p>
                <p className="pt-1 font-medium text-foreground">C'est alors le choix le plus économique, et nous ne serons pas compétitifs.</p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Passez par un habilité si…</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Votre établissement a moins d'un an — l'habilitation vous est fermée.</p>
                <p>Votre volume ne justifie pas le certificat numérique et les obligations qui suivent.</p>
                <p>Vous voulez immatriculer dès maintenant, sans attendre une instruction préfectorale.</p>
                <p>Vous n'avez pas l'agrément et ne voulez pas faire régler la taxe séparément par vos clients.</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 rounded-lg border bg-muted/40 p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Habilitation n° 285046</Badge>
              <Badge variant="secondary">Agrément n° 63198</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Nous détenons les deux autorisations. Vos démarches passent sous notre habilitation,
              et les taxes sont perçues puis reversées par nos soins — votre client règle une seule
              fois, vous facturez une seule ligne.
            </p>
            <Button asChild className="mt-4">
              <Link to="/carte-grise-professionnel">Voir l'offre et les tarifs professionnels</Link>
            </Button>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
            <HelpCircle className="h-7 w-7 text-primary" />
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
