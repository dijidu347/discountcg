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
import { calculatePrice } from "@/utils/calculatePrice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Euro, MapPin, Car, TrendingDown, Info, HelpCircle, ArrowUpDown, ChevronRight, FileText, ShieldCheck } from "lucide-react";

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

export // Trois départements qui encadrent la France : le moins cher, le plus répandu,
// le plus cher. Les prix affichés sortent de calculatePrice, celle qu'utilise
// le simulateur.
const REPERES = [
  { code: "976", libelle: "Mayotte" },
  { code: "59", libelle: "Nord" },
  { code: "75", libelle: "Paris" },
];

// Un véhicule de moins de dix ans, pour que l'abattement ne brouille pas la
// lecture du tableau par puissance.
const RECENT = "2022-01-01";

// Les départements les plus souvent cherchés, avec leur tarif réel.
const DEPARTEMENTS_COURANTS = ["59", "13", "69", "75", "33", "29", "44", "31"];

// Un cas commun, décliné par genre : 6 CV dans un département à 43 €.
const EXEMPLE_GENRES = [
  { genre: "VP", libelle: "Voiture particulière", note: "Plein tarif" },
  { genre: "CTTE", libelle: "Camionnette (utilitaire)", note: "Plein tarif + 34 € de taxe transport" },
  { genre: "MTT1", libelle: "Moto, scooter plus de 50 cm³", note: "Taxe régionale divisée par deux" },
  { genre: "CL", libelle: "Cyclomoteur, scooter 50 cm³", note: "Exonéré de taxe régionale et d'acheminement" },
  { genre: "REM", libelle: "Remorque", note: "Exonérée de taxe régionale" },
];

