/**
 * Deduction de la marque a partir du VIN.
 *
 * Les 3 premiers caracteres d'un VIN forment le WMI (World Manufacturer
 * Identifier, norme ISO 3780) : un code constructeur attribue mondialement.
 * La marque s'en deduit donc hors ligne, sans API ni abonnement — ce que
 * l'API plaque ne sait pas faire, puisqu'elle n'interroge que le fichier
 * francais des immatriculations.
 *
 * Le modele, lui, n'est PAS deductible du VIN sans base constructeur : les
 * caracteres 4 a 8 sont propres a chaque marque et non publies. Le mandat
 * Cerfa 13757 ne demandant que la marque, cela suffit.
 *
 * Table volontairement limitee aux constructeurs courants en France. Un WMI
 * inconnu renvoie null : la saisie manuelle reste alors le comportement normal,
 * jamais un blocage.
 */

const WMI: Record<string, string> = {
  // France
  VF1: "RENAULT", VF2: "RENAULT", VNE: "RENAULT", VF6: "RENAULT TRUCKS",
  VF3: "PEUGEOT", VR3: "PEUGEOT",
  VF7: "CITROEN", VR7: "CITROEN",
  VR1: "DS", VF9: "BUGATTI", VNK: "TOYOTA",
  // Roumanie / Maroc (groupe Renault)
  UU1: "DACIA", UU2: "DACIA", VF8: "DACIA",
  // Allemagne
  WVW: "VOLKSWAGEN", WV1: "VOLKSWAGEN", WV2: "VOLKSWAGEN", WVG: "VOLKSWAGEN",
  WAU: "AUDI", WA1: "AUDI", TRU: "AUDI",
  WBA: "BMW", WBS: "BMW", WBY: "BMW", WBW: "BMW",
  WMW: "MINI",
  WDB: "MERCEDES-BENZ", WDD: "MERCEDES-BENZ", WDC: "MERCEDES-BENZ",
  WDF: "MERCEDES-BENZ", W1K: "MERCEDES-BENZ", W1N: "MERCEDES-BENZ",
  W1V: "MERCEDES-BENZ", WMX: "MERCEDES-BENZ",
  WP0: "PORSCHE", WP1: "PORSCHE",
  WF0: "FORD", WMA: "MAN", WEB: "EVOBUS",
  W0L: "OPEL", W0V: "OPEL",
  // Italie
  ZFA: "FIAT", ZFF: "FERRARI", ZAR: "ALFA ROMEO", ZAM: "MASERATI",
  ZLA: "LANCIA", ZCF: "IVECO", ZAP: "PIAGGIO",
  // Espagne
  VSS: "SEAT", VSX: "OPEL", VS6: "FORD", VSK: "NISSAN", VSE: "SANTANA",
  // Republique tcheque / Slovaquie
  TMB: "SKODA", TMP: "SKODA", TMA: "HYUNDAI", TMK: "KIA",
  // Royaume-Uni
  SAL: "LAND ROVER", SAJ: "JAGUAR", SAR: "ROVER", SCA: "ROLLS-ROYCE",
  SCB: "BENTLEY", SCC: "LOTUS", SDB: "PEUGEOT", SFD: "ALEXANDER DENNIS",
  // Suede
  YV1: "VOLVO", YV4: "VOLVO", YV2: "VOLVO", YS3: "SAAB",
  // Pologne / Turquie
  SUP: "OPEL", SUF: "FIAT", NM0: "FORD", NMT: "TOYOTA", NLH: "HYUNDAI",
  // Japon
  JHM: "HONDA", JHL: "HONDA", JH4: "ACURA",
  JMB: "MITSUBISHI", JMZ: "MAZDA", JM1: "MAZDA",
  JN1: "NISSAN", JN8: "NISSAN", JN6: "NISSAN",
  JTD: "TOYOTA", JTM: "TOYOTA", JTE: "TOYOTA", JTH: "LEXUS", JT2: "TOYOTA",
  JF1: "SUBARU", JF2: "SUBARU", JS1: "SUZUKI", JS2: "SUZUKI", JS3: "SUZUKI",
  JAA: "ISUZU", JYA: "YAMAHA", JKA: "KAWASAKI",
  // Coree
  KMH: "HYUNDAI", KMF: "HYUNDAI", KM8: "HYUNDAI",
  KNA: "KIA", KNB: "KIA", KND: "KIA", KNE: "KIA",
  KL1: "CHEVROLET", KL5: "CHEVROLET", KPT: "SSANGYONG",
  // Etats-Unis
  "1FA": "FORD", "1FT": "FORD", "1FM": "FORD", "2FA": "FORD", "3FA": "FORD",
  "1G1": "CHEVROLET", "1GC": "CHEVROLET", "1GY": "CADILLAC", "1GN": "CHEVROLET",
  "1C3": "CHRYSLER", "1C4": "JEEP", "1J4": "JEEP", "3C4": "CHRYSLER",
  "5YJ": "TESLA", "7SA": "TESLA", LRW: "TESLA",
  "1HG": "HONDA", "2HG": "HONDA", "4T1": "TOYOTA", "5N1": "NISSAN",
  // Pays-Bas / Belgique
  XLR: "DAF", XL9: "SPYKER", XLB: "VOLVO", VNV: "IVECO",
  // Chine
  LSV: "VOLKSWAGEN", LVS: "FORD", LFV: "VOLKSWAGEN", LGX: "BYD",
  LB3: "GEELY", LJ1: "JAC", LSJ: "MG", LSF: "MG",
  // Inde
  MAT: "TATA", MA1: "MAHINDRA", MAJ: "FORD", MBH: "SUZUKI",
};

/** Caracteres interdits dans un VIN (norme ISO 3779) : I, O et Q. */
const CARACTERES_INTERDITS = /[IOQ]/;

export function vinValide(vin: string): boolean {
  const v = (vin ?? "").trim().toUpperCase();
  return v.length === 17 && !CARACTERES_INTERDITS.test(v) && /^[A-Z0-9]+$/.test(v);
}

/**
 * Marque deduite du VIN, ou null si le code constructeur est inconnu.
 * Tolere un VIN incomplet : les 3 premiers caracteres suffisent.
 */
export function marqueDepuisVin(vin: string | null | undefined): string | null {
  const v = (vin ?? "").trim().toUpperCase();
  if (v.length < 3) return null;
  return WMI[v.slice(0, 3)] ?? null;
}
