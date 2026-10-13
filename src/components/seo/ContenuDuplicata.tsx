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
import { FileWarning, Info } from "lucide-react";
import { CAS_DUPLICATA, REPERES_DUPLICATA } from "@/data/duplicataReperes";
import { FaitsEnCartes } from "@/components/seo/FaitsEnCartes";

export function ContenuDuplicata() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <FileWarning className="w-7 h-7 text-primary" />
          Perdue, volée ou abîmée : le premier geste n'est pas le même
        </h2>
        <FaitsEnCartes colonnes={3} faits={CAS_DUPLICATA.map((c) => ({
            titre: c.cas,
            champs: [{ libelle: "Ce qu'il faut faire d'abord", valeur: c.premierGeste, fort: true }, { libelle: "La pièce à joindre", valeur: c.piece }, { libelle: "Où l'obtenir", valeur: c.ou }],
          }))} />
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2">
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
