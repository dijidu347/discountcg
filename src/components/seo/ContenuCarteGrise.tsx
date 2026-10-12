// Le contenu de référence du changement de titulaire.
//
// La démarche principale du site : 2 006 impressions pour six clics, en
// position 16,1. Le contenu était correct ; il lui manquait ce qui fait
// réellement échouer les dossiers — non pas le formulaire, mais ce que
// l'acheteur n'a pas réclamé au vendeur le jour de la vente.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { KeyRound, Info, ChevronRight } from "lucide-react";
import { A_RECLAMER_AU_VENDEUR, REPERES_CARTE_GRISE } from "@/data/carteGriseReperes";

export function ContenuCarteGrise() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <KeyRound className="w-7 h-7 text-primary" />
          Ce qu'il faut réclamer au vendeur, le jour de la vente
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Une demande de carte grise bloque rarement sur le formulaire. Elle bloque sur une pièce
          que personne n'a demandée au moment de la remise des clés — et qu'il faut aller rechercher
          des semaines plus tard, quand le vendeur ne répond plus.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[230px]">La pièce</TableHead>
                  <TableHead className="min-w-[320px]">Ce qu'elle doit porter</TableHead>
                  <TableHead className="min-w-[300px]">Si elle manque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {A_RECLAMER_AU_VENDEUR.map((p) => (
                  <TableRow key={p.piece}>
                    <TableCell className="font-medium align-top">{p.piece}</TableCell>
                    <TableCell className="align-top">{p.precision}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{p.siElleManque}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_CARTE_GRISE.map((r) => (
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

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-5">
            <Link to="/certificat-de-non-gage" className="flex items-center gap-3 text-primary hover:underline font-medium">
              Vérifier que le véhicule n'est pas gagé
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-5">
            <Link to="/simulateur" className="flex items-center gap-3 text-primary hover:underline font-medium">
              Calculer le prix exact à partir de la plaque
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
