// La page des conversations qui attendent une réponse.
//
// Mise en page de messagerie : les conversations à gauche, celle qu'on traite à
// droite, et chaque volet défile pour lui-même. La page elle-même ne défile
// pas, faute de quoi la zone de saisie disparaissait sous l'écran dès qu'une
// conversation était longue.
//
// Trois règles tenues ici, chacune corrigeant un défaut constaté.
//
// Rien ne s'ouvre tout seul : afficher une conversation la marque lue, et
// arriver sur la page ne veut pas dire qu'on a lu celle du haut.
//
// Répondre retire la conversation de la liste. Sans cela la liste mentait : au
// bout de dix réponses on ne savait plus lesquelles avaient été traitées.
//
// Le contexte du dossier s'affiche au-dessus du chat — démarche, statut,
// montant, ancienneté — pour répondre sans aller le chercher ailleurs.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { DemarcheChat } from "@/components/DemarcheChat";
import { GuestOrderChat } from "@/components/GuestOrderChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ExternalLink, MailOpen, MessageSquare, Search } from "lucide-react";

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
  demarche_libelle: string | null;
  dossier_statut: string | null;
  dossier_montant: number | null;
  dossier_depuis: string | null;
}

// Mêmes libellés que la page démarche, pour ne pas inventer un second langage.
const LIBELLES_STATUT: Record<string, string> = {
  en_saisie: "En saisie",
  en_attente: "En attente",
  paye: "Payé",
  valide: "Validé",
  en_attente_paiement_client: "Attente paiement client",
  en_attente_paiement_pro: "Attente paiement pro",
};

