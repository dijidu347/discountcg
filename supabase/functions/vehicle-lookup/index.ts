import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const RAPIDAPI_HOST = 'api-de-plaque-d-immatriculation-france.p.rapidapi.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plate } = await req.json();

    if (!plate || typeof plate !== 'string') {
      console.error('Invalid plate provided:', plate);
      return new Response(
        JSON.stringify({ success: false, error: 'Plaque invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the plate (remove spaces and dashes)
    const cleanPlate = plate.replace(/[-\s]/g, '');
    
    // Validate plate format (basic check)
    if (cleanPlate.length < 5 || cleanPlate.length > 10) {
      console.error('Invalid plate format:', cleanPlate);
      return new Response(
        JSON.stringify({ success: false, error: 'Format de plaque invalide' }),
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

    console.log('Looking up vehicle for plate:', cleanPlate);

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/?plaque=${cleanPlate}`,
      {
        method: 'GET',
        headers: {
          'plaque': cleanPlate,
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('RapidAPI error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: `Erreur API: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiResponse = await response.json();
    console.log('Vehicle lookup successful for plate:', cleanPlate);
    
    // Normalize the data from the API
    const vehicleData = apiResponse.data;
    const normalizedData = {
      marque: vehicleData?.AWN_marque,
      modele: vehicleData?.AWN_modele,
      couleur: vehicleData?.AWN_couleur,
      puissance_fiscale: vehicleData?.AWN_puissance_fiscale,
      energie: vehicleData?.AWN_energie,
      date_mec: vehicleData?.AWN_date_mise_en_circulation,
      co2: vehicleData?.AWN_emission_co_2,
      immatriculation: vehicleData?.AWN_immat,
      vin: vehicleData?.AWN_vin,
    };

    return new Response(
      JSON.stringify({ success: true, data: normalizedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in vehicle-lookup:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
