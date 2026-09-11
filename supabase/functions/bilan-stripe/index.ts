// ============================================================================
// bilan-stripe
// ----------------------------------------------------------------------------
// Ce que les deux comptes Stripe ont encaisse depuis le 30/06/2026, lu
// directement chez Stripe (et non dans la base du site) : paiements,
// remboursements, frais, virements vers la banque avec le compte de
// destination, et solde restant. Lecture seule : aucune ecriture chez Stripe.
//
// Reserve aux administrateurs. Le dernier resultat est range dans la table
// bilan_stripe pour la page /admin/bilan-stripe.
// ============================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 30/06/2026 a 00:00, heure de Paris.
const DEPUIS = Math.floor(Date.parse("2026-06-29T22:00:00Z") / 1000);

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const euros = (centimes: number) => Math.round(centimes) / 100;

async function bilanCompte(nom: string, cle: string) {
  const stripe = new Stripe(cle, { apiVersion: "2025-08-27.basil" });

  let compte = nom;
  try {
    const a = await stripe.accounts.retrieveCurrent();
    compte = a.business_profile?.name || a.settings?.dashboard?.display_name || a.email || nom;
  } catch (_) { /* nom par defaut */ }

  const parType: Record<string, { nombre: number; montant: number; frais: number }> = {};
  for await (const bt of stripe.balanceTransactions.list({ created: { gte: DEPUIS }, limit: 100 })) {
    const t = (parType[bt.type] ||= { nombre: 0, montant: 0, frais: 0 });
    t.nombre += 1;
    t.montant += bt.amount;
    t.frais += bt.fee;
  }

  const virements: Array<Record<string, unknown>> = [];
  for await (const p of stripe.payouts.list({ created: { gte: DEPUIS }, limit: 100, expand: ["data.destination"] })) {
    const dest = p.destination as Stripe.BankAccount | Stripe.Card | string | null;
    const banque = dest && typeof dest === "object"
      ? ("bank_name" in dest ? `${dest.bank_name || "Banque"} ••••${dest.last4}` : `Carte ••••${dest.last4}`)
      : "inconnue";
    virements.push({
      montant: euros(p.amount),
      date: new Date(p.arrival_date * 1000).toISOString().slice(0, 10),
      statut: p.status,
      destination: banque,
    });
  }

  const solde = await stripe.balance.retrieve();
  const somme = (liste: Array<{ amount: number }>) => euros(liste.reduce((s, x) => s + x.amount, 0));

  const montant = (types: string[]) => euros(types.reduce((s, t) => s + (parType[t]?.montant || 0), 0));
  const nombre = (types: string[]) => types.reduce((s, t) => s + (parType[t]?.nombre || 0), 0);
  const fraisTotal = euros(Object.values(parType).reduce((s, t) => s + t.frais, 0));

  return {
    compte,
    paiements: { nombre: nombre(["charge", "payment"]), montant: montant(["charge", "payment"]) },
    remboursements: { nombre: nombre(["refund", "payment_refund"]), montant: montant(["refund", "payment_refund"]) },
    frais_stripe: fraisTotal,
    vire_vers_la_banque: -montant(["payout"]),
    virements,
    solde_disponible: somme(solde.available),
    solde_en_attente: somme(solde.pending),
    detail_par_type: Object.fromEntries(
      Object.entries(parType).map(([k, v]) => [k, { nombre: v.nombre, montant: euros(v.montant), frais: euros(v.frais) }]),
    ),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization") || "";
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return reponse({ error: "Non autorisé" }, 401);
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return reponse({ error: "Réservé aux administrateurs" }, 403);

    const comptes: Array<[string, string | undefined]> = [
      ["Compte Stripe 1", Deno.env.get("STRIPE_SECRET_KEY")],
      ["Compte Stripe 2", Deno.env.get("STRIPE_SECRET_KEY_2")],
    ];
    const resultats = [];
    for (const [nom, cle] of comptes) {
      if (!cle) {
        resultats.push({ compte: nom, erreur: "clé non configurée" });
        continue;
      }
      try {
        resultats.push(await bilanCompte(nom, cle));
      } catch (e: any) {
        resultats.push({ compte: nom, erreur: e?.message || "lecture impossible" });
      }
    }

    const resultat = { depuis: "2026-06-30", comptes: resultats };
    await supabase.from("bilan_stripe").upsert({ id: "dernier", resultat, calcule_le: new Date().toISOString() });
    return reponse(resultat);
  } catch (error: any) {
    console.error("Erreur bilan-stripe:", error);
    return reponse({ error: error?.message || "Erreur inconnue" }, 500);
  }
});
