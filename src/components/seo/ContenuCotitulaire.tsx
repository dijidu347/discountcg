// Le contenu de référence sur le cotitulaire.
//
// Le fait remarquable de cette page était écrit dans son paragraphe « Tarif »
// et noyé dedans : le lien avec la personne qu'on ajoute ou qu'on retire
// décide du prix, et l'écart va de 13,76 € à plusieurs centaines d'euros.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Info } from "lucide-react";
import { SELON_LE_LIEN, REPERES_COTITULAIRE } from "@/data/cotitulaireReperes";

export function ContenuCotitulaire() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          Le prix dépend de qui vous ajoutez ou retirez
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Montants sur un véhicule de 6 chevaux fiscaux, hors nos frais de dossier.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[330px]">La personne concernée</TableHead>
                  <TableHead className="min-w-[200px]">Taxe régionale</TableHead>
                  <TableHead className="min-w-[230px]">Total des taxes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SELON_LE_LIEN.map((l) => (
                  <TableRow key={l.qui}>
                    <TableCell className="font-medium align-top">{l.qui}</TableCell>
                    <TableCell className="align-top">{l.taxeRegionale}</TableCell>
                    <TableCell className="align-top font-medium">{l.total6cv}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2">
        {REPERES_COTITULAIRE.map((r) => (
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
