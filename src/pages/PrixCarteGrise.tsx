// /prix-carte-grise a été fusionnée avec /simulateur.
//
// Les deux pages visaient les mêmes requêtes — « prix carte grise », « tarif
// cheval fiscal », « simulateur carte grise » — et se partageaient les signaux :
// l'outil d'un côté avec 25 liens internes, le contenu de référence de l'autre
// avec deux liens et aucun trafic. Le concurrent qui nous devançait n'en a
// qu'une, qui porte les deux.
//
// L'URL reste vivante et renvoie vers la page unique : les liens déjà posés
// ailleurs continuent de fonctionner, et Google suit la redirection.

import { Navigate } from "react-router-dom";

export default function PrixCarteGrise() {
  return <Navigate to="/simulateur" replace />;
}
