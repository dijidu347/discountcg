// Le contenu de référence sur le quitus fiscal et le certificat 846 A.
//
// 2 374 impressions pour huit clics, mais en positions 9 à 13 : la seule
// famille du site où la visibilité est déjà acquise. Sur ces impressions,
// 2 032 portent sur le 846 A et 342 seulement sur le quitus — alors que le
// titre de la page commençait par « Quitus fiscal ».
//
// Ce que la page expliquait très bien en prose, elle le montre maintenant en
// tableau : d'où vient le véhicule décide du document, et c'est toute la
// confusion. Et comme le 846 A vient de la douane — nous ne le vendons pas —,
// la page montre la suite du parcours, qui est, elle, de notre ressort.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Route, Info } from "lucide-react";
import { SELON_L_ORIGINE, PARCOURS_IMPORT, REPERES_QUITUS } from "@/data/quitusReperes";

export function ContenuQuitus() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Globe className="w-7 h-7 text-primary" />
          Quitus ou 846 A : d'où vient le véhicule décide
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          C'est la confusion la plus répandue, et elle fait perdre des semaines : les deux documents
          n'ont ni le même objet, ni le même guichet.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Le véhicule vient de</TableHead>
                  <TableHead className="min-w-[200px]">Le justificatif</TableHead>
                  <TableHead className="min-w-[200px]">Délivré par</TableHead>
                  <TableHead className="min-w-[220px]">La TVA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SELON_L_ORIGINE.map((c) => (
                  <TableRow key={c.origine}>
                    <TableCell className="font-medium align-top">{c.origine}</TableCell>
                    <TableCell className="align-top text-primary font-medium">{c.justificatif}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.delivrePar}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.tva}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Route className="w-7 h-7 text-primary" />
          Importer un véhicule, du justificatif à la carte grise
        </h2>
        <ol className="space-y-4">
          {PARCOURS_IMPORT.map((e, i) => (
            <li key={e.etape} className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-foreground">{e.etape}</p>
                <p className="text-sm text-muted-foreground">
                  {e.quand} · {e.chezQui}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-6">
        {REPERES_QUITUS.map((r) => (
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
