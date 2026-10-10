// L'état d'un garage se déduit de ses pièces.
//
// Jusqu'ici le badge « Vérifié » était un drapeau posé à la main, indépendant
// du contenu du dossier. Les deux pouvaient se contredire, et ils se
// contredisaient : neuf garages travaillaient sous notre habilitation sans
// Kbis approuvé, dont un sans aucune pièce ; quarante autres gardaient leur
// badge avec un Kbis de plus de six mois. C'est la cause commune de la plupart
// des défauts relevés dans cette partie.
//
// Ici, l'état n'est plus stocké : il se calcule. Il ne peut donc plus mentir.
//
// La règle tient en une phrase : un garage est en règle s'il a une pièce
// d'identité acceptée et un Kbis accepté de moins de six mois. Tout le reste
// se range selon qui doit agir — nous, ou lui.

import { supabase } from "@/integrations/supabase/client";

export type EtatDossier = "verifie" | "a_verifier" | "a_completer" | "aucun_document";

/**
 * Le nom et la couleur de chaque état, pour tous les écrans qui l'affichent.
 *
 * Bleu = à nous de jouer, ambre = au garage, vert = acquis. Deux écrans qui
 * nommaient le même état différemment donnaient deux vérités sur le même
 * garage : la liste disait « Dossier incomplet », la fiche disait « Non ».
 */
