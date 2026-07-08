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
  genre?: string; // VP, CTTE, etc. — détermine la taxe parafiscale Y.2
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

