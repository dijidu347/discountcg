// L'alerte « messages en attente » du tableau de bord.
//
// Elle ne porte plus que le compte : la liste, les trois états et le chat
// vivent sur /admin/messages. Dépliée ici, elle poussait le reste du tableau de
// bord hors de l'écran, et répondre obligeait à ouvrir le dossier complet pour
// trois lignes de conversation.
//
// Le compte ne retient que ce qui appelle un geste — non lues et pas encore
// répondu. Les traitées existent sur la page dédiée, pas dans une alerte.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export const MessagesEnAttente = () => {
  const navigate = useNavigate();
  const [aTraiter, setATraiter] = useState(0);
  const [nonLues, setNonLues] = useState(0);

  useEffect(() => {
    let vivant = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await supabase.rpc("messages_en_attente" as any);
      if (!vivant) return;
      const liste = (data as { etat: string }[]) ?? [];
      setATraiter(liste.filter((c) => c.etat !== "traite").length);
      setNonLues(liste.filter((c) => c.etat === "non_lu").length);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!aTraiter) return null;

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
                {aTraiter} message{aTraiter > 1 ? "s" : ""} en attente de réponse
              </p>
              <p className="text-sm text-violet-600 dark:text-violet-400">
                {nonLues > 0
                  ? `dont ${nonLues} que vous n'avez pas encore ouverte${nonLues > 1 ? "s" : ""}`
                  : "Un garage ou un client attend votre réponse"}
              </p>
            </div>
          </div>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => navigate("/admin/messages")}
          >
            Voir les messages
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
