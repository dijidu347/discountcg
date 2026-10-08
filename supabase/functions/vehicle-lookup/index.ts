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

// auto-ways écrit « INCONNU » ou « 0 » quand il ne sait pas : on rend alors
// undefined, pour qu'un consommateur ne prenne pas l'absence pour une valeur.
function texte(x: unknown): string | undefined {
  if (x === null || x === undefined) return undefined;
  const s = String(x).trim();
  return s === '' || s.toUpperCase() === 'INCONNU' ? undefined : s;
}
function nombre(x: unknown): number | undefined {
  const s = texte(x);
  if (s === undefined) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function liste(x: unknown): string[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const l = x.map(texte).filter((s): s is string => !!s);
  return l.length ? l : undefined;
}

function normalize(apiResponse: any): NormalizedVehicle & Record<string, unknown> {
  // Les trois formes rencontrées selon la source : les champs à la racine, sous
  // « data », ou sous « data » dans un tableau d'un seul élément.
  let v = apiResponse?.data ?? apiResponse;
  if (Array.isArray(v)) v = v[0];
  return {
    // ---- Champs historiques : noms et valeurs inchangés ----
    marque: v?.AWN_marque,
    modele: v?.AWN_modele,
    couleur: v?.AWN_couleur,
    puissance_fiscale: v?.AWN_puissance_fiscale,
    energie: v?.AWN_energie,
    date_mec: dateIso(v?.AWN_date_mise_en_circulation),
    co2: v?.AWN_emission_co_2,
    immatriculation: v?.AWN_immat,
    // auto-ways l'écrit « AWN_VIN » : l'ancienne lecture rendait toujours vide.
    vin: v?.AWN_vin ?? v?.AWN_VIN,
    genre: v?.AWN_genre,
    // ---- Champs ajoutés ----
    version: texte(v?.AWN_version),
    finition: texte(v?.AWN_finition),
    libelle: texte(v?.AWN_label),
    nom_commercial: texte(v?.AWN_nom_commercial),
    genre_libelle: texte(v?.AWN_genre_label),
    categorie_ce: texte(v?.AWN_categorie_vehicule),
    carrosserie: texte(v?.AWN_carrosserie),
    carrosserie_cg: texte(v?.AWN_carrosserie_carte_grise),
    style_carrosserie: texte(v?.AWN_style_carrosserie),
    nb_portes: nombre(v?.AWN_nbr_portes),
    nb_places: nombre(v?.AWN_nbr_de_places),
    boite_vitesses: texte(v?.AWN_type_boite_vites),
    nb_vitesses: nombre(v?.AWN_nbr_vitesses),
    code_boite: texte(v?.AWN_code_de_boite_de_vitesses),
    transmission: texte(v?.AWN_mode_transmission_label),
    puissance_din: nombre(v?.AWN_puissance_chevaux),
    puissance_kw: nombre(v?.AWN_puissance_KW),
    cylindree: nombre(v?.AWN_cylindre_capacite),
    nb_cylindres: nombre(v?.AWN_nbr_cylindres),
    moteur: texte(v?.AWN_label_moteur),
    code_moteur: texte(v?.AWN_code_moteur),
    turbo: texte(v?.AWN_turbo_compressor),
    energie_cg: texte(v?.AWN_energie_cg),
    norme_euro: texte(v?.AWN_norme_euro),
    type_mine: texte(v?.AWN_type_mine),
    cnit: texte(v?.AWN_type_variante_version),
    codes_sra: liste(v?.AWN_codes_sra),
    ptac: nombre(v?.AWN_PTAC),
    date_cg: dateIso(texte(v?.AWN_date_cg)),
    annee_debut_modele: nombre(v?.AWN_annee_de_debut_modele),
    annee_fin_modele: nombre(v?.AWN_annee_de_fin_modele),
    vitesse_max: nombre(v?.AWN_max_speed),
    prix_neuf: nombre(v?.AWN_prix),
  };
}

// La partie utile de la réponse du fournisseur, sans l'enveloppe.
function partieBrute(apiResponse: any): unknown {
  let v = apiResponse?.data ?? apiResponse;
  if (Array.isArray(v)) v = v[0];
  return v ?? null;
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
          .select('found, data, brut, expires_at, hit_count')
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
            JSON.stringify({
              success: true,
              // Avec un brut, la normalisation est recalculée : l'enrichir ne coûte aucun appel.
              data: cached.brut ? { ...(cached.data ?? {}), ...normalize(cached.brut) } : (cached.data ?? normalize(null)),
              brut: cached.brut ?? null,
              // D'où vient la réponse, et si un fournisseur payant a été atteint.
              provenance: { source: 'cache', fournisseur_contacte: false },
            }),
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
        JSON.stringify({
          success: false, indisponible: true, error: 'Service non configuré',
          provenance: { source: 'aucune', fournisseur_contacte: false },
        }),
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
          // Refusé par le plafond : aucun fournisseur n'a été atteint, rien n'a coûté.
          provenance: { source: 'aucune', fournisseur_contacte: false },
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
      const brut = partieBrute(issue.brut);
      const found = isFilled(normalizedData.marque) || isFilled(normalizedData.puissance_fiscale);

      console.log(`vehicle-lookup ${cleanPlate} source=${source.nom} found=${found}`);

      // ---- 3) Écriture du cache ----
      if (admin) {
        await writeCache(
          cleanPlate,
          found,
          found ? normalizedData : null,
          found ? TTL_FOUND_MS : TTL_NOT_FOUND_MS,
          brut,
        );
      }

      // Contrat de réponse inchangé
      return new Response(
        JSON.stringify({ success: true, data: normalizedData, brut }),
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

async function writeCache(plate: string, found: boolean, data: unknown, ttlMs: number, brut: unknown = null) {
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
      brut,
      fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlMs).toISOString(),
    }, { onConflict: 'plate' });
    if (error) throw error;
  } catch (e) {
    console.error('vehicle_cache write failed:', e instanceof Error ? e.message : e);
  }
}
