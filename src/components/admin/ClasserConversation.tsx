// « Pas besoin de réponse » : classer la conversation depuis la démarche.
//
// Le bouton n'existait que dans la page Messages. Or on lit souvent le message
// en ouvrant le dossier — et là, rien ne permettait de dire « c'est vu, il n'y
// a rien à répondre ». La conversation restait dans « Pas encore répondu »
// jusqu'à ce que quelqu'un retourne dans Messages pour la classer, ou la laisse
// traîner.
//
// La barre ne s'affiche que quand il y a quelque chose à faire ou à défaire :
// un message en attente, ou une conversation déjà classée qu'on peut rouvrir.
// Un bouton visible en permanence, dont l'effet est nul neuf fois sur dix,
// finit par être ignoré.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, MailOpen, Undo2 } from "lucide-react";
import { formatDateTimeParis } from "@/lib/dateFormat";

type Etat = "rien" | "attend" | "classee";

export function ClasserConversation({ demarcheId }: { demarcheId: string }) {
  const { toast } = useToast();
  const [etat, setEtat] = useState<Etat>("rien");
  const [classeeLe, setClasseeLe] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const { data: dernier } = await supabase
      .from("messages")
      .select("sender_type, created_at")
      .eq("demarche_id", demarcheId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!dernier || dernier.sender_type === "admin") {
      setEtat("rien");
      return;
    }

    const { data: classee } = await supabase
      .from("conversations_classees" as never)
      .select("classee_le")
      .eq("source", "pro")
      .eq("cible_id", demarcheId)
      .maybeSingle();

    // Classée APRÈS le dernier message : la conversation est traitée. Classée
    // avant, elle ne compte plus — l'interlocuteur a réécrit depuis.
    const le = (classee as { classee_le?: string } | null)?.classee_le ?? null;
    if (le && le >= dernier.created_at) {
      setClasseeLe(le);
      setEtat("classee");
    } else {
      setEtat("attend");
    }
  }, [demarcheId]);

  useEffect(() => { charger(); }, [charger]);

  const classer = async () => {
    setEnCours(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("conversations_classees" as never)
      .upsert(
        { source: "pro", cible_id: demarcheId, classee_le: new Date().toISOString(), classee_par: user?.id ?? null } as never,
        { onConflict: "source,cible_id" } as never,
      );
    setEnCours(false);
    if (error) {
      toast({ title: "Impossible de classer", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conversation classée", description: "Elle ressortira si le garage écrit à nouveau." });
    charger();
  };

  // Ouvrir la démarche marque le message lu : sans ce bouton, on ne peut plus
  // le remettre dans « Non lues » sans passer par la page Messages. C'est
  // exactement le geste de « je regarde, mais je traiterai plus tard ».
  const remettreNonLu = async () => {
    setEnCours(true);
    const { error } = await supabase
      .from("messages")
      .update({ is_read: false })
      .eq("demarche_id", demarcheId)
      .neq("sender_type", "admin");
    setEnCours(false);
    if (error) {
      toast({ title: "Impossible de marquer comme non lue", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Marquée comme non lue",
      description: "Elle repasse en tête des messages. Rouvrir cette démarche la remarquera comme lue.",
    });
  };

  const rouvrir = async () => {
    setEnCours(true);
    const { error } = await supabase
      .from("conversations_classees" as never)
      .delete()
      .eq("source", "pro")
      .eq("cible_id", demarcheId);
    setEnCours(false);
    if (error) {
      toast({ title: "Impossible de rouvrir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conversation rouverte", description: "Elle revient dans les messages à traiter." });
    charger();
  };

  if (etat === "rien") return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
      {etat === "attend" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Ce message attend une réponse — il reste dans l'onglet Messages.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={remettreNonLu} disabled={enCours}>
              <MailOpen className="mr-2 h-3.5 w-3.5" />
              Marquer comme non lue
            </Button>
            <Button size="sm" variant="outline" onClick={classer} disabled={enCours}>
              {enCours ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
              Pas besoin de réponse
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Conversation classée le {formatDateTimeParis(classeeLe!)} — retirée des messages à traiter.
          </p>
          <Button size="sm" variant="ghost" onClick={rouvrir} disabled={enCours}>
            {enCours ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-2 h-3.5 w-3.5" />}
            Rouvrir
          </Button>
        </>
      )}
    </div>
  );
}
