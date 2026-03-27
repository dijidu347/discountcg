import { Car, Wrench, Fuel, Settings, Truck, Wallet, type LucideIcon } from "lucide-react";

export interface CoffreCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
}

export const COFFRE_CATEGORIES: CoffreCategory[] = [
  { key: "achats_vehicules", label: "Achats véhicules", icon: Car, color: "bg-blue-100 text-blue-800", bgGradient: "from-blue-50 to-blue-100" },
  { key: "pieces_accessoires", label: "Pièces & accessoires", icon: Wrench, color: "bg-amber-100 text-amber-800", bgGradient: "from-amber-50 to-amber-100" },
  { key: "carburant", label: "Carburant", icon: Fuel, color: "bg-red-100 text-red-800", bgGradient: "from-red-50 to-red-100" },
  { key: "entretien", label: "Entretien / garage", icon: Settings, color: "bg-emerald-100 text-emerald-800", bgGradient: "from-emerald-50 to-emerald-100" },
  { key: "transport", label: "Transport / convoyage", icon: Truck, color: "bg-indigo-100 text-indigo-800", bgGradient: "from-indigo-50 to-indigo-100" },
  { key: "frais_divers", label: "Frais divers", icon: Wallet, color: "bg-purple-100 text-purple-800", bgGradient: "from-purple-50 to-purple-100" },
];

export function getCategoryInfo(key: string): CoffreCategory {
  return COFFRE_CATEGORIES.find(c => c.key === key) || COFFRE_CATEGORIES[5];
}