export const faqService = [
  { question: "Combien coûte une carte grise en moyenne ?", answer: "Pour une voiture particulière de 6 CV de moins de dix ans, comptez 271,76 € dans un département à 43 € le cheval fiscal, et 427,76 € à Paris. Le même véhicule passé dix ans de mise en circulation voit sa taxe régionale divisée par deux." },
  { question: "Pourquoi le prix change-t-il d'un département à l'autre ?", answer: "Parce que le tarif du cheval fiscal est voté par chaque conseil régional. Il va de 30 € à Mayotte à 68,95 € en Île-de-France. C'est l'adresse du titulaire qui compte, pas le lieu d'achat du véhicule." },
  { question: "Le simulateur donne-t-il le même prix que celui de l'ANTS ?", answer: "La taxe régionale, oui : les règles sont les mêmes. Notre simulateur y ajoute les frais de dossier, que le simulateur officiel ne chiffre pas, et lit les caractéristiques du véhicule depuis la plaque au lieu de vous les faire saisir." },
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

  const parPuissance = useMemo(
    () =>
      [3, 4, 5, 6, 7, 8, 10].map((cv) => ({
        cv,
        prix: REPERES.map((r) => ({
          code: r.code,
          total: calculatePrice(departementsTarifs[r.code], cv, RECENT, "VP").prixTotal,
        })),
      })),
    [],
  );

  const parDepartement = useMemo(
    () =>
      DEPARTEMENTS_COURANTS.map((code) => ({
        code,
        nom: departementsLabels[code] || code,
        tarif: departementsTarifs[code],
        six: calculatePrice(departementsTarifs[code], 6, RECENT, "VP").prixTotal,
      })),
    [],
  );

  const parGenre = useMemo(
    () =>
      EXEMPLE_GENRES.map((g) => {
        const calcul = calculatePrice(43, 6, RECENT, g.genre);
        return { ...g, total: calcul.prixTotal, regionale: calcul.prixCV };
      }),
    [],
  );

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
                <p>Elle ne vise qu'un genre précis : la <strong>camionnette (CTTE)</strong> de 3,5 tonnes au plus, portée case J.1 de la carte grise. Son montant est de <strong>34 €</strong>. Une voiture particulière, une moto, une remorque : zéro.</p>
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
                <p>Un montant fixe de <strong>11 €</strong> prélevé par l'État pour le traitement du dossier. Identique dans tous les départements et pour tous les genres de véhicules, cyclomoteurs compris — c'est même la seule taxe que paie un 50 cm³.</p>
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
          <p className="text-sm text-muted-foreground mt-2">
            Ces 101 tarifs ont été comparés aux{" "}
            <a
              href="https://www.data.gouv.fr/datasets/simulateur-de-cout-du-certificat-dimmatriculation-carte-grise"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              données de référence du simulateur officiel
            </a>
            , publiées par la DILA : ils correspondent, sans écart.
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

        {/* Section: prix par puissance fiscale */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Euro className="w-7 h-7 text-primary" />
            Combien coûte une carte grise de 5, 7 ou 10 CV ?
          </h2>
          <p className="text-muted-foreground mb-6">
            Les montants ci-dessous sont des prix complets, taxes fixes incluses, pour une voiture
            particulière de moins de dix ans. Ils sortent du même calcul que le simulateur : trois
            départements qui encadrent la France, du moins cher au plus cher.
          </p>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Puissance fiscale</TableHead>
                    {REPERES.map((r) => (
                      <TableHead key={r.code} className="text-right">
                        {r.libelle} ({departementsTarifs[r.code].toFixed(2)} &euro;/CV)
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parPuissance.map((ligne) => (
                    <TableRow key={ligne.cv}>
                      <TableCell className="font-medium">{ligne.cv} CV</TableCell>
                      {ligne.prix.map((p) => (
                        <TableCell key={p.code} className="text-right font-semibold">
                          {p.total.toFixed(2)} &euro;
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <Info className="w-4 h-4 inline mr-1" />
            Au-delà de dix ans de mise en circulation, divisez la taxe régionale par deux : un 7 CV
            parisien passe de {parPuissance.find((l) => l.cv === 7)!.prix[2].total.toFixed(2)} &euro; à{" "}
            {calculatePrice(departementsTarifs["75"], 7, "2010-01-01", "VP").prixTotal.toFixed(2)} &euro;.
          </p>
        </section>

        {/* Section: prix par type de vehicule */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Car className="w-7 h-7 text-primary" />
            Prix de la carte grise selon le type de véhicule
          </h2>
          <p className="text-muted-foreground mb-6">
            Le genre inscrit case J.1 de la carte grise change tout. Un scooter 50 cm³ ne paie
            ni taxe régionale ni acheminement : il lui reste 11 €. Une moto paie la moitié de la
            taxe régionale. Voici ce que donne un même véhicule de 6 CV dans un département à
            43 € le cheval fiscal.
          </p>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type de véhicule</TableHead>
                    <TableHead>Règle appliquée</TableHead>
                    <TableHead className="text-right">Taxe régionale</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parGenre.map((g) => (
                    <TableRow key={g.genre}>
                      <TableCell className="font-medium">{g.libelle}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.note}</TableCell>
                      <TableCell className="text-right">{g.regionale.toFixed(2)} &euro;</TableCell>
                      <TableCell className="text-right font-semibold">{g.total.toFixed(2)} &euro;</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <Info className="w-4 h-4 inline mr-1" />
            Les tracteurs et le matériel agricole suivent la même règle que les remorques : exonérés
            de taxe régionale.
          </p>
        </section>

        {/* Section: demarches annexes */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Info className="w-7 h-7 text-primary" />
            Duplicata, changement d'adresse : les démarches à prix fixe
          </h2>
          <p className="text-muted-foreground mb-6">
            Toutes les démarches ne refont pas le calcul complet. Certaines ne portent que les taxes
            fixes, quel que soit le véhicule et le département.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Duplicata</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-2xl font-bold text-foreground mb-2">13,76 &euro;</p>
                <p>Carte grise perdue, volée ou abîmée. Taxe de gestion et acheminement, rien d'autre : la taxe régionale a déjà été payée.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Changement d'adresse</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-2xl font-bold text-foreground mb-2">2,76 &euro;</p>
                <p>Un déménagement ne redéclenche pas la taxe régionale, même vers un département plus cher. Seul l'acheminement du titre est dû.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Certificat provisoire WW</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-2xl font-bold text-foreground mb-2">11 &euro;</p>
                <p>Aucun titre n'est expédié, donc pas d'acheminement : la taxe de gestion seule.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section: prix dans les departements les plus demandes */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <MapPin className="w-7 h-7 text-primary" />
            Le prix de la carte grise dans les principaux départements
          </h2>
          <p className="text-muted-foreground mb-6">
            Le même véhicule de 6 CV, immatriculé dans huit départements parmi les plus peuplés.
            Entre le Nord et Paris,{" "}
            {(parDepartement.find((d) => d.code === "75")!.six - parDepartement.find((d) => d.code === "59")!.six).toFixed(2)}{" "}
            &euro; d'écart pour la même voiture — seule l'adresse du titulaire change.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {parDepartement.map((d) => (
              <Card key={d.code}>
                <CardContent className="py-4">
                  <p className="font-semibold text-foreground">
                    {d.nom} <span className="text-muted-foreground font-normal">({d.code})</span>
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">{d.six.toFixed(2)} &euro;</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {d.tarif.toFixed(2)} &euro; le cheval fiscal, pour un 6 CV de moins de dix ans
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Section: le simulateur officiel et le notre */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Calculator className="w-7 h-7 text-primary" />
            Simulateur de l'ANTS ou simulateur en ligne : lequel utiliser ?
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              L'ANTS, qui gère l'immatriculation en France, met à disposition un simulateur officiel.
              Il donne le montant des taxes, et c'est tout ce qu'il a à donner : il ne facture rien
              et ne traite pas de dossier. Si vous cherchez uniquement le montant dû à l'État, il
              fait le travail.
            </p>
            <p>
              Le nôtre part de votre <strong>plaque d'immatriculation</strong> : la puissance
              fiscale, l'énergie, le genre et la date de mise en circulation sont lus dans le fichier
              national, vous n'avez rien à recopier de votre carte grise. Il applique ensuite les
              mêmes règles — demi-tarif au-delà de dix ans, exonérations par genre, taxe utilitaire —
              et ajoute ce que l'ANTS ne chiffre pas : nos frais de dossier, pour que le total
              affiché soit celui que vous paierez vraiment.
            </p>
            <p>
              Les deux doivent tomber sur la même taxe régionale. S'ils divergent, c'est en général
              que la puissance fiscale saisie à la main n'est pas celle de la case P.6.
            </p>
          </div>
        </section>

        {/* Section: ce qui est gratuit */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Info className="w-7 h-7 text-primary" />
            Une carte grise en ligne gratuite, est-ce que ça existe ?
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              La <strong>simulation</strong> est gratuite, ici comme chez l'ANTS : connaître le prix
              de sa carte grise ne coûte rien, sans inscription ni carte bancaire.
            </p>
            <p>
              La <strong>carte grise elle-même</strong>, non. Les taxes vont à l'État et aux
              collectivités : aucun service, officiel ou privé, ne peut les effacer. Un site qui
              annonce une carte grise gratuite parle en réalité de la simulation, ou de la démarche
              sur le site de l'ANTS — où vous payez les mêmes taxes, en faisant le dossier vous-même.
            </p>
            <p>
              Ce qui change d'un prestataire à l'autre, ce sont les <strong>frais de dossier</strong>,
              qui s'ajoutent aux taxes. Les nôtres commencent à 30 €, et ils couvrent la vérification
              des pièces, le dépôt auprès de l'ANTS et l'envoi du titre. Il n'y a que là qu'il y a
              une comparaison à faire — les taxes, elles, sont les mêmes partout.
            </p>
          </div>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                {/* Celui qui calcule le prix d'une carte grise vient souvent
                    d'acheter : le vendeur, lui, a une cession à déclarer. */}
                <Link to="/declaration-cession" className="flex items-center gap-3 text-primary hover:underline font-medium">
                  <FileText className="w-5 h-5" />
                  Certificat de cession
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
                {/* Le non-gage est exige sur toute carte grise : la page dit
                    comment l'obtenir gratuitement et comment le lire. */}
                <Link to="/certificat-de-non-gage" className="flex items-center gap-3 text-primary hover:underline font-medium">
                  <ShieldCheck className="w-5 h-5" />
                  Certificat de non-gage
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
