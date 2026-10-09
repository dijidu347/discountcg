// Refuser une pièce, et le dire au garage.
//
// Trois sorties possibles pour une pièce, et elles ne se valent pas :
//   — approuver, qui débloque le compte ;
//   — supprimer, qui ne dit rien à personne, pour les doublons ;
//   — refuser, qui est une demande adressée au garage : il doit renvoyer
//     quelque chose, donc il faut lui dire quoi, et pourquoi.
//
// Le message compte autant que le refus. « Document refusé » tout court oblige
// le garage à deviner, et il redépose le même fichier — c'est ce qui s'est
// passé avec les Kbis illisibles. On exige donc une raison écrite, elle part
// par email et reste dans l'historique des notifications du garage.

import { supabase } from "@/integrations/supabase/client";

export interface RefusDocument {
  doc: { id: string; nom_fichier?: string | null };
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

  const { error } = await supabase
    .from("verification_documents")
    .update({
      status: "rejected",
      rejection_reason: texte,
      validated_by: parUtilisateur,
      validated_at: new Date().toISOString(),
    })
    .eq("id", doc.id);

  if (error) return { ok: false, message: error.message, emailEnvoye: false };

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

  // L'email peut échouer sans que le refus soit perdu : la pièce est déjà
  // marquée, et la notification est dans l'historique. On remonte seulement
  // l'information, pour que l'écran puisse le dire plutôt que le taire.
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