function depuis(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} j`;
}

// Deux lettres tirées du nom : de quoi distinguer les lignes d'un coup d'œil,
// sans charger la moindre image.
function initiales(nom: string | null, reference: string): string {
  const base = (nom ?? reference).trim();
  const mots = base.split(/[\s-]+/).filter(Boolean);
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

const SECTIONS = [
  { cle: "non_lu" as const, titre: "Non lues" },
  { cle: "a_repondre" as const, titre: "Pas encore répondu" },
];

const FILTRES = [
  { cle: "tous" as const, libelle: "Tous" },
  { cle: "pro" as const, libelle: "Pro" },
  { cle: "particulier" as const, libelle: "Particulier" },
];

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [choisie, setChoisie] = useState<Conversation | null>(null);
  const [classement, setClassement] = useState(false);
  const [filtre, setFiltre] = useState<"tous" | "pro" | "particulier">("tous");
  const [recherche, setRecherche] = useState("");

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

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (conversations ?? []).filter((c) => {
      if (filtre !== "tous" && c.source !== filtre) return false;
      if (!q) return true;
      return [c.reference, c.contact_nom, c.contact_email, c.demarche_libelle]
        .filter(Boolean)
        .some((champ) => (champ as string).toLowerCase().includes(q));
    });
  }, [conversations, filtre, recherche]);

  const retirer = (c: Conversation, titre: string, description: string) => {
    setConversations((liste) => (liste ?? []).filter((x) => x.cible_id !== c.cible_id));
    setChoisie(null);
    toast({ title: titre, description });
  };

  const ouvrirDossier = (c: Conversation) =>
    navigate(c.source === "pro" ? `/admin/demarche/${c.cible_id}` : `/admin/guest-order/${c.cible_id}`);

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
      toast({ title: "Impossible de classer", description: error.message, variant: "destructive" });
      return;
    }
    retirer(c, "Conversation classée", "Elle ressortira si votre interlocuteur écrit à nouveau.");
  };

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
    setConversations((liste) =>
      (liste ?? []).map((x) => (x.cible_id === c.cible_id ? { ...x, etat: "non_lu" } : x))
    );
    setChoisie(null);
    toast({ title: "Marquée comme non lue", description: "Elle repasse en tête de liste." });
  };

  const nonLues = (conversations ?? []).filter((c) => c.etat === "non_lu").length;

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <Navbar />

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-20 md:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tableau de bord
          </button>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <MessageSquare className="h-5 w-5 text-yellow-500" />
            Messages
          </h1>
          {conversations && (
            <span className="text-sm text-muted-foreground">
              {conversations.length} en attente
              {nonLues > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">
                    {nonLues} non lues
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[24rem_1fr]">
          {/* Les conversations */}
          <div className="flex min-h-0 flex-col rounded-lg border bg-background">
            <div className="space-y-2 border-b p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Référence, garage, e-mail…"
                  className="pl-8"
                />
              </div>
              <div className="flex gap-1">
                {FILTRES.map((f) => (
                  <button
                    key={f.cle}
                    type="button"
                    onClick={() => setFiltre(f.cle)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filtre === f.cle
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {f.libelle}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {conversations && visibles.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  {conversations.length === 0
                    ? "Aucune conversation n'attend de réponse."
                    : "Rien ne correspond à ce filtre."}
                </p>
              )}

              {SECTIONS.map((section) => {
                const lot = visibles.filter((c) => c.etat === section.cle);
                if (!lot.length) return null;
                return (
                  <div key={section.cle} className="mb-3">
                    <div className="flex items-center gap-2 px-2 pb-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.titre}
                      </p>
                      <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                        {lot.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {lot.map((c) => {
                        const active = choisie?.cible_id === c.cible_id;
                        const pasLue = c.etat === "non_lu";
                        return (
                          <button
                            key={`${c.source}-${c.cible_id}`}
                            type="button"
                            onClick={() => setChoisie(c)}
                            className={`flex w-full items-start gap-2.5 rounded-md border-l-[3px] px-2.5 py-2 text-left transition-colors ${
                              active
                                ? "border-l-foreground bg-muted"
                                : pasLue
                                  ? "border-l-yellow-500 bg-yellow-50/70 hover:bg-yellow-100/70 dark:bg-yellow-950/25 dark:hover:bg-yellow-950/40"
                                  : "border-l-transparent hover:bg-muted/60"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                c.source === "pro"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted-foreground/10 text-muted-foreground"
                              }`}
                            >
                              {initiales(c.contact_nom, c.reference)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline gap-2">
                                <span
                                  className={`min-w-0 flex-1 truncate text-sm text-foreground ${
                                    pasLue ? "font-bold" : "font-medium"
                                  }`}
                                >
                                  {c.contact_nom || c.reference}
                                </span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {depuis(c.recu_le)}
                                </span>
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {c.demarche_libelle ?? c.reference}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground/80">
                                {c.dernier_message}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* La conversation */}
          <div className="flex min-h-0 flex-col rounded-lg border bg-background">
            {!choisie ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium text-foreground">Choisissez une conversation</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Elle ne sera marquée comme lue qu'une fois ouverte. Rien ne bouge tant que vous
                  n'avez pas cliqué.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {choisie.contact_nom || choisie.reference}
                      </p>
                      <Badge variant={choisie.source === "pro" ? "default" : "secondary"}>
                        {choisie.source === "pro" ? "Pro" : "Particulier"}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {choisie.reference}
                      {choisie.contact_email ? ` · ${choisie.contact_email}` : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => ouvrirDossier(choisie)}>
                    Ouvrir le dossier
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-3 py-2 text-xs">
                  {choisie.demarche_libelle && (
                    <span className="font-medium text-foreground">{choisie.demarche_libelle}</span>
                  )}
                  {choisie.dossier_statut && (
                    <Badge variant="outline" className="font-normal">
                      {LIBELLES_STATUT[choisie.dossier_statut] ??
                        choisie.dossier_statut.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {choisie.dossier_montant != null && Number(choisie.dossier_montant) > 0 && (
                    <span className="tabular-nums text-muted-foreground">
                      {Number(choisie.dossier_montant).toFixed(2).replace(".", ",")} €
                    </span>
                  )}
                  {choisie.dossier_depuis && (
                    <span className="text-muted-foreground">
                      déposée {depuis(choisie.dossier_depuis)}
                    </span>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-3">
                  {choisie.source === "pro" ? (
                    <DemarcheChat
                      key={choisie.cible_id}
                      demarcheId={choisie.cible_id}
                      garageId={choisie.garage_id ?? ""}
                      garageEmail={choisie.contact_email ?? undefined}
                      garageName={choisie.contact_nom ?? undefined}
                      numeroDemarche={choisie.reference}
                      onMessageSent={() =>
                        retirer(choisie, "Réponse envoyée", "La conversation quitte la liste.")
                      }
                      pleineHauteur
                      isAdmin
                    />
                  ) : (
                    <GuestOrderChat
                      key={choisie.cible_id}
                      orderId={choisie.cible_id}
                      trackingNumber={choisie.reference}
                      guestEmail={choisie.contact_email ?? undefined}
                      guestName={choisie.contact_nom ?? undefined}
                      onMessageSent={() =>
                        retirer(choisie, "Réponse envoyée", "La conversation quitte la liste.")
                      }
                      pleineHauteur
                      isAdmin
                    />
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t p-3">
                  <Button variant="ghost" size="sm" onClick={() => void remettreNonLu(choisie)}>
                    <MailOpen className="mr-2 h-4 w-4" />
                    Marquer comme non lu
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={classement}
                    onClick={() => void classer(choisie)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Pas de réponse nécessaire
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
