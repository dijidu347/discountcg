import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const RAPIDAPI_HOST = 'api-simulateur-de-cout-carte-grise-france.p.rapidapi.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Règles par genre — miroir de src/utils/calculatePrice.ts (règles officielles 2026)
interface GenreRule { y1Coef: number; y2Fixed: number; ageDiscount: boolean; heavy?: boolean }
const GENRE_RULES: Record<string, GenreRule> = {
  VP:   { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true },
  CTTE: { y1Coef: 1,   y2Fixed: 34, ageDiscount: true },
  QM:   { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true },
  VASP: { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true },
  MTL:  { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false },
  MTT1: { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false },
  MTT2: { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false },
  MTL1: { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false },
  CL:   { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false },
  TRA:  { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false },
  REM:  { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false },
  SREM: { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false },
  CAM:  { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true, heavy: true },
  TRR:  { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true, heavy: true },
};

const num = (x: unknown): number => Number(x ?? 0) || 0;

const getVehicleAge = (dateStr: string): number => {
  if (!dateStr) return 0;
  let date: Date;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    date = parts[0].length === 4 ? new Date(dateStr) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else if (dateStr.includes('/')) {
    const p = dateStr.split('/');
    date = new Date(`${p[2]}-${p[1]}-${p[0]}`);
  } else return 0;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
  return age;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const plaque = body?.plaque;
    const departement = body?.departement;
    const demarche = body?.demarche ?? 1;

    if (!plaque || typeof plaque !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const cleanPlate = plaque.replace(/[-\s]/g, '');
    if (cleanPlate.length < 5 || cleanPlate.length > 10) {
      return new Response(JSON.stringify({ success: false, error: 'Format de plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!departement || typeof departement !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Département requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!RAPIDAPI_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Service non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Appel /calc
    const url = `https://${RAPIDAPI_HOST}/calc?plaque=${encodeURIComponent(cleanPlate)}` +
      `&departement=${encodeURIComponent(departement)}&demarche=${encodeURIComponent(String(demarche))}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'x-rapidapi-host': RAPIDAPI_HOST, 'x-rapidapi-key': RAPIDAPI_KEY },
        signal: controller.signal,
      });
    } catch (e) {
      console.error('carte-grise-quote fetch error:', e);
      return new Response(JSON.stringify({ success: false, error: 'Service temporairement indisponible' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } finally { clearTimeout(timeout); }

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: `Erreur API: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiResponse = await response.json();
    console.log('Raw /calc response:', JSON.stringify(apiResponse));

    if (apiResponse?.error === true || apiResponse?.code !== 200) {
      return new Response(JSON.stringify({ success: false, error: apiResponse?.message || 'Erreur API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const v = apiResponse?.data?.vehicle ?? {};
    const p = apiResponse?.data?.price ?? {};

    const vehicle = {
      marque: v.AWN_marque,
      modele: v.AWN_modele,
      label: v.AWN_label,
      energie: v.AWN_energie,
      genre: v.AWN_genre,
      carrosserie: v.AWN_carrosserie_carte_grise,
      puissance_fiscale: num(v.AWN_puissance_fiscale),
      puissance_chevaux: num(v.AWN_puissance_chevaux),
      co2: num(v.AWN_emission_co_2),
      date_mise_en_circulation: v.AWN_date_mise_en_circulation,
      immatriculation: v.AWN_immat,
      ptac: num(v.AWN_PTAC),
    };

    const apiPrice = {
      regionale: num(p.y1),
      majoration: num(p.y2),
      malus: num(p.y3),
      taxeFixe: num(p.y4),
      redevance: num(p.y5),
      total: num(p.total),
    };

    // Recalcul serveur selon le genre (source de vérité)
    let price = apiPrice;
    let incomplete = false;
    let reason: string | undefined;

    const genreKey = (vehicle.genre || '').toUpperCase();
    const rule = GENRE_RULES[genreKey];

    if (rule?.heavy || (genreKey === 'CTTE' && vehicle.ptac > 3500)) {
      incomplete = true;
      reason = 'heavy_vehicle';
    } else if (!rule || vehicle.puissance_fiscale === 0 || !vehicle.date_mise_en_circulation) {
      incomplete = true;
    } else {
      // Charger le tarif régional
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: tariff } = await supabase
        .from('department_tariffs')
        .select('tarif')
        .eq('code', departement)
        .maybeSingle();
      const tarif = num(tariff?.tarif);

      if (tarif > 0) {
        const anciennete = getVehicleAge(vehicle.date_mise_en_circulation);
        let prixCV = vehicle.puissance_fiscale * tarif * rule.y1Coef;
        if (rule.ageDiscount && anciennete >= 10) prixCV = prixCV * 0.5;
        const y2 = rule.y2Fixed;
        const fraisGestion = 11;
        const fraisAcheminement = 2.76;
        const sousTotal = prixCV + y2 + fraisGestion;
        const sousTotalArrondi = Math.ceil(Math.round(sousTotal * 100) / 100);
        const total = sousTotalArrondi + fraisAcheminement;

        price = {
          regionale: Math.round(prixCV * 100) / 100,
          majoration: y2,
          malus: 0,
          taxeFixe: fraisGestion,
          redevance: fraisAcheminement,
          total,
        };
      } else {
        incomplete = true;
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { vehicle, price, incomplete, reason, apiPrice } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in carte-grise-quote:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
