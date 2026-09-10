// Second facteur par e-mail pour les comptes administrateurs.
//
// Trois actions, toutes reservees a un utilisateur authentifie ayant le role
// admin. Le mot de passe seul ne suffit plus a ouvrir l'administration : il
// faut aussi un appareil reconnu, ou un code recu par e-mail.
//
//   check  { deviceToken? }  -> { trusted }        l'appareil est-il connu ?
//   send   { }               -> { sent, email }    envoie un code a 6 chiffres
//   verify { code }          -> { ok, deviceToken } valide le code, memorise l'appareil
//
// Ni les codes ni les jetons d'appareil ne sont stockes en clair : seule leur
// empreinte SHA-256 est conservee. Une lecture de la base ne permet donc pas
// de se faire passer pour un appareil de confiance.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DUREE_CODE_MIN = 10;
const DUREE_APPAREIL_JOURS = 60;
const TENTATIVES_MAX = 5;
// Au-dela, on cesse d'envoyer : sans cette limite, l'endpoint devient un moyen
// d'inonder la boite d'un administrateur.
const ENVOIS_MAX_PAR_HEURE = 5;

async function empreinte(valeur: string): Promise<string> {
  const octets = new TextEncoder().encode(valeur);
  const somme = await crypto.subtle.digest("SHA-256", octets);
  return [...new Uint8Array(somme)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

function codeAleatoire(): string {
  const t = new Uint32Array(1);
  crypto.getRandomValues(t);
  return String(t[0] % 1_000_000).padStart(6, "0");
}

function jetonAleatoire(): string {
  const t = new Uint8Array(32);
  crypto.getRandomValues(t);
  return btoa(String.fromCharCode(...t)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// N'expose jamais l'adresse complete a l'ecran de saisie : elle indiquerait a
// un attaquant ou le code vient d'etre envoye.
function masquer(email: string): string {
  const [avant, apres] = email.split("@");
  if (!apres) return "***";
  const debut = avant.slice(0, 2);
  return `${debut}${"*".repeat(Math.max(avant.length - 2, 1))}@${apres}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Qui appelle ? ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentification requise" });

    const clientUtilisateur = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await clientUtilisateur.auth.getUser();
    if (!user) return json(401, { error: "Session invalide" });

    // Le second facteur ne concerne que les administrateurs.
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json(403, { error: "Reserve aux administrateurs" });

    const corps = await req.json().catch(() => ({}));
    const action = corps?.action;

    // ─── L'appareil est-il deja connu ? ────────────────────────────────────
    if (action === "check") {
      const jeton = corps?.deviceToken;
      if (typeof jeton !== "string" || !jeton) return json(200, { trusted: false });

      const { data: appareil } = await supabase
        .from("admin_trusted_devices")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("token_hash", await empreinte(jeton))
        .maybeSingle();

      if (!appareil || new Date(appareil.expires_at) < new Date()) {
        return json(200, { trusted: false });
      }

      await supabase
        .from("admin_trusted_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", appareil.id);

      return json(200, { trusted: true });
    }

    // ─── Envoi d'un code ───────────────────────────────────────────────────
    if (action === "send") {
      const uneHeure = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await supabase
        .from("admin_login_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", uneHeure);

      if ((count ?? 0) >= ENVOIS_MAX_PAR_HEURE) {
        return json(429, { error: "Trop de codes demandes. Réessayez dans une heure." });
      }

      const code = codeAleatoire();
      const { error: erreurInsert } = await supabase.from("admin_login_codes").insert({
        user_id: user.id,
        code_hash: await empreinte(code),
        expires_at: new Date(Date.now() + DUREE_CODE_MIN * 60_000).toISOString(),
      });
      if (erreurInsert) {
        console.error("❌ admin-2fa insert code:", erreurInsert.message);
        return json(500, { error: "Envoi impossible" });
      }

      const reponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          type: "custom_notification",
          to: user.email,
          data: {
            subject: `Code de connexion administrateur : ${code}`,
            customerName: "administrateur",
            message:
              `Votre code de connexion est : ${code}\n\n` +
              `Il est valable ${DUREE_CODE_MIN} minutes et ne sert qu'une fois.\n\n` +
              `Si vous n'avez pas tenté de vous connecter à l'administration de ` +
              `DiscountCarteGrise, quelqu'un connaît votre mot de passe : ` +
              `changez-le immédiatement.`,
          },
        }),
      });

      if (!reponse.ok) {
        console.error("❌ admin-2fa envoi e-mail:", await reponse.text());
        return json(502, { error: "L'e-mail n'a pas pu être envoyé" });
      }

      return json(200, { sent: true, email: masquer(user.email ?? "") });
    }

    // ─── Verification du code ──────────────────────────────────────────────
    if (action === "verify") {
      const code = corps?.code;
      if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
        return json(400, { error: "Code à 6 chiffres attendu" });
      }

      // Tous les codes encore valides sont acceptes, pas seulement le dernier
      // emis : si plusieurs mails sont partis, celui que l'utilisateur a sous
      // les yeux doit fonctionner, quel qu'il soit.
      const { data: candidats } = await supabase
        .from("admin_login_codes")
        .select("id, code_hash, attempts, expires_at")
        .eq("user_id", user.id)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (!candidats?.length) {
        return json(400, { error: "Aucun code valide en attente. Demandez-en un nouveau." });
      }
      if (candidats.every((c) => c.attempts >= TENTATIVES_MAX)) {
        return json(429, { error: "Trop de tentatives. Demandez un nouveau code." });
      }

      const saisi = await empreinte(code.trim());
      const bon = candidats.find((c) => c.code_hash === saisi && c.attempts < TENTATIVES_MAX);

      if (!bon) {
        const recent = candidats[0];
        await supabase
          .from("admin_login_codes")
          .update({ attempts: recent.attempts + 1 })
          .eq("id", recent.id);
        const restantes = TENTATIVES_MAX - (recent.attempts + 1);
        return json(400, {
          error: restantes > 0 ? `Code incorrect. ${restantes} tentative(s) restante(s).` : "Code incorrect.",
        });
      }

      // Code bon : tous les codes en attente sont consommes d'un coup, pour
      // qu'un ancien mail ne reste pas utilisable.
      await supabase
        .from("admin_login_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("consumed_at", null);

      const jeton = jetonAleatoire();
      const { error: erreurAppareil } = await supabase.from("admin_trusted_devices").insert({
        user_id: user.id,
        token_hash: await empreinte(jeton),
        user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
        expires_at: new Date(Date.now() + DUREE_APPAREIL_JOURS * 86_400_000).toISOString(),
      });
      if (erreurAppareil) {
        console.error("❌ admin-2fa insert appareil:", erreurAppareil.message);
        return json(500, { error: "Enregistrement de l'appareil impossible" });
      }

      return json(200, { ok: true, deviceToken: jeton });
    }

    return json(400, { error: "Action inconnue" });
  } catch (error) {
    console.error("❌ admin-2fa:", error);
    return json(500, { error: "Erreur interne" });
  }
});
