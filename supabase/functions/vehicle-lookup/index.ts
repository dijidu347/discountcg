import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sourcesDisponibles } from "./sources.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lookup-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const TTL_FOUND_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours
const TTL_NOT_FOUND_MS = 24 * 60 * 60 * 1000;  // 24 heures

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// ---- Quota : ne compte que les appels qui coûtent (défaut de cache ou force) ----
const PLAFOND_IP_HEURE = 15;
const PLAFOND_GLOBAL_JOUR = 600;
const BYPASS_SECRET = Deno.env.get('LOOKUP_BYPASS_SECRET') ?? '';

async function empreinteIp(req: Request): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)));
  return Array.from(hash.slice(0, 12)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function egaliteConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function consommer(cle: string, fenetre: Date, plafond: number): Promise<boolean> {
  if (!admin) throw new Error('client service indisponible');
  const { data, error } = await admin.rpc('consommer_quota_plaque', {
    p_cle: cle, p_fenetre: fenetre.toISOString(), p_plafond: plafond,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

// true = autorisé. En cas de panne du compteur : on laisse passer.
async function quotaAutorise(req: Request): Promise<boolean> {
  try {
    const now = new Date();
    const heure = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
    const jour = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const secret = req.headers.get('x-lookup-secret') ?? '';
    const exempte = BYPASS_SECRET.length > 0 && secret.length > 0 && egaliteConstante(secret, BYPASS_SECRET);
    if (!exempte) {
      if (!(await consommer(`ip:${await empreinteIp(req)}`, heure, PLAFOND_IP_HEURE))) {
        console.warn('vehicle-lookup quota IP atteint');
        return false;
      }
    }
    if (!(await consommer('global', jour, PLAFOND_GLOBAL_JOUR))) {
      console.warn('vehicle-lookup quota global atteint');
      return false;
    }
    return true;
  } catch (e) {
    console.error('vehicle-lookup compteur de quota en panne, appel autorisé:', e instanceof Error ? e.message : e);
    return true;
  }
}

type NormalizedVehicle = {
  marque?: unknown;
  modele?: unknown;
  couleur?: unknown;
  puissance_fiscale?: unknown;
  energie?: unknown;
  date_mec?: unknown;
  co2?: unknown;
  immatriculation?: unknown;
  vin?: unknown;
  genre?: unknown;
};

function normalize(apiResponse: any): NormalizedVehicle {
  // Les trois formes rencontrées selon la source : les champs à la racine, sous
  // « data », ou sous « data » dans un tableau d'un seul élément.
  let v = apiResponse?.data ?? apiResponse;
  if (Array.isArray(v)) v = v[0];
  return {
    marque: v?.AWN_marque,
    modele: v?.AWN_modele,
    couleur: v?.AWN_couleur,
    puissance_fiscale: v?.AWN_puissance_fiscale,
    energie: v?.AWN_energie,
    date_mec: dateIso(v?.AWN_date_mise_en_circulation),
    co2: v?.AWN_emission_co_2,
    immatriculation: v?.AWN_immat,
    vin: v?.AWN_vin,
    genre: v?.AWN_genre,
  };
}

// Les sources ne datent pas de la même façon : le revendeur rendait
// « 2012-09-28 », l'accès direct rend « 28-09-2012 ». Une base de données
// refuse la seconde, et un calcul d'ancienneté s'y trompe en silence. On rend
// toujours la forme ISO, pour que le reste du site n'ait jamais à deviner.
function dateIso(valeur: unknown): unknown {
  if (typeof valeur !== 'string') return valeur;
  const v = valeur.trim();
  const jma = v.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (jma) return `${jma[3]}-${jma[2]}-${jma[1]}`;
  return v;
}

function isFilled(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const plate = body?.plate;
    const force = body?.force === true;
    // Jamais pour un client : un appel explicitement marqué « diagnostic »
    // reçoit la raison brute de chaque refus, ce qui permet de distinguer de
    // l'extérieur une panne de fournisseur d'un abonnement à refaire.
    const diagnostic = body?.diagnostic === true;

    if (!plate || typeof plate !== 'string') {
      console.error('Invalid plate provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalisation: majuscules, sans tirets ni espaces
    const cleanPlate = plate.replace(/[-\s]/g, '').toUpperCase();

    if (cleanPlate.length < 5 || cleanPlate.length > 10) {
      console.error('Invalid plate format');
      return new Response(
        JSON.stringify({ success: false, error: 'Format de plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- 1) Lecture du cache (jamais bloquante) ----
    if (!force && admin) {
      try {
        const { data: cached, error } = await admin
          .from('vehicle_cache')
          .select('found, data, expires_at, hit_count')
          .eq('plate', cleanPlate)
          .maybeSingle();

        if (error) throw error;

        if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
          // Incrément non bloquant
          admin
            .from('vehicle_cache')
            .update({ hit_count: (cached.hit_count ?? 0) + 1, last_hit_at: new Date().toISOString() })
            .eq('plate', cleanPlate)
            .then(({ error: e }) => { if (e) console.error('vehicle_cache hit update failed:', e.message); });

          console.log(`vehicle-lookup ${cleanPlate} source=cache found=${cached.found}`);
          return new Response(
            JSON.stringify({ success: true, data: cached.data ?? normalize(null) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('vehicle_cache read failed:', e instanceof Error ? e.message : e);
      }
    }

    // ---- 2) Les sources, dans l'ordre, jusqu'à ce que l'une réponde ----
    const sources = sourcesDisponibles();

    if (sources.length === 0) {
      // Panne de configuration: ne rien écrire dans le cache
      console.error('aucune source de plaques configurée');
      return new Response(
        JSON.stringify({ success: false, indisponible: true, error: 'Service non configuré' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!(await quotaAutorise(req))) {
      return new Response(
        JSON.stringify({
          success: false,
          indisponible: true,
          limite: true,
          error: 'Trop de recherches, veuillez saisir les informations manuellement',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pannes: string[] = [];

    for (const source of sources) {
      const issue = await source.interroger(cleanPlate);

      if (issue.sorte === 'panne') {
        console.error(`vehicle-lookup ${cleanPlate} source=${source.nom} panne: ${issue.detail}`);
        pannes.push(`${source.nom}: ${issue.detail}`);
        continue;
      }

      // Toutes les sources lisent le même fichier national : un véhicule
      // qu'elles ne connaissent pas, aucune autre ne le connaîtra. On s'arrête.
      if (issue.sorte === 'inconnu') {
        console.log(`vehicle-lookup ${cleanPlate} source=${source.nom} found=false`);
        if (admin) await writeCache(cleanPlate, false, null, TTL_NOT_FOUND_MS);
        return new Response(
          JSON.stringify({ success: false, indisponible: false, error: 'Véhicule inconnu' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedData = normalize(issue.brut);
      const found = isFilled(normalizedData.marque) || isFilled(normalizedData.puissance_fiscale);

      console.log(`vehicle-lookup ${cleanPlate} source=${source.nom} found=${found}`);

      // ---- 3) Écriture du cache ----
      if (admin) {
        await writeCache(
          cleanPlate,
          found,
          found ? normalizedData : null,
          found ? TTL_FOUND_MS : TTL_NOT_FOUND_MS
        );
      }

      // Contrat de réponse inchangé
      return new Response(
        JSON.stringify({ success: true, data: normalizedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Toutes les sources ont échoué. Surtout ne pas annoncer au client que son
    // véhicule n'existe pas, et ne rien écrire dans le cache : le dire
    // autrement, pour qu'il saisisse ses informations à la main.
    console.error(`vehicle-lookup ${cleanPlate} toutes les sources en panne`);
    return new Response(
      JSON.stringify({
        success: false,
        indisponible: true,
        error: 'Service indisponible',
        ...(diagnostic ? { detail: pannes.join(' | ') } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in vehicle-lookup:', error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function writeCache(plate: string, found: boolean, data: unknown, ttlMs: number) {
  if (!admin) return;
  try {
    const now = new Date();
    // On n'inclut pas hit_count ni last_hit_at dans le payload:
    //  - à l'insertion (nouvelle plaque), ils prennent leurs valeurs par défaut (0 / null);
    //  - en cas de conflit (rafraîchissement forcé d'une plaque déjà en cache),
    //    PostgREST ne met à jour que les colonnes présentes dans le payload,
    //    donc hit_count et last_hit_at sont préservés.
    const { error } = await admin.from('vehicle_cache').upsert({
      plate,
      found,
      data,
      fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlMs).toISOString(),
    }, { onConflict: 'plate' });
    if (error) throw error;
  } catch (e) {
    console.error('vehicle_cache write failed:', e instanceof Error ? e.message : e);
  }
}
