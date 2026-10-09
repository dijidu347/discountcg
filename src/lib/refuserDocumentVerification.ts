// Refuser une pièce : la retirer du dossier, et le dire au garage.
//
// Trois sorties possibles, et elles ne se valent pas :
//   — approuver, qui fait avancer le dossier ;
//   — supprimer, qui ne garde rien et ne dit rien, pour les doublons ;
//   — refuser, qui est une demande adressée au garage : il doit redéposer
//     quelque chose, donc il faut lui dire quoi, et pourquoi.
//
// Le refus retire la ligne du dossier vivant. Tant qu'elle y restait, elle
// comptait comme la dernière pièce de son type et le garage paraissait avoir
// fourni ce qu'on lui redemandait. Elle part donc dans l'historique — avec son
// fichier, qui reste dans le stockage : le jour où un garage affirme avoir
// envoyé son Kbis, un motif écrit ne suffit pas, il faut pouvoir rouvrir ce
// qu'il avait déposé.
//
// Le message compte autant que le refus. « Document refusé » tout court oblige
// à deviner, et le garage redépose le même fichier — c'est exactement ce qui
// s'est passé avec les Kbis illisibles, cinq fois pour un seul garage.

import { supabase } from "@/integrations/supabase/client";

// types.ts est genere depuis la base et ne connait pas encore la table des
// refus. On passe par une reference non typee plutot que de semer des `as any`
// a chaque appel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tableDesRefus = () => (supabase as any).from("verification_documents_refuses");

export interface RefusDocument {
  doc: {
    id: string;
    document_type: string;
    nom_fichier?: string | null;
    url?: string | null;
    created_at: string;
  };
  garage: { id: string; email?: string | null; raison_sociale?: string | null };
  /** L'administrateur qui refuse. */
  parUtilisateur?: string;
  /** Ce que le garage lira. Obligatoire. */
  raison: string;
}

export async function refuserDocumentVerification({
  doc,
  garage,
  parUtilisateur,
  raison,
}: RefusDocument): Promise<{ ok: boolean; message?: string; emailEnvoye: boolean }> {
  const texte = raison.trim();
  if (!texte) return { ok: false, message: "Une raison est nécessaire", emailEnvoye: false };

  // L'historique d'abord : si l'écriture échoue, la pièce est toujours là et
  // rien n'est perdu. L'inverse laisserait un document effacé sans trace.
  const { error: erreurHistorique } = await tableDesRefus()
    .insert({
      document_id: doc.id,
      garage_id: garage.id,
      document_type: doc.document_type,
      nom_fichier: doc.nom_fichier,
      url: doc.url,
      depose_le: doc.created_at,
      refuse_par: parUtilisateur,
      raison: texte,
    });

  if (erreurHistorique) {
    return { ok: false, message: erreurHistorique.message, emailEnvoye: false };
  }

  const { error: erreurSuppression } = await supabase
    .from("verification_documents")
    .delete()
    .eq("id", doc.id);

  if (erreurSuppression) {
    return { ok: false, message: erreurSuppression.message, emailEnvoye: false };
  }

  const sujet = "Document refusé - Action requise";
  const corps =
    `Le document « ${doc.nom_fichier ?? "déposé"} » a été refusé.\n\n` +
    `${texte}\n\n` +
    `Merci de déposer la pièce corrigée depuis votre espace « Paramètres > Vérification ».`;

  await supabase.from("garage_verification_notifications").insert({
    garage_id: garage.id,
    sent_by: parUtilisateur,
    subject: sujet,
    message: corps,
  });

  // L'email peut échouer sans que le refus soit perdu : la pièce est retirée,
  // l'historique est écrit, la notification est dans l'espace du garage. On
  // remonte seulement l'information, pour que l'écran puisse le dire plutôt
  // que de laisser croire que le garage a été prévenu.
  const { error: erreurEmail } = await supabase.functions.invoke("send-email", {
    body: {
      type: "custom_notification",
      to: garage.email,
      data: {
        customerName: garage.raison_sociale,
        subject: sujet,
        message: corps,
      },
    },
  });

  return { ok: true, emailEnvoye: !erreurEmail };
}

export interface DocumentRefuse {
  id: string;
  document_type: string;
  nom_fichier: string | null;
  url: string | null;
  depose_le: string;
  refuse_le: string;
  raison: string;
}

export async function historiqueDesRefus(garageId: string): Promise<DocumentRefuse[]> {
  const { data } = await tableDesRefus()
    .select("id, document_type, nom_fichier, url, depose_le, refuse_le, raison")
    .eq("garage_id", garageId)
    .order("refuse_le", { ascending: false });
  return (data as DocumentRefuse[]) ?? [];
}
