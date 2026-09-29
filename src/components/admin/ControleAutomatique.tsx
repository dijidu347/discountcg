// Résultat du contrôle automatique d'un dossier, dans la fiche admin.
//
// Le contrôle ne décide rien : il dit où regarder. Les anomalies sont classées
// par gravité pour que la lecture manuelle se limite à ce qui est signalé, et
// chaque ligne nomme la pièce concernée.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { formatDateTimeParis } from "@/lib/dateFormat";

// Tables et fonction ajoutées après la dernière génération des types Supabase :
// on passe par un accès non typé plutôt que d'attendre la régénération.
// bind : sans lui, la méthode détachée perd son client et plante au premier appel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = supabase.from.bind(supabase) as unknown as (nom: string) => any;
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<{ data: any; error: any }>;

type Gravite = "haute" | "moyenne" | "basse";

interface Anomalie {
  code: string;
  gravite: Gravite;
  message: string;
  piece?: string;
  document_id?: string;
}

interface Controle {
  niveau: "en_attente" | "vert" | "orange" | "rouge";
  anomalies: Anomalie[];
  pieces_analysees: number;
  pieces_attendues: number;
  calcule_le: string;
}

const APPARENCE: Record<Gravite, { fond: string; texte: string; icone: typeof AlertTriangle; titre: string }> = {
  haute: { fond: "bg-red-50 border-red-200", texte: "text-red-700", icone: AlertTriangle, titre: "À corriger" },
  moyenne: { fond: "bg-amber-50 border-amber-200", texte: "text-amber-700", icone: AlertTriangle, titre: "À vérifier" },
  basse: { fond: "bg-blue-50 border-blue-200", texte: "text-blue-700", icone: Info, titre: "Pour information" },
};

const ORDRE: Gravite[] = ["haute", "moyenne", "basse"];

export function ControleAutomatique({ demarcheId, typeDemarche }: { demarcheId: string; typeDemarche?: string | null }) {
  const [controle, setControle] = useState<Controle | null>(null);
  const [chargement, setChargement] = useState(true);
  const [dansLePerimetre, setDansLePerimetre] = useState(false);
  const [relance, setRelance] = useState(false);
  const { toast } = useToast();

  // Le contrôle ne couvre pas encore tous les types de démarche : sur les autres
  // le bloc n'a rien à dire, autant ne pas l'afficher du tout.
  useEffect(() => {
    let vivant = true;
    if (!typeDemarche) {
      setDansLePerimetre(false);
      return;
    }
    rpc("type_sous_controle", { p_type: typeDemarche }).then(({ data }) => {
      if (vivant) setDansLePerimetre(data === true);
    });
    return () => {
      vivant = false;
    };
  }, [typeDemarche]);

  const charger = useCallback(async () => {
    const { data } = await table("controles_demarche")
      .select("niveau, anomalies, pieces_analysees, pieces_attendues, calcule_le")
      .eq("demarche_id", demarcheId)
      .maybeSingle();
    setControle((data as unknown as Controle) ?? null);
    setChargement(false);
  }, [demarcheId]);

  useEffect(() => {
    charger();
    // Le contrôle arrive après coup (lecture des pièces) : la fiche se met à
    // jour toute seule plutôt que d'obliger à recharger la page.
    const canal = supabase
      .channel(`controle-${demarcheId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "controles_demarche", filter: `demarche_id=eq.${demarcheId}` },
        () => charger(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [charger, demarcheId]);

  const relancer = async () => {
    setRelance(true);
    const { error } = await rpc("relancer_controle_dossier", { p_demarche_id: demarcheId });
    setRelance(false);
    if (error) {
      toast({ title: "Relance impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contrôle relancé", description: "Les pièces sont en cours de relecture." });
    charger();
  };

  if (chargement || !dansLePerimetre) return null;

  const anomalies = controle?.anomalies ?? [];
  const enAttente = !controle || controle.niveau === "en_attente";
  const restantes = controle ? Math.max(controle.pieces_attendues - controle.pieces_analysees, 0) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Contrôle automatique
            </CardTitle>
            <CardDescription>
              {enAttente
                ? restantes > 0
                  ? `Lecture en cours : ${restantes} pièce(s) restante(s).`
                  : "Aucune pièce lue pour l'instant."
                : `${controle.pieces_analysees} pièce(s) lue(s) • dernier contrôle le ${formatDateTimeParis(controle.calcule_le)}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!enAttente && <BadgeNiveau niveau={controle.niveau} nombre={anomalies.length} />}
            <Button
              variant="outline"
              size="sm"
              onClick={relancer}
              disabled={relance}
              className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            >
              {relance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Relancer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {enAttente ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Le résultat s'affichera ici dès que les pièces auront été lues.
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Aucune anomalie détectée sur ce dossier.
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {ORDRE.map((gravite) => {
              const lot = anomalies.filter((a) => a.gravite === gravite);
              if (lot.length === 0) return null;
              const { fond, texte, icone: Icone, titre } = APPARENCE[gravite];
              return (
                <div key={gravite} className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${texte}`}>
                    {titre} ({lot.length})
                  </p>
                  {lot.map((anomalie, index) => (
                    <div key={`${anomalie.code}-${index}`} className={`flex gap-3 rounded-lg border p-3 ${fond}`}>
                      <Icone className={`h-4 w-4 mt-0.5 shrink-0 ${texte}`} />
                      <div className="text-sm">
                        {anomalie.piece && <span className="font-medium">{anomalie.piece} — </span>}
                        <span>{anomalie.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BadgeNiveau({ niveau, nombre }: { niveau: Controle["niveau"]; nombre: number }) {
  if (niveau === "vert") {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Dossier conforme</Badge>;
  }
  if (niveau === "orange") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{nombre} point(s) à vérifier</Badge>;
  }
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{nombre} anomalie(s)</Badge>;
}
