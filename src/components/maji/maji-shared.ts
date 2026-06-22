// Socle partagé pour tous les concepts de mise en avant MaJi Auto.
// Identité visuelle volontairement DIFFÉRENTE du bleu SniperAuto/DCG :
// vert émeraude (automobile / argent / "go") + ardoise foncée + ambre (rareté/premium).

export const MAJI_URL = "https://maji-auto.fr";
export const MAJI_APPLY_URL = "https://maji-auto.fr/rejoindre-le-reseau";

// Vidéo de présentation (utilisée par tous les blocs MaJi)
export const MAJI_VIDEO_SRC = "https://maji-auto.fr/presentation-promo.mp4";
export const MAJI_VIDEO_POSTER = "/videos/maji-presentation-poster.jpg";

// Offre (chiffres officiels du pitch)
export const MAJI_MENSUEL = 99; // €/mois
export const MAJI_PAR_MANDAT = 80; // € commission réseau par mandat validé
export const MAJI_MANDATS_OFFERTS = 5; // 5 premiers mandats offerts
export const MAJI_COMMISSION_MOY_MANDAT = 1200; // marge moyenne agent par mandat (packs inclus, ordre de grandeur)

// Villes déjà prises (zones non disponibles) — avec coordonnées [lon, lat] pour la carte
export interface MajiCity {
  name: string;
  lon: number;
  lat: number;
}

export const MAJI_CITIES_TAKEN_GEO: MajiCity[] = [
  { name: "Bordeaux", lon: -0.5792, lat: 44.8378 },
  { name: "Bourg-en-Bresse", lon: 5.2256, lat: 46.2057 },
  { name: "Charleville-Mézières", lon: 4.7161, lat: 49.7719 },
  { name: "Mareuil-lès-Meaux", lon: 2.8667, lat: 48.9333 },
  { name: "Orléans", lon: 1.9093, lat: 47.9029 },
  { name: "Périgueux", lon: 0.7214, lat: 45.1841 },
  { name: "Pessac", lon: -0.6311, lat: 44.8067 },
  { name: "Saint-Quentin", lon: 3.2876, lat: 49.8489 },
  { name: "Vestric-et-Candiac", lon: 4.2589, lat: 43.7392 },
];

export const MAJI_CITIES_TAKEN = MAJI_CITIES_TAKEN_GEO.map((c) => c.name);

// Géocode une commune via l'API officielle geo.api.gouv.fr (gratuite, sans clé)
export async function geocodeCommune(
  q: string
): Promise<{ name: string; lon: number; lat: number; dept?: string } | null> {
  try {
    const params = new URLSearchParams({
      nom: q,
      fields: "nom,codeDepartement,centre",
      format: "json",
      limit: "1",
      boost: "population",
    });
    const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
    const data = (await res.json()) as Array<{
      nom: string;
      codeDepartement?: string;
      centre?: { coordinates: [number, number] };
    }>;
    const hit = data.find((d) => d.centre?.coordinates);
    if (!hit) return null;
    return {
      name: hit.nom,
      lon: hit.centre!.coordinates[0],
      lat: hit.centre!.coordinates[1],
      dept: hit.codeDepartement,
    };
  } catch {
    return null;
  }
}

// Palette MaJi
export const MAJI = {
  emerald: "#059669",
  emeraldDark: "#047857",
  slate: "#0f172a",
  amber: "#f59e0b",
  ivory: "#FDFBF7",
};

export function openMajiApply() {
  window.open(MAJI_APPLY_URL, "_blank", "noopener,noreferrer");
}

export function openMajiSite() {
  window.open(MAJI_URL, "_blank", "noopener,noreferrer");
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

// Estimation de revenus pour le simulateur :
// commission agent moyenne par mandat − coût réseau (99€/mois + 80€/mandat au-delà des 5 offerts… ici simplifié)
export function estimateMonthlyNet(mandatsParMois: number): {
  brut: number;
  coutReseau: number;
  net: number;
} {
  const brut = mandatsParMois * MAJI_COMMISSION_MOY_MANDAT;
  const coutReseau = MAJI_MENSUEL + mandatsParMois * MAJI_PAR_MANDAT;
  return { brut, coutReseau, net: brut - coutReseau };
}

// Une zone est-elle libre ? (vrai = libre, faux = déjà prise)
export function isZoneFree(ville?: string): boolean {
  if (!ville) return true;
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return !MAJI_CITIES_TAKEN.some((c) => norm(c) === norm(ville));
}
