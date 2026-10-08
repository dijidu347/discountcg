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
    <Card className="mb-6 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageSquare className="h-8 w-8 text-yellow-500" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-yellow-500" />
              </span>
            </div>
            <div>
              <p className="font-bold text-yellow-800 dark:text-yellow-300">
                {aTraiter} message{aTraiter > 1 ? "s" : ""} à traiter
                {nonLues > 0 && ` dont ${nonLues} non lu${nonLues > 1 ? "s" : ""} !`}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Cliquez pour répondre aux garages et aux clients
              </p>
            </div>
          </div>
          <Button
            className="bg-yellow-500 text-yellow-950 hover:bg-yellow-400"
            onClick={() => navigate("/admin/messages")}
          >
            Voir les messages
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
