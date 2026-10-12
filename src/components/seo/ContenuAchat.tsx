// Le contenu de référence sur la déclaration d'achat.
//
// La page vivait sur le gabarit générique des démarches : six écrans courts,
// sept questions, aucun tableau. Elle récolte 1 804 impressions sur seize mois
// pour TROIS clics, en positions 23 à 66 — et ces requêtes sont presque toutes
// professionnelles, c'est-à-dire le canal qui fait 95 % de l'activité.
//
// Ce qui lui manquait : la comparaison avec les deux démarches qu'on lui
// confond, ce qu'un garage a le droit de faire du véhicule une fois la
// déclaration passée, et ce qu'il risque à ne pas la faire.
//
// Même règle que ContenuCession : le texte vient du module de données, pour
// que le visiteur et le robot lisent exactement la même chose.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GitCompareArrows, Info } from "lucide-react";
import { COMPARATIF, REPERES_ACHAT } from "@/data/achatReperes";

export function ContenuAchat() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <GitCompareArrows className="w-7 h-7 text-primary" />
          Achat, cession, changement de titulaire
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Les trois se confondent et ne font pas la même chose. Celle qui vous concerne dépend de ce
          que vous faites du véhicule : le revendre, ou le garder.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]"></TableHead>
                  <TableHead className="min-w-[170px]">Déclaration d'achat</TableHead>
                  <TableHead className="min-w-[170px]">Déclaration de cession</TableHead>
                  <TableHead className="min-w-[170px]">Changement de titulaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARATIF.map((l) => (
                  <TableRow key={l.critere}>
                    <TableCell className="font-medium align-top">{l.critere}</TableCell>
                    <TableCell className="align-top text-primary font-medium">{l.achat}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{l.cession}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{l.titulaire}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_ACHAT.map((r) => (
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
    </div>
  );
}
