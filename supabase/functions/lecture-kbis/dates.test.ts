// La seule chose qui peut se tromper en silence ici, c'est l'ordre jour/mois.
// Ces assertions valent pour cela.

import { dateFrancaise, datePlausible } from "./dates.ts";

let echecs = 0;
function verifie(nom: string, condition: boolean) {
  console.log(`${condition ? "ok  " : "ECHEC"} : ${nom}`);
  if (!condition) echecs++;
}

// Le jour d'abord, toujours. Les deux nombres sont inférieurs à 13 : c'est le
// cas où une lecture à l'américaine passerait inaperçue.
verifie("03/10/2026 est le 3 octobre", dateFrancaise("03/10/2026") === "2026-10-03");
verifie("10/03/2026 est le 10 mars", dateFrancaise("10/03/2026") === "2026-03-10");
verifie("28/09/2026", dateFrancaise("28/09/2026") === "2026-09-28");
verifie("point et tiret acceptés", dateFrancaise("28-09-2026") === "2026-09-28"
  && dateFrancaise("28.09.2026") === "2026-09-28");
verifie("jour sur un chiffre", dateFrancaise("3/10/2026") === "2026-10-03");

// En toutes lettres, avec ou sans accents, avec « 1er ».
verifie("28 septembre 2026", dateFrancaise("28 septembre 2026") === "2026-09-28");
verifie("1er aout 2026", dateFrancaise("1er aout 2026") === "2026-08-01");
verifie("1er août 2026", dateFrancaise("1er août 2026") === "2026-08-01");
verifie("4 février 2026", dateFrancaise("4 février 2026") === "2026-02-04");

// Ce qu'on refuse plutôt que de deviner.
verifie("un mois à 13 est refusé", dateFrancaise("28/13/2026") === null);
verifie("le 31 février est refusé", dateFrancaise("31/02/2026") === null);
verifie("une date déjà ISO est refusée", dateFrancaise("2026-09-28") === null);
verifie("une année sur deux chiffres est refusée", dateFrancaise("28/09/26") === null);
verifie("du vide ne rend rien", dateFrancaise("") === null && dateFrancaise(null) === null);
verifie("un mot inconnu est refusé", dateFrancaise("28 brumaire 2026") === null);

// Vraisemblance, jugée au 4 octobre 2026.
const auJour = new Date("2026-10-04T12:00:00Z");
verifie("hier est plausible", datePlausible("2026-10-03", auJour));
verifie("dans un mois ne l'est pas", !datePlausible("2026-11-04", auJour));
verifie("il y a cinq mois est plausible", datePlausible("2026-05-04", auJour));
verifie("il y a quatre ans ne l'est pas", !datePlausible("2022-10-04", auJour));

console.log(echecs === 0 ? "\nTOUT PASSE" : `\n${echecs} ECHEC(S)`);
if (echecs > 0) Deno.exit?.(1);
