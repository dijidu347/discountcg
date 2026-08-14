import { z } from 'zod';

// Vehicle form validation schema
// Validation for French license plates (old and new format)
const immatriculationRegex = /^([A-Z]{2}-[0-9]{3}-[A-Z]{2})|([0-9]{1,4}\s?[A-Z]{1,3}\s?[0-9]{1,2})$/;

export const vehicleSchema = z.object({
  immatriculation: z.string()
    .trim()
    .min(1, { message: "L'immatriculation est obligatoire" })
    .transform(val => val.toUpperCase())
    .refine(val => immatriculationRegex.test(val), { 
      message: "Format invalide. Nouveau: AA-123-AA | Ancien: 123 ABC 45" 
    }),
  numero_formule: z.string().max(100).optional(),
  marque: z.string().max(100).optional(),
  modele: z.string().max(100).optional(),
  carrosserie: z.string().max(50).optional(),
  co2: z.number().min(0).max(9999).optional().nullable(),
  couleur: z.string().max(50).optional(),
  cylindree: z.number().min(0).max(99999).optional().nullable(),
  date_cg: z.string().optional().nullable(),
  date_mec: z.string().optional().nullable(),
  energie: z.string().max(50).optional(),
  genre: z.string().max(50).optional(),
  puiss_ch: z.number().min(0).max(9999).optional().nullable(),
  puiss_fisc: z.number().min(0).max(999).optional().nullable(),
  type: z.string().max(100).optional(),
  version: z.string().max(200).optional(),
  vin: z.string()
    .max(17, { message: "Le VIN ne peut pas dépasser 17 caractères" })
    .regex(/^[A-Z0-9]*$/, { message: "Format VIN invalide" })
    .optional()
    .nullable(),
  ptr: z.number().min(0).max(99999).optional().nullable(),
});

// Contact form validation schema
export const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Le nom est obligatoire" })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères" }),
  phone: z.string()
    .trim()
    .min(10, { message: "Numéro de téléphone invalide" })
    .max(20, { message: "Numéro de téléphone trop long" })
    .regex(/^[0-9+\s()-]+$/, { message: "Format de téléphone invalide" }),
  email: z.string()
    .trim()
    .email({ message: "Email invalide" })
    .max(255, { message: "L'email ne peut pas dépasser 255 caractères" }),
  service: z.string()
    .min(1, { message: "Veuillez sélectionner un type de demande" }),
  plate: z.string()
    .trim()
    .max(17, { message: "L'immatriculation ne peut pas dépasser 17 caractères" })
    .regex(/^[A-Z0-9-]*$/, { message: "Format d'immatriculation invalide" })
    .optional(),
  message: z.string()
    .max(2000, { message: "Le message ne peut pas dépasser 2000 caractères" })
    .optional(),
});

// Password change validation schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string()
    .min(1, { message: "Le mot de passe actuel est obligatoire" }),
  newPassword: z.string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre" 
    }),
  confirmPassword: z.string()
    .min(1, { message: "Veuillez confirmer le mot de passe" })
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Garage profile validation schema — édition des coordonnées côté admin.
// TOUS ces champs sont NOT NULL en base (migration 20251107143723) : le
// formulaire ne doit jamais pouvoir envoyer une chaîne vide, sans quoi Postgres
// renvoie une violation NOT NULL brute.
// La règle SIRET reprend celle de CompleteProfile.tsx (14 chiffres, espaces
// tolérés à la saisie puis retirés) ; email et téléphone reprennent celles de
// contactSchema ci-dessus.
export const garageSchema = z.object({
  raison_sociale: z.string()
    .trim()
    .min(1, { message: "La raison sociale est obligatoire" })
    .max(200, { message: "La raison sociale ne peut pas dépasser 200 caractères" }),
  siret: z.string()
    .transform(val => val.replace(/\s/g, ''))
    .refine(val => /^\d{14}$/.test(val), {
      message: "Le numéro SIRET doit contenir exactement 14 chiffres",
    }),
  adresse: z.string()
    .trim()
    .min(1, { message: "L'adresse est obligatoire" })
    .max(255, { message: "L'adresse ne peut pas dépasser 255 caractères" }),
  code_postal: z.string()
    .trim()
    .min(1, { message: "Le code postal est obligatoire" })
    .max(10, { message: "Code postal invalide" }),
  ville: z.string()
    .trim()
    .min(1, { message: "La ville est obligatoire" })
    .max(100, { message: "La ville ne peut pas dépasser 100 caractères" }),
  telephone: z.string()
    .trim()
    .min(1, { message: "Le téléphone est obligatoire" })
    .max(20, { message: "Numéro de téléphone trop long" })
    .regex(/^[0-9+\s()-]+$/, { message: "Format de téléphone invalide" }),
  email: z.string()
    .trim()
    .min(1, { message: "L'email est obligatoire" })
    .email({ message: "Email invalide" })
    .max(255, { message: "L'email ne peut pas dépasser 255 caractères" }),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type GarageFormData = z.infer<typeof garageSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
