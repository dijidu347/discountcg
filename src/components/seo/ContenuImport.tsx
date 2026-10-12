// Le contenu de référence du parcours d'import : WW provisoire, puis
// immatriculation définitive.
//
// Les deux pages racontent la même histoire par les deux bouts, et il leur
// manquait à toutes les deux le fait qui décide : la taxe régionale réglée au
// WW est déduite de celle de la définitive. On ne la paie pas deux fois.
//
// Un seul composant pour les deux pages, pour qu'elles ne divergent pas.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Route, Info, ChevronRight } from "lucide-react";
import { ETAPES_IMPORTATION, REPERES_IMPORT } from "@/data/importReperes";

export function ContenuImport({ depuis }: { depuis: "ww" | "definitive" }) {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Route className="w-7 h-7 text-primary" />
          Ce que vous payez à chaque étape
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Importer un véhicule se fait en trois temps. Le montant total ne dépend pas du nombre
          d'étapes : la taxe régionale n'est due qu'une fois.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Étape</TableHead>
                  <TableHead className="min-w-[300px]">Ce que vous payez</TableHead>
                  <TableHead className="min-w-[280px]">Ce que vous obtenez</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ETAPES_IMPORTATION.map((e) => (
                  <TableRow key={e.etape}>
                    <TableCell className="font-medium align-top">{e.etape}</TableCell>
                    <TableCell className="align-top">{e.paye}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{e.obtient}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_IMPORT.map((r) => (
          <Card key={r.titre}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                {r.titre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{r.texte}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-5">
            <Link
              to={depuis === "ww" ? "/immatriculation-definitive" : "/immatriculation-ww-provisoire"}
              className="flex items-center gap-3 text-primary hover:underline font-medium"
            >
              {depuis === "ww"
                ? "L'étape suivante : passer du WW à la carte grise définitive"
                : "L'étape précédente : obtenir le certificat provisoire WW"}
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
