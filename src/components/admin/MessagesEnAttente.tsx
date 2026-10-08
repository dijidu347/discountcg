// Les conversations qui attendent une réponse, sur le tableau de bord.
//
// Elles arrivaient jusqu'ici par e-mail, un par message reçu : trois messages
// d'un client faisaient trois e-mails. Le chat professionnel déduplique depuis
// un moment, le chat des commandes particulier non — d'où les rafales.
//
// La carte liste les conversations plutôt que d'en donner le nombre : savoir
// qu'il y a six réponses à écrire ne sert à rien si l'on doit ensuite les
// chercher. Chaque ligne mène au dossier concerné.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Conversation {
  source: "pro" | "particulier";
  cible_id: string;
  reference: string;
  dernier_message: string;
  recu_le: string;
  non_lu: boolean;
}

// « il y a 3 h », « hier », « il y a 5 j » : l'ancienneté dit l'urgence mieux
// qu'une date.
function depuis(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} j`;
}

export const MessagesEnAttente = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  // Repliee par defaut : vingt-cinq lignes depliees poussaient le reste du
  // tableau de bord hors de l'ecran. La carte annonce, on deroule au besoin.
  const [depliee, setDepliee] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await supabase.rpc("messages_en_attente" as any);
      if (!vivant) return;
      setConversations((data as Conversation[]) ?? []);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!conversations?.length) return null;

  const ouvrir = (c: Conversation) =>
    navigate(c.source === "pro" ? `/admin/demarche/${c.cible_id}` : `/admin/guest-order/${c.cible_id}`);

  // Classer sans repondre. Le classement porte une date : si le client ecrit
  // de nouveau ensuite, la conversation ressort d'elle-meme.
  const classer = async (c: Conversation) => {
    const { error } = await supabase
      .from("conversations_classees" as never)
      .upsert(
        { source: c.source, cible_id: c.cible_id, classee_le: new Date().toISOString() } as never,
        { onConflict: "source,cible_id" } as never
      );
    if (error) {
      toast({
        title: "Impossible de classer la conversation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setConversations((liste) => (liste ?? []).filter((x) => x.cible_id !== c.cible_id));
  };

  return (
    <Card className="mb-6 border-2 border-violet-500 bg-violet-50 dark:bg-violet-950/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageSquare className="h-8 w-8 text-violet-500" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-violet-500" />
              </span>
            </div>
            <div>
              <p className="font-bold text-violet-700 dark:text-violet-300">
                {conversations.length} message{conversations.length > 1 ? "s" : ""} en attente de réponse
              </p>
              <p className="text-sm text-violet-600 dark:text-violet-400">
                Un garage ou un client attend votre réponse
              </p>
            </div>
          </div>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => setDepliee((d) => !d)}
          >
            {depliee ? "Masquer" : "Voir les messages"}
            <ChevronDown
              className={`ml-2 h-4 w-4 transition-transform ${depliee ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        <div className={`space-y-1 ${depliee ? "mt-4" : "hidden"}`}>
          {conversations.map((c) => (
            <div key={`${c.source}-${c.cible_id}`} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => ouvrir(c)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/40"
            >
              <Badge variant={c.source === "pro" ? "default" : "secondary"} className="shrink-0">
                {c.source === "pro" ? "Pro" : "Particulier"}
              </Badge>
              {c.non_lu && (
                <Badge className="shrink-0 bg-violet-600 text-white hover:bg-violet-600">
                  Non lu
                </Badge>
              )}
              <span className="shrink-0 font-medium tabular-nums">{c.reference}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {c.dernier_message}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{depuis(c.recu_le)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              type="button"
              title="Pas de réponse nécessaire"
              onClick={(e) => {
                e.stopPropagation();
                void classer(c);
              }}
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-violet-100 hover:text-foreground dark:hover:bg-violet-950/40"
            >
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Pas de réponse nécessaire</span>
            </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
