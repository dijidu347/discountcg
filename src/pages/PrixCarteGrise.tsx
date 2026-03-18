import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { webPageSchema, faqSchema, breadcrumbSchema } from "@/components/seo/schemas";
import { departementsTarifs, departementsLabels } from "@/data/departementsTarifs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Euro, MapPin, Car, TrendingDown, Info, HelpCircle, ArrowUpDown, ChevronRight } from "lucide-react";

const regions: Record<string, { name: string; depts: string[] }> = {
  idf: { name: "Ile-de-France", depts: ["75", "77", "78", "91", "92", "93", "94", "95"] },
  ara: { name: "Auvergne-Rhone-Alpes", depts: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"] },
  bfc: { name: "Bourgogne-Franche-Comte", depts: ["21", "25", "39", "58", "70", "71", "89", "90"] },
  bre: { name: "Bretagne", depts: ["22", "29", "35", "56"] },
  cvl: { name: "Centre-Val de Loire", depts: ["18", "28", "36", "37", "41", "45"] },
  cor: { name: "Corse", depts: ["2A", "2B"] },
  ge: { name: "Grand Est", depts: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"] },
  hdf: { name: "Hauts-de-France", depts: ["02", "59", "60", "62", "80"] },
  nor: { name: "Normandie", depts: ["14", "27", "50", "61", "76"] },
  na: { name: "Nouvelle-Aquitaine", depts: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"] },
  occ: { name: "Occitanie", depts: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"] },
  pdl: { name: "Pays de la Loire", depts: ["44", "49", "53", "72", "85"] },
  paca: { name: "Provence-Alpes-Cote d'Azur", depts: ["04", "05", "06", "13", "83", "84"] },
  dom: { name: "DOM-TOM", depts: ["971", "972", "973", "974", "976"] },
};

const faqData = [
  {
    question: "Quel est le prix moyen d'une carte grise en 2026 ?",
    answer: "Le prix moyen d'une carte grise en 2026 depend fortement de la puissance fiscale du vehicule et du departement d'immatriculation. Pour un vehicule de 5 chevaux fiscaux, le cout varie entre 150 euros dans les departements les moins chers (comme Mayotte a 30 euros/CV) et plus de 344 euros en Ile-de-France (68,95 euros/CV). A cela s'ajoutent les taxes fixes Y.4 (11 euros) et Y.5 (2,76 euros). En moyenne nationale, comptez environ 270 euros pour un vehicule de 5 CV.",
  },
  {
    question: "Comment calculer le prix de sa carte grise ?",
    answer: "Le prix de la carte grise se calcule en additionnant 5 taxes : Y.1 (taxe regionale = nombre de CV x tarif du cheval fiscal dans votre departement), Y.2 (taxe professionnelle, 0 euros pour les particuliers), Y.3 (malus ecologique base sur les emissions de CO2), Y.4 (taxe de gestion fixe de 11 euros) et Y.5 (redevance d'acheminement de 2,76 euros). Utilisez notre simulateur en ligne pour obtenir un calcul precis en quelques secondes.",
  },
  {
    question: "Quelles regions ont les tarifs les plus bas ?",
    answer: "En 2026, les regions les moins cheres pour le cheval fiscal sont les Hauts-de-France et Auvergne-Rhone-Alpes avec un tarif de 43 euros par cheval fiscal dans la plupart de leurs departements. La Corse propose un tarif intermediaire de 53 euros/CV. A l'inverse, l'Ile-de-France reste la region la plus chere avec 68,95 euros par cheval fiscal. Parmi les DOM-TOM, Mayotte propose le tarif le plus bas de France a 30 euros/CV.",
  },
  {
    question: "Les vehicules electriques sont-ils exoneres ?",
    answer: "Oui, les vehicules fonctionnant exclusivement a l'electricite ou a l'hydrogene beneficient d'une exoneration totale de la taxe regionale (Y.1) dans toutes les regions de France. Cette exoneration s'applique aussi bien aux voitures particulieres qu'aux utilitaires legers. Seules les taxes fixes Y.4 (11 euros) et Y.5 (2,76 euros) restent dues, soit un total de 13,76 euros seulement pour la carte grise d'un vehicule electrique.",
  },
  {
    question: "Qu'est-ce que le malus ecologique ?",
    answer: "Le malus ecologique (composante Y.3 de la carte grise) est une taxe supplementaire appliquee aux vehicules neufs emettant plus de 118 g/km de CO2. Son montant est progressif et peut atteindre jusqu'a 60 000 euros pour les vehicules les plus polluants. Il concerne uniquement les vehicules neufs ou importes. Les vehicules d'occasion immatricules en France en sont exoneres. Un malus au poids s'applique egalement pour les vehicules de plus de 1 600 kg.",
  },
  {
    question: "Le prix de la carte grise inclut-il les frais de service ?",
    answer: "Non, le prix officiel de la carte grise (certificat d'immatriculation) ne comprend que les taxes reversees a l'Etat et aux collectivites. Si vous faites appel a un service en ligne agree comme Discount Carte Grise, des frais de service s'ajoutent pour le traitement de votre dossier. Chez Discount Carte Grise, nous proposons une carte grise pas chere avec des frais de service parmi les plus bas du marche, a partir de 30 euros. Ces frais couvrent la verification de votre dossier, le traitement aupres de l'ANTS et l'envoi de votre carte grise.",
  },
  {
    question: "Peut-on payer sa carte grise en plusieurs fois ?",
    answer: "Chez Discount Carte Grise, nous proposons le paiement en plusieurs fois pour faciliter vos demarches d'immatriculation. Vous pouvez regler le montant total de votre carte grise (taxes + frais de service) en 3 ou 4 fois sans frais. Cette option est disponible directement lors du paiement en ligne sur notre plateforme.",
  },
  {
    question: "Quel est le delai pour recevoir sa carte grise ?",
    answer: "Avec Discount Carte Grise, votre dossier est traite sous 24h ouvrees apres reception de tous les documents requis. Vous recevez immediatement un certificat provisoire d'immatriculation (CPI) vous autorisant a circuler pendant 30 jours. La carte grise definitive est ensuite envoyee par l'Imprimerie Nationale a votre domicile sous 3 a 7 jours ouvres via courrier securise.",
  },
];

type SortKey = "dept" | "code" | "tarif";
type SortDir = "asc" | "desc";

const PrixCarteGrise = () => {
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const allDepts = useMemo(() => {
    const deptEntries = Object.entries(departementsTarifs).map(([code, tarif]) => ({
      code,
      name: departementsLabels[code] || code,
      tarif,
      region: Object.entries(regions).find(([, r]) => r.depts.includes(code))?.[1]?.name || "Autre",
      regionKey: Object.entries(regions).find(([, r]) => r.depts.includes(code))?.[0] || "other",
    }));
    return deptEntries;
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = selectedRegion === "all" ? allDepts : allDepts.filter((d) => d.regionKey === selectedRegion);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "code") cmp = a.code.localeCompare(b.code, undefined, { numeric: true });
      else if (sortKey === "dept") cmp = a.name.localeCompare(b.name);
      else cmp = a.tarif - b.tarif;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [allDepts, selectedRegion, sortKey, sortDir]);

  const cheapest = useMemo(() => [...allDepts].sort((a, b) => a.tarif - b.tarif).slice(0, 5), [allDepts]);
  const mostExpensive = useMemo(() => [...allDepts].sort((a, b) => b.tarif - a.tarif).slice(0, 5), [allDepts]);

  const schemas = [
    webPageSchema(
      "Prix de la Carte Grise en 2026 - Tarifs par Departement",
      "Decouvrez le prix de la carte grise en 2026 : tarif du cheval fiscal par departement, calcul des taxes, simulateur gratuit. Tous les tarifs actualises.",
      "https://discountcartegrise.fr/prix-carte-grise"
    ),
    breadcrumbSchema([
      { name: "Accueil", url: "https://discountcartegrise.fr/" },
      { name: "Prix Carte Grise 2026", url: "https://discountcartegrise.fr/prix-carte-grise" },
    ]),
    faqSchema(faqData),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prix Carte Grise 2026 | Tarifs du Cheval Fiscal par Departement"
        description="Consultez les tarifs du cheval fiscal 2026 par departement et calculez le prix de votre carte grise. Simulateur gratuit et tarifs officiels actualises."
        canonical="https://discountcartegrise.fr/prix-carte-grise"
        schema={schemas}
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Prix Carte Grise 2026</span>
        </nav>

        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Prix de la Carte Grise en 2026 - Tarifs par Departement
        </h1>

        {/* Introduction */}
        <div className="prose prose-lg max-w-none text-muted-foreground mb-12">
          <p>
            Le <strong>prix de la carte grise</strong> (certificat d'immatriculation) en 2026 varie considerablement selon votre departement de residence et les caracteristiques de votre vehicule. Que vous achetiez un vehicule neuf ou d'occasion, le cout de la carte grise represente une depense importante a anticiper. Avec Discount Carte Grise, beneficiez d'une <strong>carte grise pas chere</strong> au meilleur prix du marche.
          </p>
          <p>
            Le montant total de votre carte grise est determine par la formule officielle <strong>Y.1 + Y.2 + Y.3 + Y.4 + Y.5</strong>, ou chaque composante correspond a une taxe specifique. La taxe la plus importante est la <strong>taxe regionale (Y.1)</strong>, calculee en multipliant la puissance fiscale de votre vehicule (en chevaux fiscaux ou CV) par le tarif du cheval fiscal fixe par votre region. Ce tarif varie de 30 euros a Mayotte jusqu'a 68,95 euros en Ile-de-France, ce qui peut creer des ecarts significatifs sur le prix final de votre carte grise.
          </p>
          <p>
            En complement de la taxe regionale, d'autres composantes viennent s'ajouter : la taxe de gestion fixe de 11 euros (Y.4) et la redevance d'acheminement de 2,76 euros (Y.5), communes a tous les departements. Pour les vehicules neufs polluants, le malus ecologique (Y.3) peut considerablement alourdir la facture. Pour connaitre le prix exact de votre carte grise, nous vous invitons a utiliser notre <Link to="/simulateur" className="text-primary hover:underline font-semibold">simulateur de prix carte grise</Link> gratuit et immediat.
          </p>
          <p>
            Cette page vous presente en detail tous les tarifs du cheval fiscal par departement en 2026, le fonctionnement du calcul des taxes, ainsi que les exonerations et abattements dont vous pouvez beneficier. Toutes les informations sont actualisees pour l'annee 2026 et basees sur les deliberations des conseils regionaux.
          </p>
        </div>

        {/* Section: Comment est calcule le prix */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Calculator className="w-7 h-7 text-primary" />
            Comment est calcule le prix de la carte grise ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Le prix du certificat d'immatriculation est compose de cinq taxes distinctes. Voici le detail de chaque composante qui determine le montant total de votre carte grise en 2026.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.1</Badge>
                  Taxe regionale
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>C'est la composante principale du prix de la carte grise. Elle est calculee en multipliant le <strong>nombre de chevaux fiscaux (CV)</strong> du vehicule par le <strong>tarif unitaire du cheval fiscal</strong> fixe par chaque region. Par exemple, pour un vehicule de 6 CV en Ile-de-France : 6 x 68,95 = 413,70 euros. Les vehicules electriques beneficient d'une exoneration totale dans toutes les regions.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.2</Badge>
                  Taxe professionnelle
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Cette taxe concerne uniquement les <strong>vehicules utilitaires immatricules au nom d'une societe</strong>. Pour les particuliers, cette taxe est egale a <strong>0 euro</strong>. Pour les professionnels, elle est fonction du type de vehicule et de son PTAC (poids total autorise en charge).</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.3</Badge>
                  Taxe CO2 / Malus ecologique
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Le <strong>malus ecologique</strong> s'applique aux vehicules neufs emettant plus de 118 g/km de CO2. Son montant est progressif et peut atteindre 60 000 euros pour les vehicules les plus polluants. Un malus au poids s'ajoute pour les vehicules de plus de 1 600 kg. Les vehicules d'occasion immatricules en France en sont exoneres.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.4</Badge>
                  Taxe de gestion
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Taxe fixe de <strong>11 euros</strong> prelevee par l'Etat pour couvrir les frais de gestion et de traitement du dossier d'immatriculation. Elle est identique dans tous les departements et pour tous les types de vehicules. Elle est exoneree pour les cyclomoteurs et les vehicules de diplomates.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.5</Badge>
                  Redevance d'acheminement
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Frais fixes de <strong>2,76 euros</strong> correspondant a l'envoi securise du certificat d'immatriculation a votre domicile par l'Imprimerie Nationale. Ce montant est identique sur tout le territoire francais, y compris les DOM-TOM. Il couvre les frais d'impression et d'expedition du document.</p>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Euro className="w-5 h-5 text-primary" />
                  Formule totale
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">Prix total = Y.1 + Y.2 + Y.3 + Y.4 + Y.5</p>
                <p>Pour un particulier avec un vehicule d'occasion non polluant, le calcul se simplifie a : <strong>(CV x tarif regional) + 11 + 2,76 euros</strong>. Utilisez notre simulateur pour un calcul precis tenant compte de toutes les specificites de votre vehicule.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section: Tarifs par departement */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <MapPin className="w-7 h-7 text-primary" />
            Tarif du cheval fiscal par departement en 2026
          </h2>
          <p className="text-muted-foreground mb-6">
            Retrouvez ci-dessous le tarif du cheval fiscal pour chacun des 101 departements francais en 2026. Vous pouvez filtrer par region et trier les colonnes selon vos besoins. Les prix indiques pour 5 CV et 7 CV correspondent a la taxe regionale (Y.1) uniquement, hors taxes fixes.
          </p>

          {/* Region filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedRegion === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRegion("all")}
            >
              Tous les departements
            </Button>
            {Object.entries(regions).map(([key, region]) => (
              <Button
                key={key}
                variant={selectedRegion === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRegion(key)}
              >
                {region.name}
              </Button>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("dept")}>
                      <span className="flex items-center gap-1">Departement <ArrowUpDown className="w-4 h-4" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("code")}>
                      <span className="flex items-center gap-1">Code <ArrowUpDown className="w-4 h-4" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("tarif")}>
                      <span className="flex items-center gap-1 justify-end">Tarif/CV <ArrowUpDown className="w-4 h-4" /></span>
                    </TableHead>
                    <TableHead className="text-right">Prix 5 CV</TableHead>
                    <TableHead className="text-right">Prix 7 CV</TableHead>
                    <TableHead>Region</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSorted.map((dept) => (
                    <TableRow key={dept.code}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.code}</TableCell>
                      <TableCell className="text-right font-semibold">{dept.tarif.toFixed(2)} &euro;</TableCell>
                      <TableCell className="text-right">{(dept.tarif * 5).toFixed(2)} &euro;</TableCell>
                      <TableCell className="text-right">{(dept.tarif * 7).toFixed(2)} &euro;</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{dept.region}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <Info className="w-4 h-4 inline mr-1" />
            Les montants indiques pour 5 CV et 7 CV correspondent a la taxe regionale (Y.1) seule. Ajoutez 13,76 euros (Y.4 + Y.5) pour obtenir le prix total hors malus.
          </p>
        </section>

        {/* Section: Regions les plus cheres / moins cheres */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <TrendingDown className="w-7 h-7 text-primary" />
            Les regions les plus cheres et les moins cheres
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Les 5 departements les moins chers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cheapest.map((d, i) => (
                    <div key={d.code} className="flex justify-between items-center">
                      <span className="text-sm">
                        <span className="font-semibold">{i + 1}.</span> {d.name} ({d.code})
                      </span>
                      <Badge variant="secondary" className="font-semibold">{d.tarif.toFixed(2)} &euro;/CV</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Les 5 departements les plus chers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mostExpensive.map((d, i) => (
                    <div key={d.code} className="flex justify-between items-center">
                      <span className="text-sm">
                        <span className="font-semibold">{i + 1}.</span> {d.name} ({d.code})
                      </span>
                      <Badge variant="destructive" className="font-semibold">{d.tarif.toFixed(2)} &euro;/CV</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground mt-6">
            L'ecart entre le departement le moins cher et le plus cher est de <strong>{(mostExpensive[0].tarif - cheapest[0].tarif).toFixed(2)} euros par cheval fiscal</strong>. Pour un vehicule de 7 CV, cela represente une difference de <strong>{((mostExpensive[0].tarif - cheapest[0].tarif) * 7).toFixed(2)} euros</strong> sur la taxe regionale seule. C'est le departement de residence du titulaire de la carte grise qui determine le tarif applicable, et non le lieu d'achat du vehicule.
          </p>
        </section>

        {/* Section: CTA Simulateur */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Calculator className="w-7 h-7 text-primary" />
            Simulez le prix de votre carte grise
          </h2>
          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="py-8 text-center">
              <Car className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-3">
                Obtenez le meilleur prix pour votre carte grise en 30 secondes
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Notre simulateur gratuit prend en compte votre departement, la puissance fiscale, l'energie, la date de mise en circulation et le type de demarche pour vous donner un prix precis incluant toutes les taxes. Aucune inscription requise.
              </p>
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/simulateur">
                  <Calculator className="w-5 h-5 mr-2" />
                  Simuler le prix de ma carte grise
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Section: Abattement vehicules +10 ans */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <TrendingDown className="w-7 h-7 text-primary" />
            Abattement pour les vehicules de plus de 10 ans
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Si votre vehicule a plus de 10 ans (date de premiere mise en circulation), vous beneficiez d'un <strong>abattement de 50% sur la taxe regionale (Y.1)</strong>. Cette reduction est automatiquement appliquee lors du calcul du prix de votre carte grise. Elle a ete mise en place pour encourager la circulation des vehicules anciens et alleger le cout d'immatriculation pour les acheteurs de voitures d'occasion.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Exemple concret :</strong> pour un vehicule de 7 CV immatricule en Ile-de-France (68,95 euros/CV), la taxe regionale serait normalement de 482,65 euros. Avec l'abattement pour un vehicule de plus de 10 ans, elle passe a <strong>241,33 euros</strong>, soit une economie de plus de 240 euros.
              </p>
              <p className="text-muted-foreground">
                Cet abattement s'applique egalement aux vehicules de collection et aux vehicules importes dont la date de premiere immatriculation depasse 10 ans. Il est cumulable avec les exonerations regionales pour certains types de vehicules propres.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            Questions frequentes sur le prix de la carte grise
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Internal links */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Liens utiles</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <Link to="/simulateur" className="flex items-center gap-3 text-primary hover:underline font-medium">
                  <Calculator className="w-5 h-5" />
                  Simulateur de prix carte grise
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <Link to="/demarche-simple" className="flex items-center gap-3 text-primary hover:underline font-medium">
                  <Car className="w-5 h-5" />
                  Commander ma carte grise
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <Link to="/recherche-suivi" className="flex items-center gap-3 text-primary hover:underline font-medium">
                  <Info className="w-5 h-5" />
                  Suivre ma commande
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrixCarteGrise;
