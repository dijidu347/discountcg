export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_documents: {
        Row: {
          action_id: string
          created_at: string
          id: string
          nom_document: string
          obligatoire: boolean
          ordre: number
        }
        Insert: {
          action_id: string
          created_at?: string
          id?: string
          nom_document: string
          obligatoire?: boolean
          ordre?: number
        }
        Update: {
          action_id?: string
          created_at?: string
          id?: string
          nom_document?: string
          obligatoire?: boolean
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "action_documents_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions_rapides"
            referencedColumns: ["id"]
          },
        ]
      }
      actions_rapides: {
        Row: {
          actif: boolean
          code: string
          couleur: string
          created_at: string
          description: string | null
          id: string
          ordre: number
          prix: number
          require_immatriculation: boolean
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          code: string
          couleur?: string
          created_at?: string
          description?: string | null
          id?: string
          ordre?: number
          prix?: number
          require_immatriculation?: boolean
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          code?: string
          couleur?: string
          created_at?: string
          description?: string | null
          id?: string
          ordre?: number
          prix?: number
          require_immatriculation?: boolean
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      demarches: {
        Row: {
          commentaire: string | null
          created_at: string
          documents_complets: boolean | null
          facture_id: string | null
          frais_dossier: number | null
          garage_id: string
          id: string
          immatriculation: string
          is_draft: boolean | null
          montant_ht: number | null
          montant_ttc: number | null
          numero_demarche: string | null
          paye: boolean | null
          status: Database["public"]["Enums"]["demarche_status"]
          type: Database["public"]["Enums"]["demarche_type"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vehicule_id: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          documents_complets?: boolean | null
          facture_id?: string | null
          frais_dossier?: number | null
          garage_id: string
          id?: string
          immatriculation: string
          is_draft?: boolean | null
          montant_ht?: number | null
          montant_ttc?: number | null
          numero_demarche?: string | null
          paye?: boolean | null
          status?: Database["public"]["Enums"]["demarche_status"]
          type: Database["public"]["Enums"]["demarche_type"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_id?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          documents_complets?: boolean | null
          facture_id?: string | null
          frais_dossier?: number | null
          garage_id?: string
          id?: string
          immatriculation?: string
          is_draft?: boolean | null
          montant_ht?: number | null
          montant_ttc?: number | null
          numero_demarche?: string | null
          paye?: boolean | null
          status?: Database["public"]["Enums"]["demarche_status"]
          type?: Database["public"]["Enums"]["demarche_type"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demarches_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demarches_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demarches_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          demarche_id: string
          document_type: string | null
          id: string
          nom_fichier: string
          taille_octets: number | null
          type_document: string
          url: string
          validated_at: string | null
          validated_by: string | null
          validation_comment: string | null
          validation_status: string | null
        }
        Insert: {
          created_at?: string
          demarche_id: string
          document_type?: string | null
          id?: string
          nom_fichier: string
          taille_octets?: number | null
          type_document: string
          url: string
          validated_at?: string | null
          validated_by?: string | null
          validation_comment?: string | null
          validation_status?: string | null
        }
        Update: {
          created_at?: string
          demarche_id?: string
          document_type?: string | null
          id?: string
          nom_fichier?: string
          taille_octets?: number | null
          type_document?: string
          url?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_comment?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_demarche_id_fkey"
            columns: ["demarche_id"]
            isOneToOne: false
            referencedRelation: "demarches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          description: string | null
          html_content: string
          id: string
          subject: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          html_content: string
          id?: string
          subject: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          html_content?: string
          id?: string
          subject?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      factures: {
        Row: {
          created_at: string
          demarche_id: string
          garage_id: string
          id: string
          montant_ht: number
          montant_ttc: number
          numero: string
          pdf_url: string | null
          tva: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          demarche_id: string
          garage_id: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          numero: string
          pdf_url?: string | null
          tva?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          demarche_id?: string
          garage_id?: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          numero?: string
          pdf_url?: string | null
          tva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_demarche_id_fkey"
            columns: ["demarche_id"]
            isOneToOne: false
            referencedRelation: "demarches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          adresse: string
          code_postal: string
          created_at: string
          email: string
          id: string
          is_gold: boolean | null
          is_verified: boolean | null
          raison_sociale: string
          siret: string
          telephone: string
          updated_at: string
          user_id: string
          verification_requested_at: string | null
          ville: string
        }
        Insert: {
          adresse: string
          code_postal: string
          created_at?: string
          email: string
          id?: string
          is_gold?: boolean | null
          is_verified?: boolean | null
          raison_sociale: string
          siret: string
          telephone: string
          updated_at?: string
          user_id: string
          verification_requested_at?: string | null
          ville: string
        }
        Update: {
          adresse?: string
          code_postal?: string
          created_at?: string
          email?: string
          id?: string
          is_gold?: boolean | null
          is_verified?: boolean | null
          raison_sociale?: string
          siret?: string
          telephone?: string
          updated_at?: string
          user_id?: string
          verification_requested_at?: string | null
          ville?: string
        }
        Relationships: []
      }
      guest_order_documents: {
        Row: {
          created_at: string
          id: string
          nom_fichier: string
          order_id: string
          taille_octets: number | null
          type_document: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom_fichier: string
          order_id: string
          taille_octets?: number | null
          type_document: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          nom_fichier?: string
          order_id?: string
          taille_octets?: number | null
          type_document?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_guest_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "guest_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_orders: {
        Row: {
          adresse: string
          code_postal: string
          commentaire: string | null
          created_at: string
          date_mec: string | null
          documents_complets: boolean
          email: string
          email_notifications: boolean
          energie: string | null
          frais_dossier: number
          id: string
          immatriculation: string
          marque: string | null
          modele: string | null
          montant_ht: number
          montant_ttc: number
          nom: string
          paid_at: string | null
          paye: boolean
          payment_intent_id: string | null
          prenom: string
          puiss_fisc: number | null
          sms_notifications: boolean
          status: string
          telephone: string
          tracking_number: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          ville: string
        }
        Insert: {
          adresse: string
          code_postal: string
          commentaire?: string | null
          created_at?: string
          date_mec?: string | null
          documents_complets?: boolean
          email: string
          email_notifications?: boolean
          energie?: string | null
          frais_dossier?: number
          id?: string
          immatriculation: string
          marque?: string | null
          modele?: string | null
          montant_ht?: number
          montant_ttc?: number
          nom: string
          paid_at?: string | null
          paye?: boolean
          payment_intent_id?: string | null
          prenom: string
          puiss_fisc?: number | null
          sms_notifications?: boolean
          status?: string
          telephone: string
          tracking_number: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          ville: string
        }
        Update: {
          adresse?: string
          code_postal?: string
          commentaire?: string | null
          created_at?: string
          date_mec?: string | null
          documents_complets?: boolean
          email?: string
          email_notifications?: boolean
          energie?: string | null
          frais_dossier?: number
          id?: string
          immatriculation?: string
          marque?: string | null
          modele?: string | null
          montant_ht?: number
          montant_ttc?: number
          nom?: string
          paid_at?: string | null
          paye?: boolean
          payment_intent_id?: string | null
          prenom?: string
          puiss_fisc?: number | null
          sms_notifications?: boolean
          status?: string
          telephone?: string
          tracking_number?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          ville?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          demarche_id: string | null
          garage_id: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          demarche_id?: string | null
          garage_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          demarche_id?: string | null
          garage_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_demarche_id_fkey"
            columns: ["demarche_id"]
            isOneToOne: false
            referencedRelation: "demarches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_at: string
          demarche_id: string
          garage_id: string
          id: string
          montant: number
          status: Database["public"]["Enums"]["paiement_status"]
          stripe_payment_id: string | null
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          demarche_id: string
          garage_id: string
          id?: string
          montant: number
          status?: Database["public"]["Enums"]["paiement_status"]
          stripe_payment_id?: string | null
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          demarche_id?: string
          garage_id?: string
          id?: string
          montant?: number
          status?: Database["public"]["Enums"]["paiement_status"]
          stripe_payment_id?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_demarche_id_fkey"
            columns: ["demarche_id"]
            isOneToOne: false
            referencedRelation: "demarches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          garage_id: string
          id: string
          margin_percentage: number | null
          plan_type: string
          price_per_demarche: number
          start_date: string | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          garage_id: string
          id?: string
          margin_percentage?: number | null
          plan_type: string
          price_per_demarche: number
          start_date?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          garage_id?: string
          id?: string
          margin_percentage?: number | null
          plan_type?: string
          price_per_demarche?: number
          start_date?: string | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_services: {
        Row: {
          created_at: string | null
          demarche_id: string
          id: string
          notes: string | null
          price: number
          service_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          demarche_id: string
          id?: string
          notes?: string | null
          price: number
          service_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          demarche_id?: string
          id?: string
          notes?: string | null
          price?: number
          service_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_services_demarche_id_fkey"
            columns: ["demarche_id"]
            isOneToOne: true
            referencedRelation: "demarches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          carrosserie: string | null
          co2: number | null
          couleur: string | null
          created_at: string
          cylindree: number | null
          date_cg: string | null
          date_mec: string | null
          energie: string | null
          garage_id: string
          genre: string | null
          id: string
          immatriculation: string
          marque: string | null
          modele: string | null
          numero_formule: string | null
          ptr: number | null
          puiss_ch: number | null
          puiss_fisc: number | null
          type: string | null
          version: string | null
          vin: string | null
        }
        Insert: {
          carrosserie?: string | null
          co2?: number | null
          couleur?: string | null
          created_at?: string
          cylindree?: number | null
          date_cg?: string | null
          date_mec?: string | null
          energie?: string | null
          garage_id: string
          genre?: string | null
          id?: string
          immatriculation: string
          marque?: string | null
          modele?: string | null
          numero_formule?: string | null
          ptr?: number | null
          puiss_ch?: number | null
          puiss_fisc?: number | null
          type?: string | null
          version?: string | null
          vin?: string | null
        }
        Update: {
          carrosserie?: string | null
          co2?: number | null
          couleur?: string | null
          created_at?: string
          cylindree?: number | null
          date_cg?: string | null
          date_mec?: string | null
          energie?: string | null
          garage_id?: string
          genre?: string | null
          id?: string
          immatriculation?: string
          marque?: string | null
          modele?: string | null
          numero_formule?: string | null
          ptr?: number | null
          puiss_ch?: number | null
          puiss_fisc?: number | null
          type?: string | null
          version?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          created_at: string | null
          document_type: string
          garage_id: string
          id: string
          nom_fichier: string
          rejection_reason: string | null
          status: string
          url: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          garage_id: string
          id?: string
          nom_fichier: string
          rejection_reason?: string | null
          status?: string
          url: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          garage_id?: string
          id?: string
          nom_fichier?: string
          rejection_reason?: string | null
          status?: string
          url?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_demarche_numero: { Args: never; Returns: string }
      generate_facture_numero: { Args: never; Returns: string }
      generate_tracking_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "garage"
      demarche_status:
        | "en_saisie"
        | "en_attente"
        | "paye"
        | "valide"
        | "finalise"
        | "refuse"
      demarche_type: "DA" | "DC" | "CG" | "CG_DA" | "DA_DC" | "CG_IMPORT"
      paiement_status: "en_attente" | "valide" | "refuse" | "rembourse"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "garage"],
      demarche_status: [
        "en_saisie",
        "en_attente",
        "paye",
        "valide",
        "finalise",
        "refuse",
      ],
      demarche_type: ["DA", "DC", "CG", "CG_DA", "DA_DC", "CG_IMPORT"],
      paiement_status: ["en_attente", "valide", "refuse", "rembourse"],
    },
  },
} as const
