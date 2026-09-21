import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeParis } from "@/lib/dateFormat";
import { StickyNote } from "lucide-react";

// Notes de suivi de prospection d'un garage : écrites et lues par les
// prospecteurs et les administrateurs (mêmes fonctions en base, qui refusent
// tout autre rôle). Utilisé dans l'espace Prospection et dans la fiche garage.

export interface NoteProspection {
  id: string;
  auteur_email: string | null;
  contenu: string;
  rappel_le: string | null;
  created_at: string;
}

const jourCalendrier = (valeur: string | null | undefined) =>
  valeur ? new Date(`${valeur}T12:00:00`).toLocaleDateString("fr-FR") : "—";

// bind : sans lui, la méthode détachée perd son client et plante au premier appel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;

export function NotesProspection({ garageId, onNoteAjoutee }: { garageId: string; onNoteAjoutee?: () => void }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteProspection[]>([]);
  const [chargement, setChargement] = useState(true);
  const [nouvelleNote, setNouvelleNote] = useState("");
  const [rappel, setRappel] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const charger = useCallback(async () => {
    const { data } = await rpc("notes_prospection_garage", { p_garage_id: garageId });
    setNotes((data || []) as NoteProspection[]);
    setChargement(false);
  }, [garageId]);

  useEffect(() => {
    setChargement(true);
    setNotes([]);
    setNouvelleNote("");
    setRappel("");
    charger();
  }, [charger]);

  const ajouterNote = async () => {
    if (!nouvelleNote.trim()) {
      toast({ title: "Note vide", description: "Écrivez ce qui s'est dit avant d'enregistrer.", variant: "destructive" });
      return;
    }
    setEnregistrement(true);
    const { error } = await rpc("ajouter_note_prospection", {
      p_garage_id: garageId,
      p_contenu: nouvelleNote,
      p_rappel_le: rappel || null,
    });
    setEnregistrement(false);
    if (error) {
      toast({ title: "Note non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Note enregistrée" });
    setNouvelleNote("");
    setRappel("");
    await charger();
    onNoteAjoutee?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4" />Nouvelle note</p>
        <Textarea
          placeholder="Appelé le gérant, intéressé par les packs de jetons, rappeler mardi…"
          value={nouvelleNote}
          onChange={(e) => setNouvelleNote(e.target.value)}
          rows={3}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor={`rappel-${garageId}`} className="text-xs">Date de rappel (facultatif)</Label>
            <Input id={`rappel-${garageId}`} type="date" value={rappel} onChange={(e) => setRappel(e.target.value)} className="w-44" />
          </div>
          <Button type="button" onClick={ajouterNote} disabled={enregistrement}>
            {enregistrement ? "Enregistrement…" : "Enregistrer la note"}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="font-semibold">Historique</p>
        {chargement ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune note pour ce garage.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-md border p-3 text-sm">
              <p className="whitespace-pre-wrap">{n.contenu}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTimeParis(n.created_at)} · {n.auteur_email || "—"}
                {n.rappel_le ? ` · rappel le ${jourCalendrier(n.rappel_le)}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
