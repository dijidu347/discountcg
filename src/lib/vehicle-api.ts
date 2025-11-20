interface VehicleData {
  AWN_marque?: string;
  AWN_modele?: string;
  AWN_couleur?: string;
  AWN_puissance_fiscale?: number;
  AWN_energie?: string;
  AWN_date_mise_en_circulation?: string;
  AWN_emission_co_2?: number;
  AWN_immat?: string;
  [key: string]: any;
}

// Interface normalisée pour l'utilisation dans l'app
export interface NormalizedVehicleData {
  marque?: string;
  modele?: string;
  couleur?: string;
  puissance_fiscale?: number;
  energie?: string;
  date_mec?: string;
  co2?: number;
  immatriculation?: string;
}

interface VehicleApiResponse {
  success: boolean;
  data?: NormalizedVehicleData;
  error?: string;
}

const RAPIDAPI_KEY = '29f486f281msh5fd7364cad32da7p1b6afajsn9b2eeb4e02ed';
const RAPIDAPI_HOST = 'api-de-plaque-d-immatriculation-france.p.rapidapi.com';

export async function getVehicleByPlate(plate: string): Promise<VehicleApiResponse> {
  // Nettoyer la plaque (enlever les espaces et tirets)
  const cleanPlate = plate.replace(/[-\s]/g, '');
  
  try {
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
      throw new Error(`Erreur API: ${response.status}`);
    }

    const apiResponse = await response.json();
    
    // Normaliser les données de l'API
    const vehicleData = apiResponse.data;
    const normalizedData: NormalizedVehicleData = {
      marque: vehicleData?.AWN_marque,
      modele: vehicleData?.AWN_modele,
      couleur: vehicleData?.AWN_couleur,
      puissance_fiscale: vehicleData?.AWN_puissance_fiscale,
      energie: vehicleData?.AWN_energie,
      date_mec: vehicleData?.AWN_date_mise_en_circulation,
      co2: vehicleData?.AWN_emission_co_2,
      immatriculation: vehicleData?.AWN_immat,
    };
    
    return {
      success: true,
      data: normalizedData,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Interface pour la configuration des prix
interface PricingConfig {
  prix_par_cv: number;
  taxe_co2_seuil: number;
  taxe_co2_montant: number;
  frais_acheminement: number;
  taxe_gestion: number;
}

// Récupérer la configuration des prix depuis la base de données
export async function getPricingConfig(): Promise<PricingConfig> {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data, error } = await supabase
    .from("pricing_config")
    .select("config_key, config_value");
  
  if (error || !data) {
    console.error("Erreur lors de la récupération des tarifs:", error);
    // Valeurs par défaut en cas d'erreur
    return {
      prix_par_cv: 42,
      taxe_co2_seuil: 200,
      taxe_co2_montant: 20,
      frais_acheminement: 2.76,
      taxe_gestion: 11,
    };
  }
  
  // Convertir le tableau en objet
  const config: any = {};
  data.forEach((item) => {
    config[item.config_key] = item.config_value;
  });
  
  return config as PricingConfig;
}

// Calcul du prix de la carte grise
export async function calculateCarteGrisePrice(vehicleData: NormalizedVehicleData, region: string = 'Île-de-France'): Promise<number> {
  const config = await getPricingConfig();
  
  const puissanceFiscale = vehicleData.puissance_fiscale || 5;
  
  // Taxe CO2
  const co2 = vehicleData.co2 || 120;
  let taxeCO2 = 0;
  if (co2 > config.taxe_co2_seuil) {
    taxeCO2 = (co2 - config.taxe_co2_seuil) * config.taxe_co2_montant;
  }
  
  // Taxe régionale
  const taxeRegionale = puissanceFiscale * config.prix_par_cv;
  
  // Total
  const total = taxeRegionale + taxeCO2 + config.frais_acheminement + config.taxe_gestion;
  
  return Math.round(total * 100) / 100;
}

// Récupérer les frais de dossier depuis la base de données
export async function getFraisDossier(): Promise<number> {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data, error } = await supabase
    .from("pricing_config")
    .select("config_value")
    .eq("config_key", "frais_dossier")
    .single();
  
  if (error || !data) {
    console.error("Erreur lors de la récupération des frais de dossier:", error);
    return 30; // Valeur par défaut
  }
  
  return data.config_value;
}
