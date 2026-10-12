// Le contenu de référence sur la fiche d'identification du véhicule.
//
// 532 impressions pour deux clics, en position 24,7. La page est honnête et
// bien écrite — elle dit même que le document est gratuit sur l'ANTS. Ce qui
// lui manquait n'est pas du contenu mais de la structure : quand elle sert, et
// avec quoi on la confond.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ClipboardList, ShieldQuestion, Info, ChevronRight } from "lucide-react";
import { CAS_FIV, NE_PAS_CONFONDRE, REPERES_FIV } from "@/data/fivReperes";

export function ContenuFiv() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-primary" />
          Les quatre cas où elle sert vraiment
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[300px]">Votre situation</TableHead>
                  <TableHead className="min-w-[340px]">Ce qu'elle apporte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAS_FIV.map((c) => (
                  <TableRow key={c.situation}>
                    <TableCell className="font-medium align-top">{c.situation}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.pourquoi}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ShieldQuestion className="w-7 h-7 text-primary" />
          Trois documents qu'on confond
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[230px]">Document</TableHead>
                  <TableHead className="min-w-[320px]">Ce qu'il dit</TableHead>
                  <TableHead className="min-w-[300px]">Ce qu'il ne dit pas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {NE_PAS_CONFONDRE.map((c) => (
                  <TableRow key={c.document}>
                    <TableCell className="font-medium align-top">{c.document}</TableCell>
                    <TableCell className="align-top">{c.dit}</TableCell>
                    <TableCell className="align-top text-muted-foreground">{c.neDitPas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {REPERES_FIV.map((r) => (
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
            <Link to="/duplicata-carte-grise" className="flex items-center gap-3 text-primary hover:underline font-medium">
              Carte grise perdue ? C'est un duplicata qu'il vous faut
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-5">
            <Link to="/certificat-de-non-gage" className="flex items-center gap-3 text-primary hover:underline font-medium">
              Savoir si le véhicule est gagé : le certificat de non-gage
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
