import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, ShieldCheck, Coins } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTimeParis } from "@/lib/dateFormat";
import {
  GarageEditDialog,
  EDITABLE_GARAGE_FIELDS,
  GARAGE_FIELD_LABELS,
} from "@/components/admin/GarageEditDialog";
import { GarageVerificationPanel } from "@/components/admin/GarageVerificationPanel";

/** Nombre de démarches récentes listées. Appliqué CÔTÉ BASE via .limit(). */
const RECENT_DEMARCHES_LIMIT = 20;

interface DemarcheStats {
  total: number;
  realisees: number;
  enCours: number;
  refusees: number;
  brouillons: number;
}

// Démarche réglée : payée par carte, en jetons, par le client, ou offerte.
const REGLEE = "paye.eq.true,paid_with_tokens.eq.true,client_paid.eq.true,is_free_token.eq.true";

/**
 * Compteurs de démarches du garage.
 *
 * `count: "exact", head: true` demande à PostgREST un COUNT(*) SQL et NE
 * RAPATRIE AUCUNE LIGNE (`head` = requête HEAD, corps vide). Le compte porte
 * donc sur la TOTALITÉ des démarches du garage : ni plafond de 1000 lignes, ni
 * filtrage JS sur un échantillon tronqué.
 */
// Date de la première démarche réellement engagée (payée, réglée en jetons,
// payée par le client, ou offerte) : c'est de là que le garage est client.
const fetchClientDepuis = async (garageId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("demarches")
    .select("created_at")
    .eq("garage_id", garageId)
    .eq("is_draft", false)
    .or("paye.eq.true,paid_with_tokens.eq.true,client_paid.eq.true,is_free_token.eq.true")
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.created_at ?? null;
};

// « depuis 1 an et 3 mois », « depuis 8 mois », « depuis 12 jours ».
const anciennete = (depuis: string): string => {
  const jours = Math.max(0, Math.floor((Date.now() - new Date(depuis).getTime()) / 86400000));
  if (jours < 31) return `depuis ${jours} jour${jours > 1 ? "s" : ""}`;
  const mois = Math.floor(jours / 30.44);
  if (mois < 12) return `depuis ${mois} mois`;
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  return `depuis ${ans} an${ans > 1 ? "s" : ""}${reste ? ` et ${reste} mois` : ""}`;
};

type VueDemarches = "en_cours" | "brouillons" | "toutes";

// Tri ET limite côté base : 20 lignes au plus, jamais la table entière.
const requeteDemarches = (garageId: string, vue: VueDemarches) => {
  let q = supabase
    .from("demarches")
    .select("id, numero_demarche, immatriculation, status, created_at, is_draft, paye, paid_with_tokens, client_paid, is_free_token")
    .eq("garage_id", garageId);
  if (vue === "en_cours") q = q.eq("is_draft", false).or(REGLEE).not("status", "in", "(finalise,refuse)");
  if (vue === "brouillons") q = q.eq("is_draft", true);
  return q.order("created_at", { ascending: false }).limit(RECENT_DEMARCHES_LIMIT);
};

const fetchDemarcheStats = async (garageId: string): Promise<DemarcheStats> => {
  const base = () =>
    supabase
      .from("demarches")
      .select("id", { count: "exact", head: true })
      .eq("garage_id", garageId);

  // « En cours » = réglée et pas encore finalisée ni refusée ; un brouillon
  // n'est jamais payé et reste compté à part.
  const [total, realisees, enCours, refusees, brouillons] = await Promise.all([
    base().eq("is_draft", false).or(REGLEE),
    base().eq("status", "finalise"),
    base().eq("is_draft", false).or(REGLEE).not("status", "in", "(finalise,refuse)"),
    base().eq("status", "refuse"),
    base().eq("is_draft", true),
  ]);

  return {
    total: total.count ?? 0,
    realisees: realisees.count ?? 0,
    enCours: enCours.count ?? 0,
    refusees: refusees.count ?? 0,
    brouillons: brouillons.count ?? 0,
  };
};

