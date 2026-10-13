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
import { Bike, Info } from "lucide-react";
import { CAS_CYCLO, REPERES_CYCLO } from "@/data/cycloReperes";
import { FaitsEnCartes } from "@/components/seo/FaitsEnCartes";

export function ContenuCyclo() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Bike className="w-7 h-7 text-primary" />
          Trois situations, et une seule qui bloque
        </h2>
        <FaitsEnCartes colonnes={3} faits={CAS_CYCLO.map((c) => ({
            titre: c.situation,
            champs: [{ libelle: "La pièce qui compte", valeur: c.piecePrincipale }, { libelle: "La difficulté", valeur: c.difficulte, fort: true }],
          }))} />
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2">
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
