// Le contenu de référence sur la modification de carte grise.
//
// Le lecteur arrive avec une question unique et pratique : « j'ai fait tel
// changement sur mon véhicule, qu'est-ce qu'on va me demander ? » La réponse
// était dispersée dans sept questions ; elle se range en tableau.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Info } from "lucide-react";
import { SELON_LA_MODIFICATION, REPERES_MODIFICATION } from "@/data/modificationReperes";
import { FaitsEnCartes } from "@/components/seo/FaitsEnCartes";

export function ContenuModification() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Wrench className="w-7 h-7 text-primary" />
          Ce qu'on vous demandera, selon la modification
        </h2>
        <FaitsEnCartes colonnes={3} faits={SELON_LA_MODIFICATION.map((l) => ({
            titre: l.modification,
            champs: [{ libelle: "La preuve exigée", valeur: l.preuve }, { libelle: "Délivrée par", valeur: l.delivrePar }, { libelle: "Délai", valeur: l.delai, fort: true }],
          }))} />
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2">
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
