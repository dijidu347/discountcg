// Réclamer une pièce sans refuser celles qui sont bonnes.
//
// Avant, la seule façon de dire « il me manque la DA du vendeur » était de
// refuser une pièce valide pour que le garage reçoive un message. Il recevait
// « votre mandat est refusé », le renvoyait à l'identique, et un aller-retour
// était perdu. Ici on nomme ce qui manque, le garage reçoit un emplacement de
// dépôt pour cette seule pièce, et rien de ce qu'il a déjà fourni n'est remis
// en cause.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeParis } from "@/lib/dateFormat";
import { CheckCircle2, FileQuestion, Loader2, Plus, X } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = supabase.from.bind(supabase) as unknown as (nom: string) => any;
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<{ data: any; error: any }>;

interface Demande {
  id: string;
  libelle: string;
  motif: string | null;
  demandee_le: string;
  fournie_le: string | null;
  annulee_le: string | null;
}

interface Props {
  demarcheId: string;
  reference?: string | null;
  immatriculation?: string | null;
  emailGarage?: string | null;
  nomGarage?: string | null;
  /** Libellés des pièces attendues, pour les proposer d'un clic. */
  piecesConnues?: string[];
  onChangement?: () => void;
}

export function DemanderPiece({
  demarcheId, reference, immatriculation, emailGarage, nomGarage, piecesConnues = [], onChangement,
}: Props) {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const { toast } = useToast();

  const charger = useCallback(async () => {
    const { data } = await table("pieces_demandees")
      .select("id, libelle, motif, demandee_le, fournie_le, annulee_le")
      .eq("demarche_id", demarcheId)
      .is("annulee_le", null)
      .order("demandee_le", { ascending: false });
    setDemandes((data as Demande[]) ?? []);
  }, [demarcheId]);

  useEffect(() => { charger(); }, [charger]);

  const demander = async () => {
    const nom = libelle.trim();
    if (!nom) return;
    setEnvoi(true);

    const { error } = await rpc("demander_piece", {
      p_demarche_id: demarcheId,
      p_libelle: nom,
      p_motif: motif.trim() || null,
    });

    if (error) {
      setEnvoi(false);
      toast({ title: "Demande impossible", description: error.message, variant: "destructive" });
      return;
    }

    // L'e-mail ne conditionne pas la demande : elle est enregistrée et visible
    // par le garage même si l'envoi échoue. On le dit plutôt que de faire
    // croire à un échec.
    let mailEnvoye = true;
    if (emailGarage) {
      const { error: erreurMail } = await supabase.functions.invoke("send-email", {
        body: {
          type: "piece_demandee",
          to: emailGarage,
          data: {
            tracking_number: reference || demarcheId,
            nom: nomGarage || "",
            immatriculation: immatriculation || "",
            piece: nom,
            motif: motif.trim() || "",
          },
        },
      });
      mailEnvoye = !erreurMail;
    }

    setEnvoi(false);
    setLibelle("");
    setMotif("");
    setOuvert(false);
    await charger();
    onChangement?.();

    toast({
      title: "Pièce demandée",
      description: mailEnvoye
        ? "Le garage a été prévenu et dispose d'un emplacement pour la déposer."
        : "Demande enregistrée, mais l'e-mail n'est pas parti. Prévenez le garage autrement.",
      variant: mailEnvoye ? "default" : "destructive",
    });
  };

  const annuler = async (id: string) => {
    const { error } = await rpc("annuler_piece_demandee", { p_id: id });
    if (error) {
      toast({ title: "Annulation impossible", description: error.message, variant: "destructive" });
      return;
    }
    await charger();
    onChangement?.();
  };

  // Suggestions au fil de la frappe : les pièces de la démarche dont l'intitulé
  // contient ce qui est tapé, accents et casse ignorés. Rien tant que le champ
  // est vide, et rien non plus quand la pièce choisie est déjà exacte.
  const sansAccent = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const recherche = sansAccent(libelle.trim());
  const suggestions = recherche.length === 0
    ? []
    : piecesConnues.filter((p) => sansAccent(p).includes(recherche) && sansAccent(p) !== recherche).slice(0, 5);

  const enAttente = demandes.filter((d) => !d.fournie_le);
  const fournies = demandes.filter((d) => d.fournie_le);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Pièces réclamées
            </CardTitle>
            <CardDescription>
              {enAttente.length > 0
                ? `${enAttente.length} pièce(s) en attente du garage.`
                : "Réclamer une pièce manquante, sans rien refuser."}
            </CardDescription>
          </div>

          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300">
                <Plus className="mr-2 h-4 w-4" />
                Demander une pièce
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demander une pièce</DialogTitle>
                <DialogDescription>
                  Le garage reçoit un e-mail et un emplacement pour la déposer. Ses autres pièces ne bougent pas.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="libelle-piece">Quelle pièce ?</Label>
                  <Input
                    id="libelle-piece"
                    value={libelle}
                    onChange={(e) => setLibelle(e.target.value)}
                    placeholder="Tapez les premières lettres, ou écrivez librement"
                    autoComplete="off"
                  />
                  {/* On propose au fil de la frappe plutôt que d'étaler toute la
                      liste : elle compte une dizaine de pièces par démarche et
                      remplissait la fenêtre avant même qu'on ait commencé. */}
                  {suggestions.length > 0 && (
                    <div className="rounded-lg border divide-y overflow-hidden">
                      {suggestions.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setLibelle(p)}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motif-piece">Une précision ? (facultatif)</Label>
                  <Textarea
                    id="motif-piece"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Par exemple : celle au nom du vendeur professionnel, pas celle du particulier."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOuvert(false)}>Annuler</Button>
                <Button onClick={demander} disabled={envoi || !libelle.trim()}>
                  {envoi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Demander
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {demandes.length > 0 && (
        <CardContent className="space-y-2">
          {enAttente.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <FileQuestion className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{d.libelle}</p>
                {d.motif && <p className="text-muted-foreground">{d.motif}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Demandée le {formatDateTimeParis(d.demandee_le)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => annuler(d.id)} title="Annuler la demande">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {fournies.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-lg border p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{d.libelle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Déposée le {formatDateTimeParis(d.fournie_le!)}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Reçue</Badge>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
