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
import { MessageSquare, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Conversation {
  source: "pro" | "particulier";
  cible_id: string;
  reference: string;
  dernier_message: string;
  recu_le: string;
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

  return (
    <Card className="mb-6 border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-blue-500" />
              </span>
            </div>
            <div>
              <p className="font-bold text-blue-700 dark:text-blue-400">
                {conversations.length} message{conversations.length > 1 ? "s" : ""} en attente de réponse
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-500">
                Un garage ou un client attend votre réponse
              </p>
            </div>
          </div>
          <Button
            className="bg-blue-500 hover:bg-blue-600"
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
            <button
              key={`${c.source}-${c.cible_id}`}
              type="button"
              onClick={() => ouvrir(c)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-blue-100 dark:hover:bg-blue-950/40"
            >
              <Badge variant={c.source === "pro" ? "default" : "secondary"} className="shrink-0">
                {c.source === "pro" ? "Pro" : "Particulier"}
              </Badge>
              <span className="shrink-0 font-medium tabular-nums">{c.reference}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {c.dernier_message}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{depuis(c.recu_le)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