export const LIBELLE_ETAT: Record<EtatDossier, { texte: string; classe: string }> = {
  verifie: { texte: "Vérifié", classe: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  a_verifier: { texte: "Complet, à vérifier", classe: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  a_completer: { texte: "Dossier incomplet", classe: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  aucun_document: { texte: "Aucun document", classe: "bg-muted text-muted-foreground" },
};

export interface DossierGarage {
  etat: EtatDossier;
  /** Ce qui manque ou cloche, pour l'afficher sans rouvrir la fiche. */
  motifs: string[];
  /** Depuis quand la plus ancienne pièce attend notre examen. */
  enAttenteDepuis: string | null;
}

const MOIS_DE_VALIDITE = 6;

function kbisEncoreValable(date: string | null): boolean {
  if (!date) return false;
  const fin = new Date(date);
  fin.setMonth(fin.getMonth() + MOIS_DE_VALIDITE);
  return fin > new Date();
}

export async function chargerDossiers(): Promise<Map<string, DossierGarage>> {
  const { data: requis } = await supabase
    .from("garage_verification_required_documents")
    .select("code, nom_document")
    .eq("actif", true)
    .eq("obligatoire", true);

  const codes = (requis || []).map((r) => r.code);
  const nomDe = new Map((requis || []).map((r) => [r.code, r.nom_document]));

  const { data: pieces } = await supabase
    .from("verification_documents")
    .select("garage_id, document_type, status, date_emission, created_at, lu_le")
    .in("status", ["pending", "approved", "rejected"]);

  const parGarage = new Map<string, typeof pieces>();
  for (const p of pieces || []) {
    if (!parGarage.has(p.garage_id)) parGarage.set(p.garage_id, []);
    parGarage.get(p.garage_id)!.push(p);
  }

  const dossiers = new Map<string, DossierGarage>();

  for (const [garageId, lignes] of parGarage) {
    const motifs: string[] = [];
    let toutEnRegle = true;
    // Une pièce qui manque appelle le garage ; une pièce déposée nous appelle,
    // nous. Les deux ne se rangent pas dans le même onglet, et il suffit
    // qu'UNE seule manque pour que le dossier soit incomplet.
    let auGarageDeJouer = false;

    for (const code of codes) {
      const duType = lignes.filter((l) => l.document_type === code);
      const accepte = duType.find((l) => l.status === "approved");

      const enExamen = duType.some((l) => l.status === "pending");
      const refuse = !enExamen && duType.some((l) => l.status === "rejected");
      // RÈGLE : le dossier est complet tant qu'il reste quelque chose à
      // regarder. Refuser une pièce la SUPPRIME — elle part dans
      // verification_documents_refuses et sa ligne est effacée — donc un refus
      // d'aujourd'hui rend le dossier incomplet de lui-même.
      //
      // Restent trente-cinq lignes « rejected » héritées d'un mécanisme qui ne
      // supprimait pas : leur document est encore là, encore ouvrable, encore
      // acceptable. Il y a donc encore à vérifier, et le dossier est complet.
      const rienRecu = duType.length === 0;

      if (code === "kbis") {
        // Un Kbis accepté mais daté de plus de six mois ne vaut plus : c'est au
        // garage d'en déposer un récent, pas à nous de le contrôler.
        if (accepte && kbisEncoreValable(accepte.date_emission)) continue;
        toutEnRegle = false;
        if (rienRecu) auGarageDeJouer = true;
        motifs.push(
          accepte ? "Kbis périmé"
            : refuse ? "Kbis refusé, à redéposer"
            : enExamen ? "Kbis à contrôler"
            : "Kbis manquant",
        );
        continue;
      }

      if (accepte) continue;
      toutEnRegle = false;
      if (rienRecu) auGarageDeJouer = true;
      motifs.push(
        refuse ? `${nomDe.get(code)} refusé, à redéposer`
          : enExamen ? `${nomDe.get(code)} à contrôler`
          : `${nomDe.get(code)} manquant`,
      );
    }

    const enAttente = lignes.filter((l) => l.status === "pending");
    const dateASaisir = enAttente.some(
      (l) => l.document_type === "kbis" && l.lu_le && !l.date_emission,
    );
    if (dateASaisir) motifs.push("Date de Kbis à saisir");

    const enAttenteDepuis = enAttente.length
      ? enAttente.reduce((a, b) => (a.created_at < b.created_at ? a : b)).created_at
      : null;

    // « Complet » se dit du dossier, pas de son issue.
    //
    // Est complet le dossier dont chaque pièce obligatoire a reçu un document,
    // quel que soit son sort : en attente, refusé, périmé. Le travail est
    // alors chez nous — relancer, réexaminer, trancher — et la pièce est là
    // pour qu'on la rouvre.
    //
    // N'est incomplet que le dossier auquel une pièce n'est JAMAIS arrivée :
    // là, rien ne peut avancer sans le garage.
    const etat: EtatDossier = toutEnRegle
      ? "verifie"
      : auGarageDeJouer
      ? "a_completer"
      : "a_verifier";

    dossiers.set(garageId, { etat, motifs, enAttenteDepuis });
  }

  return dossiers;
}

/**
 * Le même calcul pour un seul garage, depuis la fiche d'une démarche.
 *
 * On y apprend qu'un dossier n'est pas en règle au moment où ça compte : une
 * démarche vient d'arriver, et c'est elle qui donne le prétexte — et l'urgence
 * — pour réclamer la pièce.
 */
export async function chargerDossierGarage(garageId: string): Promise<DossierGarage> {
  const { data: requis } = await supabase
    .from("garage_verification_required_documents")
    .select("code, nom_document")
    .eq("actif", true)
    .eq("obligatoire", true);

  const { data: lignes } = await supabase
    .from("verification_documents")
    .select("document_type, status, date_emission, created_at, lu_le")
    .eq("garage_id", garageId)
    .in("status", ["pending", "approved", "rejected"]);

  if (!lignes || lignes.length === 0) return SANS_DOCUMENT;

  const motifs: string[] = [];
  let toutEnRegle = true;
  let auGarageDeJouer = false;

  for (const r of requis || []) {
    const duType = lignes.filter((l) => l.document_type === r.code);
    const accepte = duType.find((l) => l.status === "approved");

    const enExamen = duType.some((l) => l.status === "pending");
    const refuse = !enExamen && duType.some((l) => l.status === "rejected");
    const rienRecu = duType.length === 0;

    if (r.code === "kbis") {
      if (accepte && kbisEncoreValable(accepte.date_emission)) continue;
      toutEnRegle = false;
      if (rienRecu) auGarageDeJouer = true;
      motifs.push(
        accepte
          ? `Kbis périmé — délivré le ${accepte.date_emission ? new Date(accepte.date_emission).toLocaleDateString("fr-FR") : "?"}`
          : refuse
          ? "Kbis refusé, en attente d'un nouveau"
          : enExamen
          ? "Kbis déposé, pas encore contrôlé"
          : "Kbis manquant",
      );
      continue;
    }

    if (accepte) continue;
    toutEnRegle = false;
    if (rienRecu) auGarageDeJouer = true;
    motifs.push(
      refuse ? `${r.nom_document} refusée, en attente d'une nouvelle`
        : enExamen ? `${r.nom_document} déposée, pas encore contrôlée`
        : `${r.nom_document} manquante`,
    );
  }

  const enAttente = lignes.filter((l) => l.status === "pending");
  const enAttenteDepuis = enAttente.length
    ? enAttente.reduce((a, b) => (a.created_at < b.created_at ? a : b)).created_at
    : null;

  return {
    etat: toutEnRegle ? "verifie" : auGarageDeJouer ? "a_completer" : "a_verifier",
    motifs,
    enAttenteDepuis,
  };
}

/** Un garage absent de la table n'a jamais rien déposé. */
export const SANS_DOCUMENT: DossierGarage = {
  etat: "aucun_document",
  motifs: ["Aucune pièce déposée"],
  enAttenteDepuis: null,
};
