// Quels garages attendent vraiment qu'on saisisse une date de Kbis.
//
// La lecture automatique échoue sur environ un Kbis sur sept : elle ouvre bien
// le fichier mais n'y repère pas la date de délivrance. La ligne reste alors
// « en attente », et jusqu'ici rien ne la signalait.
//
// Mais toutes ces lignes ne demandent pas le même geste, et compter la pièce
// plutôt que la situation du garage donne de faux positifs. PG AUTO SERVICES a
// déposé ses statuts dans l'emplacement Kbis à 13 h 39, puis le vrai Kbis à
// 13 h 57 — lu, daté du 10/09/2026, approuvé, valable cent cinquante-deux
// jours. Son dossier est en règle ; la première ligne n'est qu'un déchet. Le
// faire apparaître comme « date à saisir » envoie chercher une date qui
// n'existe pas sur le document.
//
// Donc : un garage n'a une date à saisir que s'il n'a aucun Kbis approuvé,
// daté, encore dans ses six mois. Sinon la ligne non datée est un doublon, qui
// se retire sans rien demander à personne.

import { supabase } from "@/integrations/supabase/client";

const MOIS_DE_VALIDITE = 6;

/** Un Kbis vaut six mois à compter de la date portée sur le document. */
export function kbisEncoreValable(dateEmission: string | null | undefined): boolean {
  if (!dateEmission) return false;
  const fin = new Date(dateEmission);
  fin.setMonth(fin.getMonth() + MOIS_DE_VALIDITE);
  return fin > new Date();
}

/**
 * Les garages dont un Kbis attend une date saisie à la main — et eux seuls :
 * ceux qui ont déjà un Kbis valable en sont exclus.
 */
export async function garagesAvecKbisADater(): Promise<Set<string>> {
  const { data: sansDate } = await supabase
    .from("verification_documents")
    .select("garage_id")
    .eq("status", "pending")
    .ilike("document_type", "%kbis%")
    .not("lu_le", "is", null)
    .is("date_emission", null);

  const candidats = [...new Set((sansDate || []).map((d) => d.garage_id))];
  if (!candidats.length) return new Set();

  const { data: valables } = await supabase
    .from("verification_documents")
    .select("garage_id, date_emission")
    .eq("status", "approved")
    .ilike("document_type", "%kbis%")
    .not("date_emission", "is", null)
    .in("garage_id", candidats);

  const enRegle = new Set(
    (valables || [])
      .filter((d) => kbisEncoreValable(d.date_emission as string))
      .map((d) => d.garage_id),
  );

  return new Set(candidats.filter((id) => !enRegle.has(id)));
}
