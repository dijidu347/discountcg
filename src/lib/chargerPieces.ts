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

// Date du dernier message du CLIENT (garage ou particulier, jamais l'admin),
// dossier par dossier : sert à repérer les dossiers qui dorment.
export async function dernierMessageClient(
  table: "messages" | "guest_order_messages",
  colonne: "demarche_id" | "order_id",
  ids: string[],
): Promise<Record<string, number>> {
  const LOT_IDS = 150;
  const PAGE = 1000;
  const derniers: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += LOT_IDS) {
    const lot = ids.slice(i, i + LOT_IDS);
    for (let depuis = 0; ; depuis += PAGE) {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(table as any)
        .select(`${colonne}, created_at`)
        .in(colonne, lot)
        .neq("sender_type", "admin")
        .order("created_at", { ascending: true })
        .range(depuis, depuis + PAGE - 1);
      if (error) {
        console.error(`Chargement des messages (${table}) :`, error);
        break;
      }
      const lignes = (data || []) as unknown as Record<string, string>[];
      lignes.forEach((m) => {
        const t = new Date(m.created_at).getTime();
        if (!derniers[m[colonne]] || t > derniers[m[colonne]]) derniers[m[colonne]] = t;
      });
      if (lignes.length < PAGE) break;
    }
  }
  return derniers;
}

// Dossier « en sommeil » : ni pièce ni message du client depuis 30 jours, et
// déjà ouvert par l'admin (une nouveauté n'est jamais mise de côté).
export const SOMMEIL_JOURS = 30;
export function derniereActivite(creeLe: string | null | undefined, ...dates: (number | undefined)[]): number {
  return Math.max(creeLe ? new Date(creeLe).getTime() : 0, ...dates.map((d) => d || 0));
}
