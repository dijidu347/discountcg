// Le contenu de référence sur la modification de carte grise.
//
// Le lecteur arrive avec une question unique et pratique : « j'ai fait tel
// changement sur mon véhicule, qu'est-ce qu'on va me demander ? » La réponse
// était dispersée dans sept questions ; elle se range en tableau.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Info } from "lucide-react";
import { SELON_LA_MODIFICATION, REPERES_MODIFICATION } from "@/data/modificationReperes";

export function ContenuModification() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Wrench className="w-7 h-7 text-primary" />
          Ce qu'on vous demandera, selon la modification
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[280px]">Votre modification</TableHead>
                  <TableHead className="min-w-[250px]">La preuve exigée</TableHead>
                  <TableHead className="min-w-[220px]">Délivrée par</TableHead>
                  <TableHead className="min-w-[140px]">Délai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SELON_LA_MODIFICATION.map((l) => (
                  <TableRow key={l.modification}>
                    <TableCell className="font-medium align-top">{l.modification}</TableCell>
                    <TableCell className="align-top">{l.preuve}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{l.delivrePar}</TableCell>
                    <TableCell className="align-top text-primary font-medium">{l.delai}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_MODIFICATION.map((r) => (
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
