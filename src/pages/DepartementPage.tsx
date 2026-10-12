// La page d'un département : ce que coûte une carte grise ici, et pourquoi.
//
// Cent une pages engendrées à partir d'une même fonction, et c'est précisément
// le risque : le tarif du cheval fiscal étant voté par la RÉGION, douze
// départements d'Auvergne-Rhône-Alpes partagent le même 43 €. Un texte recopié
// cent une fois en changeant le nom est ce que les moteurs appellent une page
// satellite, et c'est ce qui a tué l'ancienne page /prix-carte-grise.
//
// Tout le texte vient de departementContenu.ts, lu aussi par le prérendu : le
// robot et le visiteur lisent le même contenu, et les montants sortent de
// calculatePrice, celle qu'utilise le simulateur.

import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { breadcrumbSchema, faqSchema, organizationSchema } from "@/components/seo/schemas";
import { DEPARTEMENT_PAR_CHEMIN, CHEMIN_DEPARTEMENT } from "@/data/departements";
import { contenuDepartement, FRAIS_DOSSIER_CG } from "@/data/departementContenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Calculator, MapPin, ArrowRight, Zap, Home, ChevronRight, Scale } from "lucide-react";

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function DepartementPage() {
  const { chemin } = useParams<{ chemin: string }>();
  const dep = chemin ? DEPARTEMENT_PAR_CHEMIN[chemin.toLowerCase()] : undefined;

  // Une URL inventée ne doit pas rendre une page vide : on renvoie au
  // simulateur, qui porte le tableau des cent un départements.
  if (!dep) return <Navigate to="/simulateur" replace />;

  const c = contenuDepartement(dep);
  const six = c.bareme.find((l) => l.cv === 6)!;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={c.title}
        description={c.description}
        canonical={c.canonical}
        schema={[
          organizationSchema(),
          faqSchema(c.faqs),
          breadcrumbSchema([
            { name: "Accueil", url: "https://discountcartegrise.fr/" },
            { name: "Prix de la carte grise", url: "https://discountcartegrise.fr/simulateur" },
            { name: `${dep.nom} (${dep.code})`, url: c.canonical },
          ]),
        ]}
      />
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 pb-16 pt-24">
        <nav aria-label="Fil d'Ariane" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-3.5 w-3.5" /> Accueil
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/simulateur" className="hover:text-foreground">Prix de la carte grise</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{dep.nom} ({dep.code})</span>
        </nav>

        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">
            <MapPin className="mr-1 h-3 w-3" />
            {c.region.nom}
          </Badge>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{c.h1}</h1>
          <div className="space-y-3 text-muted-foreground">
            {c.intro.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/simulateur">
                <Calculator className="mr-2 h-4 w-4" />
                Calculer le prix exact de ma carte grise
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/carte-grise">Faire ma demande en ligne</Link>
            </Button>
          </div>
        </header>

        {/* Le barème : la réponse que l'on vient chercher. */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">
              Prix d'une carte grise {dep.dans} selon la puissance fiscale
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Montants officiels : taxe régionale ({eur(c.tarif)} par cheval fiscal) + taxe fixe de
              11 € + redevance d'acheminement de 2,76 €. La dernière colonne ajoute nos frais de
              dossier de {FRAIS_DOSSIER_CG} €.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Puissance</TableHead>
                    <TableHead className="text-right">Taxe régionale</TableHead>
                    <TableHead className="text-right">Total taxes</TableHead>
                    <TableHead className="text-right">Plus de 10 ans</TableHead>
                    <TableHead className="text-right">Tout compris</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.bareme.map((l) => (
                    <TableRow key={l.cv}>
                      <TableCell className="font-medium">{l.cv} CV</TableCell>
                      <TableCell className="text-right tabular-nums">{eur(l.taxe)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{eur(l.total)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{eur(l.totalAncien)}</TableCell>
                      <TableCell className="text-right tabular-nums">{eur(l.totalAvecFrais)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              La puissance fiscale se lit en case P.6 de la carte grise. L'abattement de 50 % sur la
              taxe régionale s'applique dès que la première mise en circulation remonte à plus de
              dix ans, sans démarche particulière.
            </p>
          </CardContent>
        </Card>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                {dep.chefLieu} ou ailleurs : le même prix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{c.communesTexte}</p>
              <p>{c.memeTarifTexte}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-primary" />
                Véhicule électrique
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{c.electriqueTexte}</p>
            </CardContent>
          </Card>
        </div>

        {/* Le seul bloc qui change vraiment d'une page à l'autre. */}
        {c.voisins.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Scale className="h-5 w-5 text-primary" />
                {c.voisinsTitre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                {c.voisinsTexte.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <div className="mt-5 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Département limitrophe</TableHead>
                      <TableHead className="text-right">Cheval fiscal</TableHead>
                      <TableHead className="text-right">Écart sur un 6 CV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.voisins.map((v) => (
                      <TableRow key={v.code}>
                        <TableCell>
                          <Link to={v.chemin} className="font-medium text-primary hover:underline">
                            {v.nom} ({v.code})
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">{v.region}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{eur(v.tarif)}</TableCell>
                        <TableCell className={`text-right tabular-nums ${v.ecart6cv > 0 ? "text-destructive" : v.ecart6cv < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {v.ecart6cv === 0 ? "—" : (v.ecart6cv > 0 ? "+" : "−") + eur(Math.abs(v.ecart6cv))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Le classement national, la composition des cinq taxes et la règle de
            l'abattement ne varient pas d'un département à l'autre : les répéter
            ici cent une fois diluait le peu qui distingue chaque page — 0,93 de
            similarité mesurée entre deux départements d'une même région. Ils
            vivent sur le simulateur, vers lequel on renvoie. */}
        <p className="mb-8 text-sm text-muted-foreground">
          {c.rangTexte}{" "}
          <Link to="/simulateur" className="text-primary hover:underline">
            Le détail des cinq taxes, l'abattement des véhicules de plus de dix ans et le tableau
            des cent un départements
          </Link>{" "}
          sont réunis sur la page du simulateur.
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Questions fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {c.faqs.map((f, i) => (
                <AccordionItem key={i} value={`q${i}`}>
                  <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Toutes les démarches, {dep.dans} comme ailleurs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {[
              ["/carte-grise", "Changement de titulaire"],
              ["/declaration-cession", "Déclaration de cession"],
              ["/changement-adresse-carte-grise", "Changement d'adresse"],
              ["/duplicata-carte-grise", "Duplicata"],
              ["/carte-grise-vehicule-neuf", "Véhicule neuf"],
              ["/succession-carte-grise", "Succession"],
              ["/certificat-de-non-gage", "Certificat de non-gage"],
              ["/simulateur", "Simulateur de prix"],
            ].map(([href, libelle]) => (
              <Link
                key={href}
                to={href}
                className="rounded-full border px-3 py-1.5 transition-colors hover:border-primary hover:text-primary"
              >
                {libelle}
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="rounded-lg border-2 border-primary bg-primary/5 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold">
            Votre carte grise {dep.dans}, traitée sous 24 heures
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Un 6 CV revient à {eur(six.total)} de taxes {dep.dans}, plus {FRAIS_DOSSIER_CG} € de
            frais de dossier. Habilitation préfectorale n° 285046, agrément du Trésor public
            n° 63198.
          </p>
          <Button asChild size="lg">
            <Link to="/simulateur">
              Calculer mon prix exact
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
