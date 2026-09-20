import { supabase } from "@/integrations/supabase/client";
import type { PieceControlee } from "@/lib/etatPieces";

// Pièces des dossiers de la file admin, SANS troncature.
//
// Une requête renvoie au maximum 1000 lignes : au-delà, les dossiers absents de
// ce premier millier paraissaient n'avoir aucune pièce (c'est ce qui affichait
// « Aucune pièce » partout, et qui masquait des refus). On pagine donc, et on
// découpe la liste d'identifiants pour ne pas fabriquer une URL démesurée.
export async function chargerPieces(
  table: "documents" | "guest_order_documents",
  colonne: "demarche_id" | "order_id",
  ids: string[],
): Promise<(PieceControlee & Record<string, unknown>)[]> {
  const LOT_IDS = 150;
  const PAGE = 1000;
  const toutes: (PieceControlee & Record<string, unknown>)[] = [];

  for (let i = 0; i < ids.length; i += LOT_IDS) {
    const lot = ids.slice(i, i + LOT_IDS);
    let depuis = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select(`${colonne}, type_document, validation_status, validated_at, created_at`)
        .in(colonne, lot)
        .order("created_at", { ascending: true })
        .range(depuis, depuis + PAGE - 1);

      if (error) {
        console.error(`Chargement des pièces (${table}) :`, error);
        break;
      }
      const lignes = (data || []) as unknown as (PieceControlee & Record<string, unknown>)[];
      toutes.push(...lignes);
      if (lignes.length < PAGE) break;
      depuis += PAGE;
    }
  }

  return toutes;
}