export default function GarageDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [garage, setGarage] = useState<any>(null);
  const [stats, setStats] = useState<DemarcheStats | null>(null);
  const [demarches, setDemarches] = useState<any[]>([]);
  // Démarches récentes : en cours (payées) et brouillons (non payés) séparés.
  const [vueDemarches, setVueDemarches] = useState<VueDemarches>("en_cours");
  useEffect(() => {
    if (!id || loading) return;
    requeteDemarches(id, vueDemarches).then(({ data }) => setDemarches(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vueDemarches]);
  const [clientDepuis, setClientDepuis] = useState<string | null>(null);
  // Don de jetons : bouton dans la carte du haut, dialogue dans le panneau.
  const [donJetonsOuvert, setDonJetonsOuvert] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) checkAdminAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const checkAdminAndLoad = async () => {
    // Même garde que les autres écrans admin : filtre sur le rôle admin, sinon
    // .single() casse pour les utilisateurs ayant plusieurs rôles.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      navigate("/dashboard");
      return;
    }

    await loadAll();
  };

  const loadAll = async () => {
    if (!id) return;

    const { data: garageData } = await supabase
      .from("garages")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!garageData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setGarage(garageData);

    // Marque la demande de vérification comme vue. Ce marquage était déclenché
    // par le bouton "Documents" de la liste ; c'est lui qui fait passer le
    // garage de la section "À vérifier" à "En attente". Il doit donc suivre le
    // bouton, sinon un garage resterait indéfiniment dans "À vérifier".
    if (garageData.verification_requested_at && !garageData.verification_admin_viewed) {
      await supabase
        .from("garages")
        .update({ verification_admin_viewed: true })
        .eq("id", id);
      setGarage((prev: any) => ({ ...prev, verification_admin_viewed: true }));
    }

    const [statsData, { data: recentes }, premiere] = await Promise.all([
      fetchDemarcheStats(id),
      // Tri ET limite CÔTÉ BASE : on ne rapatrie que 20 lignes, jamais la table
      // entière. Aucun risque de buter sur le plafond de 1000 lignes.
      requeteDemarches(id, vueDemarches),
      fetchClientDepuis(id),
    ]);

    setClientDepuis(premiere);
    setStats(statsData);
    setDemarches(recentes || []);
    setLoading(false);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Garage introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/admin/manage-garages")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (!garage) return null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{garage.raison_sociale} — Fiche garage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Retour à la page d'où l'on vient (gestion des comptes, liste des
            garages, prospection…) ; à défaut d'historique, la liste des garages. */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate("/admin/manage-garages"))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{garage.raison_sociale}</h1>
            {garage.is_verified && (
              <Badge className="bg-green-500">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </div>
          <Button onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>

        {/* Solde de jetons — mis en évidence */}
        <Card className="p-6 mb-6 border-2 border-primary/30 bg-primary/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Coins className="h-10 w-10 text-primary shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Solde de jetons</p>
                <p className="text-3xl font-bold text-primary">{garage.token_balance ?? 0} €</p>
              </div>
            </div>
            <Button onClick={() => setDonJetonsOuvert(true)}>
              <Coins className="mr-2 h-4 w-4" />
              Offrir des jetons
            </Button>
          </div>
        </Card>

        {/* Statistiques démarches — compteurs COUNT SQL sur la totalité */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Démarches effectuées</p>
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          </Card>
          <Card className="p-4 border-green-500/30 bg-green-50/30 dark:bg-green-950/10">
            <p className="text-sm text-muted-foreground">Réalisées</p>
            <p className="text-2xl font-bold text-green-600">{stats?.realisees ?? 0}</p>
          </Card>
          <Card className="p-4 border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
            <p className="text-sm text-muted-foreground">En cours (payées)</p>
            <p className="text-2xl font-bold text-amber-600">{stats?.enCours ?? 0}</p>
          </Card>
          <Card className="p-4 border-red-500/30 bg-red-50/30 dark:bg-red-950/10">
            <p className="text-sm text-muted-foreground">Refusées</p>
            <p className="text-2xl font-bold text-red-600">{stats?.refusees ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Brouillons (non payés)</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats?.brouillons ?? 0}</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Coordonnées — éditables via le dialogue partagé */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Coordonnées</h2>
            <dl className="space-y-3 text-sm">
              {EDITABLE_GARAGE_FIELDS.map((field) => (
                <div key={field} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{GARAGE_FIELD_LABELS[field]}</dt>
                  <dd className="font-medium text-right break-all">{garage[field] || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Infos compte — LECTURE SEULE */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Compte</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Solde de jetons</dt>
                <dd className="font-bold">{garage.token_balance ?? 0} €</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Vérifié</dt>
                <dd>
                  {garage.is_verified ? (
                    <Badge className="bg-green-500">Oui</Badge>
                  ) : (
                    <Badge variant="secondary">Non</Badge>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Réseau</dt>
                <dd className="font-medium">{garage.reseau || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Inscrit le</dt>
                <dd className="font-medium">{formatDateTimeParis(garage.created_at) ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Client depuis</dt>
                <dd className="font-medium text-right">
                  {clientDepuis ? (
                    <>
                      {formatDateTimeParis(clientDepuis)?.slice(0, 10)}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {anciennete(clientDepuis)}
                      </span>
                    </>
                  ) : (
                    <span className="font-normal text-muted-foreground">Aucune démarche engagée</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
              Lecture seule. La vérification et le solde de jetons se pilotent depuis le
              bloc « Vérification » ci-dessous.
            </p>
          </Card>
        </div>

        {/* Documents, vérification, notifications et jetons */}
        <div className="mb-6">
          <GarageVerificationPanel
            garage={garage}
            onGarageChanged={(patch) => setGarage((prev: any) => ({ ...prev, ...patch }))}
            donJetonsOuvert={donJetonsOuvert}
            onDonJetonsOuvertChange={setDonJetonsOuvert}
          />
        </div>

        {/* Démarches récentes : en cours (payées) / brouillons (non payés) */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Démarches récentes</h2>
            <div role="tablist" className="inline-flex gap-1 rounded-lg bg-muted p-1">
              {([
                { cle: "en_cours", texte: "En cours", n: stats?.enCours },
                { cle: "brouillons", texte: "Brouillons", n: stats?.brouillons },
                { cle: "toutes", texte: "Toutes", n: undefined },
              ] as { cle: VueDemarches; texte: string; n?: number }[]).map((o) => {
                const actif = vueDemarches === o.cle;
                return (
                  <button
                    key={o.cle}
                    type="button"
                    role="tab"
                    aria-selected={actif}
                    onClick={() => setVueDemarches(o.cle)}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      actif ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.texte}
                    {o.n !== undefined && (
                      <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs tabular-nums">{o.n}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {demarches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {vueDemarches === "brouillons" ? "Aucun brouillon." : vueDemarches === "en_cours" ? "Aucune démarche en cours." : "Aucune démarche pour ce garage."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° démarche</TableHead>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demarches.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/demarche/${d.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-semibold">
                      {d.numero_demarche || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {d.immatriculation && d.immatriculation !== "TEMP" ? d.immatriculation : "—"}
                    </TableCell>
                    <TableCell>
                      {d.is_draft ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Brouillon · non payé</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <StatusPill statut={d.status} />
                          {(d.paye || d.paid_with_tokens || d.client_paid || d.is_free_token) && (
                            <span className="text-xs text-green-700 dark:text-green-400">
                              {d.is_free_token && !d.paye ? "offerte" : "payée"}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDateTimeParis(d.created_at) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <GarageEditDialog
        garage={garage}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSaved={(updated) => setGarage((prev: any) => ({ ...prev, ...updated }))}
      />
    </div>
  );
}
