// Les notes internes d'une démarche.
//
// Plusieurs notes, pas une seule : un dossier se suit sur plusieurs jours, et
// écraser la précédente ferait perdre ce qui s'est passé entre-temps. Chacune
// porte son auteur et sa date — « Ajouté le… », puis « Modifié le… » si on y
// revient — et se modifie ou se supprime indépendamment.
//
// Elles ne sont lisibles que par les administrateurs : la table a ses propres
// droits, et le garage ne les voit nulle part. C'est pour cela qu'elles ne sont
// pas une colonne de `demarches`, que le garage lit.
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
import { StickyNote, Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { formatDateTimeParis } from "@/lib/dateFormat";

interface Note {
  id: string;
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

function signatureDe(n: Note): string {
  return n.updated_at
    ? `Modifié le ${formatDateTimeParis(n.updated_at)} par ${n.auteur}`
    : `Ajouté le ${formatDateTimeParis(n.created_at)} par ${n.auteur}`;
}

export function NoteInterne({ demarcheId }: { demarcheId: string }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);

  const [auteur, setAuteur] = useState(() => {
    try { return localStorage.getItem(CLE_PRENOM) ?? ""; } catch { return ""; }
  });
  const [nouvelle, setNouvelle] = useState("");
  const [ajout, setAjout] = useState(false);

  const [edite, setEdite] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [confirmeSuppression, setConfirmeSuppression] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await table()
      .select("id, contenu, auteur, created_at, updated_at")
      .eq("demarche_id", demarcheId)
      .order("created_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
    setChargement(false);
  }, [demarcheId]);

  useEffect(() => {
    setChargement(true);
    setAjout(false);
    setEdite(null);
    charger();
  }, [charger]);

  const verifier = (texte: string) => {
    if (!texte.trim()) {
      toast({ title: "Note vide", description: "Écrivez quelque chose avant d'enregistrer.", variant: "destructive" });
      return false;
    }
    if (!auteur.trim()) {
      toast({ title: "Nom manquant", description: "Indiquez qui écrit cette note.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const ajouter = async () => {
    if (!verifier(nouvelle)) return;
    setEnCours(true);
    try { localStorage.setItem(CLE_PRENOM, auteur.trim()); } catch { /* navigation privée */ }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEnCours(false);
      toast({ title: "Session expirée", description: "Reconnectez-vous pour enregistrer.", variant: "destructive" });
      return;
    }

    const { error } = await table().insert({
      demarche_id: demarcheId,
      contenu: nouvelle.trim(),
      auteur: auteur.trim(),
      auteur_id: user.id,
    });
    setEnCours(false);
    if (error) {
      toast({ title: "Note non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    setNouvelle("");
    setAjout(false);
    charger();
  };

  const enregistrerEdition = async (id: string) => {
    if (!verifier(brouillon)) return;
    setEnCours(true);
    try { localStorage.setItem(CLE_PRENOM, auteur.trim()); } catch { /* navigation privée */ }
    const { error } = await table()
      .update({ contenu: brouillon.trim(), auteur: auteur.trim() })
      .eq("id", id);
    setEnCours(false);
    if (error) {
      toast({ title: "Note non modifiée", description: error.message, variant: "destructive" });
      return;
    }
    setEdite(null);
    charger();
  };

  const supprimer = async (id: string) => {
    const { error } = await table().delete().eq("id", id);
    if (error) {
      toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
      return;
    }
    setConfirmeSuppression(null);
    charger();
  };

  const champAuteur = (
    <Input
      value={auteur}
      onChange={(e) => setAuteur(e.target.value)}
      placeholder="Votre prénom"
      className="w-40"
    />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-amber-600" />
          Notes internes
          {notes.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({notes.length})</span>
          )}
        </CardTitle>
        {!ajout && (
          <Button variant="outline" size="sm" onClick={() => setAjout(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {(ajout || notes.length === 0) && (
          <div className="space-y-2">
            <Textarea
              value={nouvelle}
              onChange={(e) => setNouvelle(e.target.value)}
              placeholder="Ce qui a été dit, décidé, ou ce qu'il faut savoir sur ce dossier. Visible par l'équipe uniquement."
              rows={3}
            />
            <div className="flex flex-wrap items-center gap-2">
              {champAuteur}
              <Button size="sm" onClick={ajouter} disabled={enCours}>
                {enCours && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
              {ajout && notes.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setAjout(false); setNouvelle(""); }}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        )}

        {chargement ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-border p-3">
              {edite === n.id ? (
                <div className="space-y-2">
                  <Textarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} rows={3} />
                  <div className="flex flex-wrap items-center gap-2">
                    {champAuteur}
                    <Button size="sm" onClick={() => enregistrerEdition(n.id)} disabled={enCours}>
                      {enCours && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Enregistrer
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEdite(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{n.contenu}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Modifier la note"
                        onClick={() => { setEdite(n.id); setBrouillon(n.contenu); setConfirmeSuppression(null); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {confirmeSuppression === n.id ? (
                        <>
                          <Button variant="destructive" size="sm" onClick={() => supprimer(n.id)}>Confirmer</Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmeSuppression(null)}>Annuler</Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Supprimer la note"
                          onClick={() => setConfirmeSuppression(n.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{signatureDe(n)}</p>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
