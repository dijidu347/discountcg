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

// Calcul du prix de la carte grise
export function calculateCarteGrisePrice(vehicleData: NormalizedVehicleData, region: string = 'Île-de-France'): number {
  const puissanceFiscale = vehicleData.puissance_fiscale || 5;
  
  // Prix moyen par CV fiscal (varie selon les régions, ici moyenne nationale)
  const prixParCV = 42; // euros
  
  // Taxe CO2 (exemple simplifié)
  const co2 = vehicleData.co2 || 120;
  let taxeCO2 = 0;
  if (co2 > 200) {
    taxeCO2 = (co2 - 200) * 20;
  }
  
  // Taxe régionale
  const taxeRegionale = puissanceFiscale * prixParCV;
  
  // Frais fixes
  const fraisAcheminement = 2.76;
  const taxeGestion = 11;
  
  const total = taxeRegionale + taxeCO2 + fraisAcheminement + taxeGestion;
  
  return Math.round(total * 100) / 100;
}
