// Lire une date française imprimée sur un Kbis.
//
// Tout tient dans une phrase : en France le jour vient avant le mois. Le modèle
// rend la date telle qu'elle est imprimée, et c'est ici qu'elle est
// interprétée — lui demander de convertir, c'est accepter qu'il rende parfois
// 03/10/2026 en 2026-03-10.

// Un Kbis plus vieux que cela est hors de propos : plutôt que d'écrire une date
// douteuse, on laisse la case vide et l'administration tranche.
const ANCIENNETE_MAX_JOURS = 3 * 365;

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const sansAccent = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// La date imprimée, interprétée à la française : le jour vient en premier.
// Rien n'est deviné — une forme qu'on ne reconnaît pas ne rend rien.
export function dateFrancaise(brut: string | null | undefined): string | null {
  if (!brut || typeof brut !== "string") return null;
  const texte = sansAccent(brut.trim());

  let jour: number | null = null;
  let mois: number | null = null;
  let annee: number | null = null;

  // Certains greffes impriment l'heure derrière la date (« 01/10/2026 -
  // 15:09:21 ») : on lit la date et on laisse le reste.
  const chiffres = texte.match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})(?!\d)/);
  if (chiffres) {
    jour = Number(chiffres[1]);
    mois = Number(chiffres[2]);
    annee = Number(chiffres[3]);
  } else {
    const lettres = texte.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4})(?!\d)/);
    if (lettres) {
      jour = Number(lettres[1]);
      mois = MOIS[lettres[2]] ?? null;
      annee = Number(lettres[3]);
    }
  }

  if (jour === null || mois === null || annee === null) return null;
  if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return null;

  const iso = `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
  // Une date qui n'existe pas (31 février) ne doit pas passer en silence.
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== jour) return null;
  return iso;
}

// Vraisemblance : un Kbis n'est pas daté de demain, et s'il a trois ans il vaut
// mieux ne rien écrire que d'écrire une date qu'on a mal lue.
export function datePlausible(iso: string, maintenant = new Date()): boolean {
  const lue = new Date(`${iso}T00:00:00Z`).getTime();
  const jour = 24 * 60 * 60 * 1000;
  if (lue > maintenant.getTime() + jour) return false;
  if (maintenant.getTime() - lue > ANCIENNETE_MAX_JOURS * jour) return false;
  return true;
}
