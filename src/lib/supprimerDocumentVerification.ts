// Retirer une pièce de vérification sans rien dire au garage.
//
// « Refuser » envoie un email et inscrit une notification : c'est une demande
// adressée au garage, qui doit renvoyer la pièce corrigée. Ce n'est pas ce
// qu'on veut quand un garage a déposé cinq fois le même Kbis parce que la
// lecture automatique ne lui répondait pas — il n'y a rien à lui demander, il
// y a quatre doublons à faire disparaître.
//
// Donc : la ligne et le fichier s'en vont, et aucun email ne part. La suppression
// du fichier peut échouer sans que la ligne reste (un fichier déjà absent, un
// chemin d'une autre époque) : mieux vaut un fichier orphelin dans le stockage
// qu'une ligne orpheline dans la liste, qui elle se voit.

import { supabase } from "@/integrations/supabase/client";
import { extractBucketFromUrl, extractPathFromUrl, type StorageBucket } from "@/lib/storage-utils";

export async function supprimerDocumentVerification(doc: {
  id: string;
  url?: string | null;
}): Promise<{ ok: boolean; message?: string; fichierRestant?: boolean }> {
  let fichierRestant = false;

  if (doc.url) {
    const bucket = extractBucketFromUrl(doc.url) as StorageBucket | null;
    const chemin = extractPathFromUrl(doc.url);
    if (bucket && chemin) {
      const { error } = await supabase.storage.from(bucket).remove([chemin]);
      if (error) {
        console.warn("Fichier non supprimé du stockage :", error.message);
        fichierRestant = true;
      }
    } else {
      fichierRestant = true;
    }
  }

  const { error } = await supabase.from("verification_documents").delete().eq("id", doc.id);
  if (error) return { ok: false, message: error.message };

  return { ok: true, fichierRestant };
}
