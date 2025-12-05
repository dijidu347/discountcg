import { supabase } from "@/integrations/supabase/client";

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
  vin?: string;
}

interface VehicleApiResponse {
  success: boolean;
  data?: NormalizedVehicleData;
  error?: string;
}

export async function getVehicleByPlate(plate: string): Promise<VehicleApiResponse> {
  // Nettoyer la plaque (enlever les espaces et tirets)
  const cleanPlate = plate.replace(/[-\s]/g, '');
  
  try {
    const { data, error } = await supabase.functions.invoke('vehicle-lookup', {
      body: { plate: cleanPlate }
    });

    if (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return {
        success: false,
        error: error.message || 'Erreur de connexion au service',
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erreur inconnue',
      };
    }

    return {
      success: true,
      data: data.data,
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
  const config: Record<string, number> = {};
  data.forEach((item) => {
    config[item.config_key] = item.config_value;
  });
  
  return {
    prix_par_cv: config.prix_par_cv ?? 42,
    taxe_co2_seuil: config.taxe_co2_seuil ?? 200,
    taxe_co2_montant: config.taxe_co2_montant ?? 20,
    frais_acheminement: config.frais_acheminement ?? 2.76,
    taxe_gestion: config.taxe_gestion ?? 11,
  };
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
