// Le contenu de référence sur le changement d'adresse.
//
// Une des dix pages du site sans aucune impression en seize mois. Ce qui lui
// manquait : ce qu'on reçoit et ce qu'on paie ne dépendent pas du
// déménagement mais du numéro qu'on a déjà — et le cas de l'ancienne plaque
// départementale, qui force un changement de numéro, n'était mentionné nulle
// part.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Home, Info, ChevronRight } from "lucide-react";
import { CAS_ADRESSE, REPERES_ADRESSE } from "@/data/adresseReperes";

export function ContenuAdresse() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Home className="w-7 h-7 text-primary" />
          Ce que vous recevez dépend de votre numéro, pas de votre déménagement
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Votre situation</TableHead>
                  <TableHead className="min-w-[240px]">Ce que vous recevez</TableHead>
                  <TableHead className="min-w-[90px]">Taxes</TableHead>
                  <TableHead className="min-w-[230px]">À prévoir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAS_ADRESSE.map((c) => (
                  <TableRow key={c.situation}>
                    <TableCell className="font-medium align-top">{c.situation}</TableCell>
                    <TableCell className="align-top">{c.recoit}</TableCell>
                    <TableCell className="align-top font-medium tabular-nums">{c.taxes}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.aPrevoir}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_ADRESSE.map((r) => (
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
              to="/changement-adresse-locataire-carte-grise"
              className="flex items-center gap-3 text-primary hover:underline font-medium"
            >
              Véhicule en LOA, LLD ou crédit-bail : la démarche du locataire
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
