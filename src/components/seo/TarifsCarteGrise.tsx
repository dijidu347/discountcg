// Le contenu de référence sur le prix de la carte grise : les cinq taxes, le
// tarif du cheval fiscal des 101 départements, l'abattement des véhicules de
// plus de dix ans.
//
// Il vivait sur une page à part, /prix-carte-grise, qui n'avait que deux liens
// internes et ne recevait aucun trafic, pendant que /simulateur portait l'outil
// sans le contenu. Les deux se disputaient les mêmes requêtes. Tout est
// désormais sur /simulateur, et ce composant est ce qui a été rapatrié.

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { departementsTarifs, departementsLabels } from "@/data/departementsTarifs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Euro, MapPin, Car, TrendingDown, Info, HelpCircle, ArrowUpDown, ChevronRight } from "lucide-react";

const regions: Record<string, { name: string; depts: string[] }> = {
  idf: { name: "Île-de-France", depts: ["75", "77", "78", "91", "92", "93", "94", "95"] },
  ara: { name: "Auvergne-Rhône-Alpes", depts: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"] },
  bfc: { name: "Bourgogne-Franche-Comté", depts: ["21", "25", "39", "58", "70", "71", "89", "90"] },
  bre: { name: "Bretagne", depts: ["22", "29", "35", "56"] },
  cvl: { name: "Centre-Val de Loire", depts: ["18", "28", "36", "37", "41", "45"] },
  cor: { name: "Corse", depts: ["2A", "2B"] },
  ge: { name: "Grand Est", depts: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"] },
  hdf: { name: "Hauts-de-France", depts: ["02", "59", "60", "62", "80"] },
  nor: { name: "Normandie", depts: ["14", "27", "50", "61", "76"] },
  na: { name: "Nouvelle-Aquitaine", depts: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"] },
  occ: { name: "Occitanie", depts: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"] },
  pdl: { name: "Pays de la Loire", depts: ["44", "49", "53", "72", "85"] },
  paca: { name: "Provence-Alpes-Côte d'Azur", depts: ["04", "05", "06", "13", "83", "84"] },
  dom: { name: "DOM-TOM", depts: ["971", "972", "973", "974", "976"] },
};

export const faqService = [
  { question: "Le simulateur est-il gratuit ?", answer: "Oui, et sans inscription. Le résultat s'affiche immédiatement, taxes comprises." },
  { question: "Les tarifs sont-ils à jour ?", answer: "Oui. Ce sont les tarifs 2026 votés par les conseils régionaux, et c'est la même table qui alimente le simulateur et le tableau ci-dessus." },
  { question: "Quels frais de dossier appliquez-vous ?", answer: "Ils commencent à 30 €, parmi les plus bas du marché pour un service agréé par l'État. Ils s'ajoutent aux taxes, qui vont à l'État et aux collectivités." },
];

export const faqTarifs = [
  {
    question: "Quel est le prix moyen d'une carte grise en 2026 ?",
    answer: "Il dépend surtout de la puissance fiscale du véhicule et du département du titulaire. Pour 5 chevaux fiscaux, la taxe régionale va de 150 € à Mayotte (30 €/CV) à 344,75 € en Île-de-France (68,95 €/CV). S'y ajoutent les taxes fixes Y.4 (11 €) et Y.5 (2,76 €). Comptez environ 270 € en moyenne nationale pour un véhicule de 5 CV.",
  },
  {
    question: "Comment calculer le prix de sa carte grise ?",
    answer: "En additionnant cinq taxes : Y.1, la taxe régionale, soit le nombre de chevaux fiscaux multiplié par le tarif de votre département ; Y.2, la taxe professionnelle, nulle pour un particulier ; Y.3, le malus écologique, assis sur les émissions de CO₂ ; Y.4, la taxe de gestion, 11 € ; et Y.5, la redevance d'acheminement, 2,76 €. Notre simulateur fait le calcul en quelques secondes.",
  },
  {
    question: "Quelles régions ont les tarifs les plus bas ?",
    answer: "En 2026, les Hauts-de-France et l'Auvergne-Rhône-Alpes restent les moins chères, à 43 € le cheval fiscal dans la plupart de leurs départements. La Corse se situe à 53 €/CV. À l'inverse, l'Île-de-France est la plus chère, à 68,95 €. Le tarif le plus bas de France est celui de Mayotte, à 30 €/CV.",
  },
  {
    question: "Les véhicules électriques sont-ils exonérés ?",
    answer: "Oui. Un véhicule qui roule exclusivement à l'électricité ou à l'hydrogène est exonéré de la totalité de la taxe régionale (Y.1), dans toutes les régions, voiture particulière comme utilitaire léger. Ne restent dues que les taxes fixes Y.4 et Y.5, soit 13,76 € en tout.",
  },
  {
    question: "Qu'est-ce que le malus écologique ?",
    answer: "C'est la composante Y.3 : une taxe qui frappe les véhicules neufs émettant plus de 118 g/km de CO₂. Son montant est progressif et peut atteindre 60 000 € pour les plus polluants. Elle ne vise que le neuf et l'importation ; un véhicule d'occasion déjà immatriculé en France en est exonéré. Un malus au poids s'y ajoute au-delà de 1 600 kg.",
  },
  {
    question: "Le prix de la carte grise inclut-il les frais de service ?",
    answer: "Non. Le prix officiel du certificat d'immatriculation ne comprend que les taxes reversées à l'État et aux collectivités. Passer par un service agréé ajoute des frais de dossier, qui couvrent la vérification des pièces, le traitement auprès de l'ANTS et l'envoi du titre. Chez Discount Carte Grise, ils commencent à 30 €.",
  },
  {
    question: "Peut-on payer sa carte grise en plusieurs fois ?",
    answer: "Oui, le montant total — taxes et frais de dossier — se règle en trois ou quatre fois sans frais. L'option se choisit au moment du paiement en ligne.",
  },
  {
    question: "Quel est le délai pour recevoir sa carte grise ?",
    answer: "Le dossier est traité sous 24 h ouvrées une fois toutes les pièces reçues. Vous recevez aussitôt un certificat provisoire d'immatriculation, qui autorise à circuler 30 jours. Le titre définitif est ensuite expédié par l'Imprimerie Nationale sous 3 à 7 jours ouvrés, en courrier sécurisé.",
  },
];

type SortKey = "dept" | "code" | "tarif";
type SortDir = "asc" | "desc";

export function TarifsCarteGrise() {
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

  return (
    <div className="container mx-auto px-4 pb-16">
        {/* Section: Comment est calcule le prix */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Calculator className="w-7 h-7 text-primary" />
            Comment est calculé le prix de la carte grise ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Le prix du certificat d'immatriculation se décompose en cinq taxes. Voici ce que recouvre chacune, et laquelle pèse vraiment.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.1</Badge>
                  Taxe régionale
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>C'est elle qui fait le prix. On multiplie le <strong>nombre de chevaux fiscaux</strong> du véhicule par le <strong>tarif du cheval fiscal</strong> voté par la région. Pour 6 CV en Île-de-France : 6 × 68,95 = 413,70 €. Les véhicules électriques en sont totalement exonérés, partout.</p>
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
                <p>Elle ne vise que les <strong>véhicules utilitaires immatriculés au nom d'une société</strong>. Pour un particulier, elle vaut <strong>0 €</strong>. Pour une entreprise, elle dépend du genre du véhicule et de son poids total autorisé en charge.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="default" className="text-sm">Y.3</Badge>
                  Taxe CO₂ et malus écologique
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Le <strong>malus écologique</strong> frappe les véhicules neufs au-delà de 118 g/km de CO₂. Il est progressif et peut atteindre 60 000 € sur les plus polluants. Un malus au poids s'y ajoute au-delà de 1 600 kg. Un véhicule d'occasion déjà immatriculé en France n'y est pas soumis.</p>
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
                <p>Un montant fixe de <strong>11 €</strong> prélevé par l'État pour le traitement du dossier. Identique dans tous les départements et pour tous les genres de véhicules. Les cyclomoteurs et les véhicules diplomatiques en sont dispensés.</p>
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
                <p><strong>2,76 €</strong> pour l'impression du titre et son envoi en courrier sécurisé par l'Imprimerie Nationale. Le montant est le même partout, outre-mer compris.</p>
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
                <p>Pour un particulier qui achète une occasion, tout se résume à : <strong>(CV × tarif du département) + 13,76 €</strong>. Le simulateur, lui, tient compte de l'âge du véhicule, de l'énergie et du genre.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section: Tarifs par departement */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <MapPin className="w-7 h-7 text-primary" />
            Tarif du cheval fiscal par département en 2026
          </h2>
          <p className="text-muted-foreground mb-6">
            Le tarif du cheval fiscal des 101 départements en 2026. Filtrez par région, triez les colonnes. Les colonnes 5 CV et 7 CV donnent la taxe régionale seule, hors taxes fixes.
          </p>

          {/* Region filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedRegion === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRegion("all")}
            >
              Tous les départements
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
                      <span className="flex items-center gap-1">Département <ArrowUpDown className="w-4 h-4" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("code")}>
                      <span className="flex items-center gap-1">Code <ArrowUpDown className="w-4 h-4" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("tarif")}>
                      <span className="flex items-center gap-1 justify-end">Tarif/CV <ArrowUpDown className="w-4 h-4" /></span>
                    </TableHead>
                    <TableHead className="text-right">Prix 5 CV</TableHead>
                    <TableHead className="text-right">Prix 7 CV</TableHead>
                    <TableHead>Région</TableHead>
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
            Ces montants sont la taxe régionale (Y.1) seule. Ajoutez 13,76 € (Y.4 + Y.5) pour le prix total, hors malus.
          </p>
        </section>

        {/* Section: Regions les plus cheres / moins cheres */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <TrendingDown className="w-7 h-7 text-primary" />
            Les départements les plus chers et les moins chers
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Les 5 départements les moins chers
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
                  Les 5 départements les plus chers
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
            Entre le département le moins cher et le plus cher, l'écart est de <strong>{(mostExpensive[0].tarif - cheapest[0].tarif).toFixed(2)} € par cheval fiscal</strong> — soit <strong>{((mostExpensive[0].tarif - cheapest[0].tarif) * 7).toFixed(2)} €</strong> sur un véhicule de 7 CV. Un point que beaucoup ignorent : c'est l'adresse du titulaire qui fixe le tarif, pas le lieu d'achat du véhicule.
          </p>
        </section>

        {/* Section: Abattement vehicules +10 ans */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <TrendingDown className="w-7 h-7 text-primary" />
            Abattement pour les véhicules de plus de 10 ans
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Passé dix ans de date de première mise en circulation, la <strong>taxe régionale (Y.1) est réduite de moitié</strong>. L'abattement s'applique tout seul, sans démarche : notre simulateur le déduit dès qu'il lit la date du véhicule.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Un exemple.</strong> Un 7 CV immatriculé en Île-de-France, à 68,95 €/CV : la taxe régionale serait de 482,65 €. Le véhicule a plus de dix ans, elle tombe à <strong>241,33 €</strong>. Plus de 240 € d'économie sur une seule ligne.
              </p>
              <p className="text-muted-foreground">
                L'abattement vaut aussi pour les véhicules de collection et pour un véhicule importé dont la première immatriculation remonte à plus de dix ans. Il se cumule avec les exonérations régionales accordées à certaines énergies.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            Questions fréquentes sur le prix de la carte grise
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {[...faqTarifs, ...faqService].map((faq, index) => (
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
          <div className="grid md:grid-cols-2 gap-4">
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
    </div>
  );
}
