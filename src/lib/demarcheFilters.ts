// Source unique de vérité pour la règle "Démarches à traiter" (file de travail
// admin). Les deux formes ci-dessous dérivent des MÊMES constantes :
//  - isATraiter        : prédicat JS pour filtrer un tableau déjà chargé (liste).
//  - applyATraiterFilters : applicateur de filtres Supabase pour un count côté
//    base (aucune ligne transférée), utilisé par le tableau de bord.

// Statuts exclus de la file "à traiter".
export const A_TRAITER_EXCLUDED_STATUS = [
  "finalise",
  "refuse",
  "en_attente_paiement_client",
] as const;

// Forme minimale d'une démarche pour le prédicat.
export interface DemarcheATraiterFields {
  is_draft?: boolean | null;
  paye?: boolean | null;
  is_free_token?: boolean | null;
  status?: string | null;
}

// Prédicat JS : non-brouillon ET (payée par carte OU jeton gratuit) ET statut
// hors A_TRAITER_EXCLUDED_STATUS.
export function isATraiter(d: DemarcheATraiterFields): boolean {
  return (
    d.is_draft === false &&
    (d.paye === true || d.is_free_token === true) &&
    !(A_TRAITER_EXCLUDED_STATUS as readonly string[]).includes(d.status ?? "")
  );
}

// Applique les mêmes filtres "à traiter" à une requête Supabase, côté base.
// À combiner avec `.select('*', { count: 'exact', head: true })` pour obtenir un
// décompte exact sans transférer aucune ligne. Sémantique IDENTIQUE à isATraiter :
//   is_draft = false
//   AND (paye = true OR is_free_token = true)
//   AND (status NOT IN (...) OR status IS NULL)   ← le status null est INCLUS,
//       comme dans isATraiter (`status ?? ""`), car en SQL `NOT (null IN (...))`
//       vaut NULL et exclurait la ligne. On rétablit l'inclusion via IS NULL.
// Les deux `.or()` sont émis via searchParams.append → deux groupes `or=` AND-és
// par PostgREST (et non télescopés).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyATraiterFilters(query: any) {
  return query
    .eq("is_draft", false)
    .or("paye.eq.true,is_free_token.eq.true")
    .or(`status.not.in.(${A_TRAITER_EXCLUDED_STATUS.join(",")}),status.is.null`);
}
