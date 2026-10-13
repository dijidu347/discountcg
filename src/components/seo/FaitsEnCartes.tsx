// Un comparatif en cartes, et non en tableau.
//
// Ces blocs comparaient des SITUATIONS décrites en phrases : « Plaque SIV, du
// 1er au 3e changement » / « Une étiquette autocollante à coller en case
// C.3 ». Un tableau sert à parcourir des valeurs courtes du regard ; il ne
// sert à rien quand chaque cellule est une phrase. Sur quatre colonnes, les
// lignes tombaient à trente caractères, le texte s'empilait en escalier, et
// sur téléphone il fallait faire défiler de côté pour lire la fin.
//
// En cartes, chaque cas se lit d'un bloc : son intitulé en titre, les autres
// champs en dessous avec leur libellé. Deux ou trois par rangée selon la
// place, une seule colonne sur téléphone, et plus rien qui déborde.
//
// Les vrais tableaux — ceux qui alignent des montants, comme le barème par
// puissance fiscale — restent des tableaux : là, l'œil compare des chiffres.

import { Card, CardContent } from "@/components/ui/card";

export interface Fait {
  /** L'intitulé du cas, en titre de carte. */
  titre: string;
  /** Les champs, dans l'ordre : libellé puis valeur. */
  champs: { libelle: string; valeur: string; fort?: boolean }[];
}

export function FaitsEnCartes({ faits, colonnes = 3 }: { faits: Fait[]; colonnes?: 2 | 3 }) {
  const grille =
    colonnes === 2
      ? "grid gap-4 md:grid-cols-2"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={grille}>
      {faits.map((f) => (
        <Card key={f.titre} className="h-full">
          <CardContent className="py-5">
            <p className="font-semibold leading-snug text-foreground">{f.titre}</p>
            <dl className="mt-3 space-y-2.5">
              {f.champs.map((c) => (
                <div key={c.libelle}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {c.libelle}
                  </dt>
                  <dd
                    className={
                      c.fort
                        ? "text-sm font-semibold text-primary"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {c.valeur}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
