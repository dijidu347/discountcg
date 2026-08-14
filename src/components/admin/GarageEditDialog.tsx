import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { garageSchema } from "@/lib/validations";
import { getSupabaseErrorMessage } from "@/lib/error-messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Champs de coordonnées éditables par l'admin. Volontairement limité : ni
 * is_verified, ni token_balance, ni is_gold, ni unlimited_free_tokens, ni
 * user_id, ni reseau — ce sont des champs métier sensibles, qui n'ont rien à
 * faire dans un formulaire de correction de coordonnées et se pilotent depuis
 * les actions dédiées de l'écran "Gérer les garages".
 *
 * Le payload envoyé à Supabase étant la sortie de `garageSchema`, cette
 * limitation est structurelle : aucun autre champ ne peut s'y glisser.
 */
export const EDITABLE_GARAGE_FIELDS = [
  "raison_sociale",
  "siret",
  "adresse",
  "code_postal",
  "ville",
  "telephone",
  "email",
] as const;

export type EditableGarageField = (typeof EDITABLE_GARAGE_FIELDS)[number];

export type GarageEditForm = Record<EditableGarageField, string>;

const EMPTY_GARAGE_FORM: GarageEditForm = {
  raison_sociale: "",
  siret: "",
  adresse: "",
  code_postal: "",
  ville: "",
  telephone: "",
  email: "",
};

export const GARAGE_FIELD_LABELS: Record<EditableGarageField, string> = {
  raison_sociale: "Raison sociale",
  siret: "SIRET",
  adresse: "Adresse",
  code_postal: "Code postal",
  ville: "Ville",
  telephone: "Téléphone",
  email: "Email",
};

interface GarageEditDialogProps {
  /** Garage à éditer. `null` tant qu'aucune ligne n'est sélectionnée. */
  garage: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reçoit la ligne RELUE EN BASE après un enregistrement confirmé. */
  onSaved?: (updated: Record<string, any>) => void;
}

export function GarageEditDialog({
  garage,
  open,
  onOpenChange,
  onSaved,
}: GarageEditDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<GarageEditForm>(EMPTY_GARAGE_FORM);
  const [errors, setErrors] = useState<Partial<Record<EditableGarageField, string>>>({});
  const [saving, setSaving] = useState(false);

  // (Ré)initialise le formulaire à chaque ouverture sur un garage donné, pour
  // ne jamais réafficher les saisies d'une édition précédente.
  useEffect(() => {
    if (!open || !garage) return;
    setForm({
      raison_sociale: garage.raison_sociale ?? "",
      siret: garage.siret ?? "",
      adresse: garage.adresse ?? "",
      code_postal: garage.code_postal ?? "",
      ville: garage.ville ?? "",
      telephone: garage.telephone ?? "",
      email: garage.email ?? "",
    });
    setErrors({});
  }, [open, garage]);

  const handleSave = async () => {
    if (!garage) return;

    const parsed = garageSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<EditableGarageField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as EditableGarageField;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const values = parsed.data;

      // Le .select() est ce qui rend l'opération vérifiable : il renvoie la ligne
      // TELLE QU'ELLE EST EN BASE après l'UPDATE (clause RETURNING). Sans lui, un
      // UPDATE qui ne matche AUCUNE ligne — id introuvable, ou politique RLS qui
      // filtre la ligne — ne lève AUCUNE erreur côté PostgREST : on afficherait un
      // "Enregistré" mensonger sur une écriture qui n'a rien écrit.
      const { data: updated, error } = await supabase
        .from("garages")
        .update(values)
        .eq("id", garage.id)
        .select("id, raison_sociale, siret, adresse, code_postal, ville, telephone, email")
        .maybeSingle();

      if (error) {
        toast({
          title: "Échec de l'enregistrement",
          description: getSupabaseErrorMessage(error),
          variant: "destructive",
        });
        return;
      }

      if (!updated) {
        toast({
          title: "Échec de l'enregistrement",
          description:
            "Aucune ligne n'a été modifiée. Le garage est introuvable ou vos droits ne permettent pas cette modification. Rien n'a été enregistré.",
          variant: "destructive",
        });
        return;
      }

      // Relecture champ par champ : on compare ce que la base a réellement
      // persisté avec ce qu'on a soumis. Attrape le cas où l'écriture aboutit
      // mais qu'une valeur n'a pas pris.
      const divergents = EDITABLE_GARAGE_FIELDS.filter(
        (field) => (updated as any)[field] !== values[field]
      );

      if (divergents.length > 0) {
        toast({
          title: "Enregistrement incomplet",
          description: `La base n'a pas retenu : ${divergents
            .map((f) => GARAGE_FIELD_LABELS[f])
            .join(", ")}. Vérifiez la fiche avant de réessayer.`,
          variant: "destructive",
        });
        onSaved?.(updated);
        return;
      }

      toast({
        title: "Garage mis à jour",
        description: `Les coordonnées de ${updated.raison_sociale} ont été enregistrées.`,
      });

      onOpenChange(false);
      onSaved?.(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setErrors({});
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le garage</DialogTitle>
          <DialogDescription>
            Correction des coordonnées uniquement. La vérification, les jetons et le
            statut Gold se gèrent depuis les actions dédiées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {EDITABLE_GARAGE_FIELDS.map((field) => (
            <div key={field}>
              <Label htmlFor={`garage-${field}`}>{GARAGE_FIELD_LABELS[field]}</Label>
              <Input
                id={`garage-${field}`}
                type={field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                className="mt-1"
                aria-invalid={!!errors[field]}
              />
              {errors[field] && (
                <p className="text-xs text-destructive mt-1">{errors[field]}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
