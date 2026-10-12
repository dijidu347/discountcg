// Le contenu de référence sur la carte grise après un décès.
//
// 903 impressions pour un seul clic, en positions 15 à 30. Le vocabulaire de
// la page était déjà le bon — « décès » y figure trente-trois fois. Ce qui
// manquait, c'est la réponse à la question que ces gens posent vraiment : ce
// que ça coûte. Deux requêtes la portent explicitement, dont une en 9e place.
//
// Or la réponse est spectaculaire et n'apparaissait nulle part en évidence :
// le conjoint survivant ne paie pas la taxe régionale. 13,76 € au lieu de
// 427,46 € sur un 6 CV en Île-de-France. Le mot « conjoint » apparaissait une
// seule fois dans toute la page.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Euro, FileCheck, Info } from "lucide-react";
import { SELON_L_HERITIER, PREUVES_QUALITE, REPERES_SUCCESSION } from "@/data/successionReperes";

export function ContenuSuccession() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Euro className="w-7 h-7 text-primary" />
          Ce que vous paierez, selon qui hérite
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          L'écart est considérable, et il ne dépend ni du véhicule ni du département : il dépend du
          lien avec le défunt. Montants calculés sur un véhicule de 6 chevaux fiscaux, hors nos
          frais de dossier.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[230px]">Qui hérite du véhicule</TableHead>
                  <TableHead className="min-w-[150px]">Taxe régionale</TableHead>
                  <TableHead className="min-w-[110px]">Dans le Rhône</TableHead>
                  <TableHead className="min-w-[130px]">En Île-de-France</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SELON_L_HERITIER.map((l) => (
                  <TableRow key={l.qui}>
                    <TableCell className="font-medium align-top">{l.qui}</TableCell>
                    <TableCell className="align-top">{l.taxeRegionale}</TableCell>
                    <TableCell className="align-top font-medium tabular-nums">{l.rhone}</TableCell>
                    <TableCell className="align-top font-medium tabular-nums">{l.idf}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <FileCheck className="w-7 h-7 text-primary" />
          Comment prouver que vous êtes héritier
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Votre situation</TableHead>
                  <TableHead className="min-w-[240px]">La pièce qui l'atteste</TableHead>
                  <TableHead className="min-w-[200px]">Où l'obtenir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PREUVES_QUALITE.map((p) => (
                  <TableRow key={p.situation}>
                    <TableCell className="font-medium align-top">{p.situation}</TableCell>
                    <TableCell className="align-top">{p.piece}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{p.ou}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_SUCCESSION.map((r) => (
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
