// Le contenu de référence sur le duplicata de carte grise.
//
// Cette page n'a jamais eu une seule impression en seize mois, alors qu'elle
// est bien maillée et que son contenu est juste. Ce qui lui manquait, c'est
// d'être autre chose qu'une page de gabarit — la même structure que les six
// autres démarches invisibles du site.
//
// Ce qui lui est propre : le premier geste n'est pas le même selon qu'on a
// perdu, qu'on s'est fait voler, ou qu'on a abîmé le document.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileWarning, Info } from "lucide-react";
import { CAS_DUPLICATA, REPERES_DUPLICATA } from "@/data/duplicataReperes";

export function ContenuDuplicata() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <FileWarning className="w-7 h-7 text-primary" />
          Perdue, volée ou abîmée : le premier geste n'est pas le même
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Votre situation</TableHead>
                  <TableHead className="min-w-[250px]">Ce qu'il faut faire d'abord</TableHead>
                  <TableHead className="min-w-[200px]">La pièce à joindre</TableHead>
                  <TableHead className="min-w-[250px]">Où l'obtenir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAS_DUPLICATA.map((c) => (
                  <TableRow key={c.cas}>
                    <TableCell className="font-medium align-top">{c.cas}</TableCell>
                    <TableCell className="align-top text-primary font-medium">{c.premierGeste}</TableCell>
                    <TableCell className="align-top">{c.piece}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.ou}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_DUPLICATA.map((r) => (
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
