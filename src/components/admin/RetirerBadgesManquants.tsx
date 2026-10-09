// Retirer le badge aux garages vérifiés sans pièce obligatoire, et leur dire
// laquelle manque.
//
// Le badge « Vérifié » et le contenu du dossier étaient deux vérités
// indépendantes : neuf garages travaillent sous notre habilitation sans Kbis
// approuvé, dont un sans aucune pièce.
//
// L'opération se fait en une fois, mais garage par garage dans la liste, et
// cochée à la main : certains n'ont rien oublié. Trois d'entre eux ont déposé
// leur Kbis ET leur carte d'identité, tout attend NOTRE examen — leur écrire
// « il vous manque le Kbis » serait faux, et leur retirer leur badge les
// bloquerait pour un retard qui est le nôtre. Ils sont donc décochés d'office,
// et dits comme tels, plutôt que silencieusement exclus.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { detailPiecesManquantes, type PieceManquante } from "@/lib/kbisADater";

interface Rang extends PieceManquante {
  id: string;
  raison_sociale: string;
  email: string | null;
  demarches: number;
}

export function RetirerBadgesManquants({ onTermine }: { onTermine?: () => void }) {
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [rangs, setRangs] = useState<Rang[]>([]);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    (async () => {
      setChargement(true);
      const detail = await detailPiecesManquantes();
      const ids = [...detail.keys()];
      if (!ids.length) {
        setRangs([]);
        setChargement(false);
        return;
      }
      const { data: garages } = await supabase
        .from("garages")
        .select("id, raison_sociale, email")
        .in("id", ids);

      const lignes: Rang[] = (garages || []).map((g) => ({
        id: g.id,
        raison_sociale: g.raison_sociale || "Sans raison sociale",
        email: g.email,
        demarches: 0,
        ...(detail.get(g.id) as PieceManquante),
      }));
      lignes.sort((a, b) => a.enAttenteDeNous.length - b.enAttenteDeNous.length);
      setRangs(lignes);
      // Cochés d'office : ceux dont rien n'attend notre examen.
      setCoches(new Set(lignes.filter((l) => !l.enAttenteDeNous.length).map((l) => l.id)));
      setChargement(false);
    })();
  }, [ouvert]);

  const basculer = (id: string) =>
    setCoches((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const executer = async () => {
    setEnvoi(true);
    let faits = 0;
    let emailsRates = 0;

    for (const rang of rangs.filter((r) => coches.has(r.id))) {
      const liste = rang.manquantes.join(", ");
      const message =
        `Votre compte n'est plus vérifié : la ou les pièces suivantes manquent à votre dossier — ${liste}.\n\n` +
        `Déposez-les depuis votre espace « Paramètres > Vérification ». Votre vérification sera rétablie dès leur contrôle.`;

      const { error } = await supabase
        .from("garages")
        .update({ is_verified: false, verification_requested_at: null })
        .eq("id", rang.id);

      if (error) continue;
      faits += 1;

      await supabase.from("garage_verification_notifications").insert({
        garage_id: rang.id,
        subject: "Pièces manquantes — vérification suspendue",
        message,
      });

      const { error: erreurEmail } = await supabase.functions.invoke("send-email", {
        body: {
          type: "custom_notification",
          to: rang.email,
          data: {
            customerName: rang.raison_sociale,
            subject: "Pièces manquantes — vérification suspendue",
            message,
          },
        },
      });
      if (erreurEmail) emailsRates += 1;
    }

    setEnvoi(false);
    setOuvert(false);
    toast({
      title: `${faits} garage${faits > 1 ? "s" : ""} traité${faits > 1 ? "s" : ""}`,
      description: emailsRates
        ? `${emailsRates} email${emailsRates > 1 ? "s" : ""} n'${emailsRates > 1 ? "ont" : "a"} pas pu partir — le message reste dans leur espace.`
        : "Badge retiré et pièces demandées par email.",
      variant: emailsRates ? "destructive" : undefined,
    });
    onTermine?.();
  };

  return (
    <AlertDialog open={ouvert} onOpenChange={setOuvert}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldOff className="mr-2 h-4 w-4" />
          Vérifiés sans pièce obligatoire
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer le badge et demander les pièces</AlertDialogTitle>
          <AlertDialogDescription>
            Ces garages sont vérifiés alors qu'une pièce obligatoire n'a jamais été approuvée.
            Décocher laisse le garage intact.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {chargement ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : rangs.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Aucun garage dans ce cas. Tout est en ordre.
          </p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {rangs.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/40"
              >
                <Checkbox
                  checked={coches.has(r.id)}
                  onCheckedChange={() => basculer(r.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.raison_sociale}</span>
                    {r.enAttenteDeNous.length > 0 && (
                      <Badge variant="secondary" className="bg-yellow-500 text-yellow-950">
                        a déjà déposé
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manque : {r.manquantes.join(", ")}
                  </p>
                  {r.enAttenteDeNous.length > 0 && (
                    <p className="mt-1 text-sm text-foreground">
                      {r.enAttenteDeNous.join(", ")} — déposé, en attente de notre examen. Le retard
                      est le nôtre : regardez sa pièce plutôt que de lui retirer son badge.
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button
            onClick={executer}
            disabled={coches.size === 0 || envoi}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {envoi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retirer le badge à {coches.size} garage{coches.size > 1 ? "s" : ""} et les prévenir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
