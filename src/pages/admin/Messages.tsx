// La page dédiée aux conversations qui attendent une réponse.
//
// Elle remplace la liste dépliable du tableau de bord : vingt-cinq à cinquante
// lignes n'ont pas leur place dans une alerte, et répondre depuis le tableau de
// bord obligeait à ouvrir le dossier complet pour trois lignes de chat.
//
// Deux colonnes : les conversations à gauche, celle qu'on traite à droite. Le
// bouton « Pas de réponse nécessaire » vit sous le chat, là où l'on décide —
// pas dans la liste, où il invitait à classer sans avoir lu.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { DemarcheChat } from "@/components/DemarcheChat";
import { GuestOrderChat } from "@/components/GuestOrderChat";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ExternalLink, MailOpen, MessageSquare } from "lucide-react";

interface Conversation {
  source: "pro" | "particulier";
  cible_id: string;
  reference: string;
  dernier_message: string;
  recu_le: string;
  etat: "non_lu" | "a_repondre";
  garage_id: string | null;
  contact_email: string | null;
  contact_nom: string | null;
}

function depuis(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} j`;
}

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [choisie, setChoisie] = useState<Conversation | null>(null);
  const [classement, setClassement] = useState(false);

  const charger = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabase.rpc("messages_en_attente" as any);
    const liste = (data as Conversation[]) ?? [];
    setConversations(liste);
    // Aucune ouverture automatique : afficher une conversation la marque lue,
    // et arriver sur la page ne veut pas dire qu'on a lu celle du haut.
    setChoisie((actuelle) =>
      actuelle && liste.some((c) => c.cible_id === actuelle.cible_id) ? actuelle : null
    );
  };

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classer = async (c: Conversation) => {
    setClassement(true);
    const { error } = await supabase
      .from("conversations_classees" as never)
      .upsert(
        { source: c.source, cible_id: c.cible_id, classee_le: new Date().toISOString() } as never,
        { onConflict: "source,cible_id" } as never
      );
    setClassement(false);
    if (error) {
      toast({
        title: "Impossible de classer la conversation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Conversation classée",
      description: "Elle ressortira si votre interlocuteur écrit à nouveau.",
    });
    const reste = (conversations ?? []).filter((x) => x.cible_id !== c.cible_id);
    setConversations(reste);
    setChoisie(reste[0] ?? null);
  };

  const SECTIONS = [
    { cle: "non_lu" as const, titre: "Non lues", aide: "Vous ne les avez pas encore ouvertes" },
    { cle: "a_repondre" as const, titre: "Pas encore répondu", aide: "Lues, mais le dernier mot est à eux" },
  ];

  // Ouvrir une conversation la marque lue automatiquement. Celui qui la consulte
  // sans pouvoir repondre tout de suite la perdait donc de vue : ce bouton la
  // remet dans « Non lues ».
  const remettreNonLu = async (c: Conversation) => {
    const table = c.source === "pro" ? "messages" : "guest_order_messages";
    const colonne = c.source === "pro" ? "demarche_id" : "order_id";
    const { error } = await supabase
      .from(table as never)
      .update({ is_read: false } as never)
      .eq(colonne, c.cible_id)
      .neq("sender_type", "admin");
    if (error) {
      toast({
        title: "Impossible de marquer comme non lu",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Marquée comme non lue", description: "Elle repasse en tête de liste." });
    setConversations((liste) =>
      (liste ?? []).map((x) => (x.cible_id === c.cible_id ? { ...x, etat: "non_lu" } : x))
    );
    setChoisie(null);
  };

  const ouvrirDossier = (c: Conversation) =>
    navigate(c.source === "pro" ? `/admin/demarche/${c.cible_id}` : `/admin/guest-order/${c.cible_id}`);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </button>

        <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold text-foreground md:text-3xl">
          <MessageSquare className="h-7 w-7 text-yellow-500" />
          Messages en attente de réponse
          {conversations && (
            <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500">
              {conversations.length}
            </Badge>
          )}
        </h1>

        {conversations && conversations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune conversation n'attend de réponse. Tout est traité.
            </CardContent>
          </Card>
        )}

        {conversations && conversations.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
            {/* La liste */}
            <div className="space-y-4 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-2">
              {SECTIONS.map((section) => {
                const lot = conversations.filter((c) => c.etat === section.cle);
                if (!lot.length) return null;
                return (
                  <div key={section.cle}>
                    <div className="mb-1 px-1">
                      <p className="text-sm font-semibold text-foreground">
                        {section.titre}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {lot.length}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{section.aide}</p>
                    </div>
                    <div className="space-y-1">
                      {lot.map((c) => {
                        const active = choisie?.cible_id === c.cible_id;
                        return (
                  <button
                    key={`${c.source}-${c.cible_id}`}
                    type="button"
                    onClick={() => setChoisie(c)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
                        : "border-transparent hover:bg-muted/60"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={c.source === "pro" ? "default" : "secondary"} className="shrink-0">
                        {c.source === "pro" ? "Pro" : "Particulier"}
                      </Badge>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {depuis(c.recu_le)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{c.reference}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.dernier_message}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* La conversation */}
            {!choisie && (
              <Card className="hidden lg:block">
                <CardContent className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-2 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">Choisissez une conversation</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Elle ne sera marquée comme lue qu'une fois ouverte. Rien ne bouge tant que vous
                    n'avez pas cliqué.
                  </p>
                </CardContent>
              </Card>
            )}

            {choisie && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {choisie.reference}
                      {choisie.contact_nom ? ` — ${choisie.contact_nom}` : ""}
                    </p>
                    {choisie.contact_email && (
                      <p className="text-sm text-muted-foreground">{choisie.contact_email}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => ouvrirDossier(choisie)}>
                    Ouvrir le dossier
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {choisie.source === "pro" ? (
                  <DemarcheChat
                    key={choisie.cible_id}
                    demarcheId={choisie.cible_id}
                    garageId={choisie.garage_id ?? ""}
                    garageEmail={choisie.contact_email ?? undefined}
                    garageName={choisie.contact_nom ?? undefined}
                    numeroDemarche={choisie.reference}
                    isAdmin
                  />
                ) : (
                  <GuestOrderChat
                    key={choisie.cible_id}
                    orderId={choisie.cible_id}
                    trackingNumber={choisie.reference}
                    guestEmail={choisie.contact_email ?? undefined}
                    guestName={choisie.contact_nom ?? undefined}
                    isAdmin
                  />
                )}

                {/* Sous le chat : c'est ici qu'on decide, apres avoir lu. */}
                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  {choisie.etat !== "non_lu" && (
                    <Button variant="ghost" onClick={() => void remettreNonLu(choisie)}>
                      <MailOpen className="mr-2 h-4 w-4" />
                      Marquer comme non lu
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={classement}
                    onClick={() => void classer(choisie)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Pas de réponse nécessaire
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
