// L'encart « note interne » d'une démarche.
//
// Une seule note par démarche, qu'on modifie au lieu d'en empiler. C'est la
// demande : savoir ce qui a été dit ou décidé sur CE dossier, pas en tenir un
// journal. L'encart dit qui a écrit et quand — « Ajouté le… », puis
// « Modifié le… » dès qu'on y revient.
//
// Elle n'est lisible que par les administrateurs : la table a ses propres
// droits, et le garage ne la voit nulle part. C'est pour cela qu'elle n'est pas
// une colonne de `demarches`, que le garage lit.
//
// Le prénom est saisi puis retenu dans le navigateur, comme pour les notes de
// prospection : plusieurs personnes partagent l'écran d'administration, et
// l'identifiant du compte ne dit pas qui tient le clavier.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StickyNote, Loader2, Pencil, Trash2 } from "lucide-react";
import { formatDateTimeParis } from "@/lib/dateFormat";

interface Note {
  contenu: string;
  auteur: string;
  created_at: string;
  updated_at: string | null;
}

const CLE_PRENOM = "admin.prenom";

// `src/integrations/supabase/types.ts` est engendré par Lovable et ne connaît
// pas encore `notes_demarche` : il sera régénéré à la prochaine synchronisation.
// Même contournement que pour `pieces_demandees` ailleurs dans le projet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase.from.bind(supabase) as unknown as (n: string) => any)("notes_demarche");

export function NoteInterne({ demarcheId }: { demarcheId: string }) {
  const { toast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [chargement, setChargement] = useState(true);
  const [edition, setEdition] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  // La suppression se confirme : une note effacée ne se retrouve nulle part.
  const [confirmeSuppression, setConfirmeSuppression] = useState(false);
  const [contenu, setContenu] = useState("");
  const [auteur, setAuteur] = useState(() => {
    try { return localStorage.getItem(CLE_PRENOM) ?? ""; } catch { return ""; }
  });

  const charger = useCallback(async () => {
    const { data } = await table()
      .select("contenu, auteur, created_at, updated_at")
      .eq("demarche_id", demarcheId)
      .maybeSingle();
    setNote((data as Note) ?? null);
    setContenu(data?.contenu ?? "");
    setChargement(false);
  }, [demarcheId]);

  useEffect(() => {
    setChargement(true);
    setEdition(false);
    charger();
  }, [charger]);

  const enregistrer = async () => {
    if (!contenu.trim()) {
      toast({ title: "Note vide", description: "Écrivez quelque chose avant d'enregistrer.", variant: "destructive" });
      return;
    }
    if (!auteur.trim()) {
      toast({ title: "Nom manquant", description: "Indiquez qui écrit cette note.", variant: "destructive" });
      return;
    }
    setEnregistrement(true);
    try { localStorage.setItem(CLE_PRENOM, auteur.trim()); } catch { /* navigation privée */ }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEnregistrement(false);
      toast({ title: "Session expirée", description: "Reconnectez-vous pour enregistrer.", variant: "destructive" });
      return;
    }

    // `upsert` sur la clé primaire : la première fois elle crée, ensuite elle
    // remplace — et le déclencheur en base pose `updated_at` sans toucher à la
    // date d'ajout.
    const { error } = await table()
      .upsert(
        { demarche_id: demarcheId, contenu: contenu.trim(), auteur: auteur.trim(), auteur_id: user.id },
        { onConflict: "demarche_id" },
      );

    setEnregistrement(false);
    if (error) {
      toast({ title: "Note non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    setEdition(false);
    charger();
  };

  const supprimer = async () => {
    const { error } = await table().delete().eq("demarche_id", demarcheId);
    if (error) {
      toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
      return;
    }
    setNote(null);
    setContenu("");
    setEdition(false);
    setConfirmeSuppression(false);
  };

  const signature = note
    ? note.updated_at
      ? `Modifié le ${formatDateTimeParis(note.updated_at)} par ${note.auteur}`
      : `Ajouté le ${formatDateTimeParis(note.created_at)} par ${note.auteur}`
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-amber-600" />
          Note interne
        </CardTitle>
        {note && !edition && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdition(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Modifier
            </Button>
            {confirmeSuppression ? (
              <>
                <Button variant="destructive" size="sm" onClick={supprimer}>
                  Confirmer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmeSuppression(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmeSuppression(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                Supprimer
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {chargement ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : note && !edition ? (
          <>
            <p className="whitespace-pre-wrap text-sm text-foreground">{note.contenu}</p>
            <p className="text-xs text-muted-foreground">{signature}</p>
          </>
        ) : (
          <>
            <Textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Ce qui a été dit, décidé, ou ce qu'il faut savoir sur ce dossier. Visible par l'équipe uniquement."
              rows={4}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={auteur}
                onChange={(e) => setAuteur(e.target.value)}
                placeholder="Votre prénom"
                className="w-40"
              />
              <Button size="sm" onClick={enregistrer} disabled={enregistrement}>
                {enregistrement && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
              {note && (
                <Button variant="ghost" size="sm" onClick={() => { setEdition(false); setContenu(note.contenu); }}>
                  Annuler
                </Button>
              )}
            </div>
            {signature && <p className="text-xs text-muted-foreground">{signature}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
