// Le contenu de référence sur l'immatriculation d'un cyclomoteur.
//
// 744 impressions pour zéro clic, en positions 38 à 56 : le pire rendement du
// site. La page disait l'essentiel mais pas les deux faits qu'on cherche — le
// prix unique de 11 € partout en France, et la sortie quand le certificat de
// conformité est introuvable, qui est l'attestation de la FFVE.
//
// Pas la fiche d'identification du véhicule : elle relève ce qui figure au
// fichier national pour un véhicule DÉJÀ immatriculé. Un cyclomoteur qui n'a
// jamais été immatriculé n'y figure pas.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bike, Info } from "lucide-react";
import { CAS_CYCLO, REPERES_CYCLO } from "@/data/cycloReperes";

export function ContenuCyclo() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Bike className="w-7 h-7 text-primary" />
          Trois situations, et une seule qui bloque
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Votre cyclomoteur</TableHead>
                  <TableHead className="min-w-[260px]">La pièce qui compte</TableHead>
                  <TableHead className="min-w-[200px]">La difficulté</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAS_CYCLO.map((c) => (
                  <TableRow key={c.situation}>
                    <TableCell className="font-medium align-top">{c.situation}</TableCell>
                    <TableCell className="align-top">{c.piecePrincipale}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.difficulte}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_CYCLO.map((r) => (
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
