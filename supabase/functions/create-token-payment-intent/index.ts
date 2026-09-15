// ============================================================================
// create-token-payment-intent — DESACTIVEE
// ----------------------------------------------------------------------------
// La recharge de solde passe par Sogecommerce depuis le 11/09/2026
// (create-sogecommerce-token-payment). Cette fonction Stripe reste en place
// uniquement pour repondre proprement aux pages ouvertes avant la bascule :
// elle ne cree plus aucun paiement.
// ============================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  console.log("create-token-payment-intent appelee alors qu'elle est desactivee (recharge via Sogecommerce)");
  return new Response(
    JSON.stringify({
      error: "La recharge de jetons par Stripe n'est plus disponible. Rechargez la page pour payer par carte.",
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
