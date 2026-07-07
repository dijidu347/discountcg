import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const RAPIDAPI_HOST = 'api-simulateur-de-cout-carte-grise-france.p.rapidapi.com';

// Conversion sûre : l'API renvoie des strings ("8", "0", "138.00") → number
const num = (x: unknown): number => Number(x ?? 0) || 0;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const plaque = body?.plaque;
    const departement = body?.departement;
    // Type de démarche API (1 = changement titulaire occasion, cas principal)
    const demarche = body?.demarche ?? 1;

    // --- Validations ---
    if (!plaque || typeof plaque !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPlate = plaque.replace(/[-\s]/g, '');
    if (cleanPlate.length < 5 || cleanPlate.length > 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format de plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!departement || typeof departement !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Département requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Appel /calc avec timeout ---
    const url =
      `https://${RAPIDAPI_HOST}/calc?plaque=${encodeURIComponent(cleanPlate)}` +
      `&departement=${encodeURIComponent(departement)}` +
      `&demarche=${encodeURIComponent(String(demarche))}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
        signal: controller.signal,
      });
    } catch (e) {
      console.error('carte-grise-quote fetch error:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporairement indisponible' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error('carte-grise-quote API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: `Erreur API: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiResponse = await response.json();
    console.log('Raw /calc response:', JSON.stringify(apiResponse));

    // Erreur métier API (ex. { code:400, error:true, message:"Plaque non valide", data:[] })
    if (apiResponse?.error === true || apiResponse?.code !== 200) {
      return new Response(
        JSON.stringify({ success: false, error: apiResponse?.message || 'Erreur API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    const price = {
      regionale: num(p.y1),   // taxe régionale
      majoration: num(p.y2),  // y2
      malus: num(p.y3),       // malus CO2
      taxeFixe: num(p.y4),    // taxe fixe (~11 €)
      redevance: num(p.y5),   // redevance (~2,76 €)
      total: num(p.total),    // prix officiel complet
    };

    // SIV incomplet → l'API ne peut pas tarifer (filet manuel à venir, hors périmètre)
    const incomplete =
      price.total === 0 || vehicle.genre === 'INCONNU' || vehicle.puissance_fiscale === 0;

    return new Response(
      JSON.stringify({ success: true, data: { vehicle, price, incomplete } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in carte-grise-quote:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
