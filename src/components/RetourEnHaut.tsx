// Revenir en haut à chaque changement de page.
//
// Une navigation React ne recharge rien : le navigateur garde la position de
// défilement de la page précédente. On cliquait donc un département au milieu
// d'une liste et on arrivait au milieu de la page suivante, souvent après son
// titre — avec l'impression que le lien n'avait rien fait.
//
// Deux exceptions, sans lesquelles le remède serait pire :
//
//   - une ancre (#region-ara) doit mener à SON élément, pas en haut. C'est ce
//     qui fait marcher les liens de la carte des tarifs ;
//   - un retour en arrière doit rendre la position d'où l'on venait, comme
//     le fait n'importe quel site. React Router signale ce cas par POP.

import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function RetourEnHaut() {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();

  useEffect(() => {
    if (type === "POP") return;

    if (hash) {
      // L'élément visé peut n'être monté qu'au rendu suivant.
      const aller = () => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
      aller();
      const t = window.setTimeout(aller, 120);
      return () => window.clearTimeout(t);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, type]);

  return null;
}
