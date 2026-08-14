import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Bell, CheckCircle, Clock, Gift, CreditCard, XCircle,
  Search, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ExpressBadge } from "@/components/admin/ExpressBadge";
import { TransactionDate } from "@/components/admin/TransactionDate";
import { StatusPill } from "@/components/StatusPill";
import { TERMINAL_STATUSES } from "@/lib/demarcheStatusBadge";
import { isATraiter } from "@/lib/demarcheFilters";

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Récupère TOUTES les démarches en boucle par tranches de 1000
 * (Supabase limite à 1000 lignes par requête).
 */
const fetchAllDemarches = async (
  onProgress?: (loaded: number) => void
): Promise<any[]> => {
  const PAGE_SIZE = 1000;
  const all: any[] = [];
  let from = 0;
  let keepGoing = true;

  while (keepGoing) {
    const { data, error } = await supabase
      .from("demarches")
      .select("*, garages(raison_sociale, is_verified), vehicules(marque, modele)")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Erreur fetch démarches:", error);
      break;
    }

    if (!data || data.length === 0) {
      keepGoing = false;
    } else {
      all.push(...data);
      onProgress?.(all.length);
      keepGoing = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }
  }

  return all;
};

const PAGE_SIZE = 50;

const toTime = (value?: string | null) => (value ? new Date(value).getTime() : 0);

/**
 * Ordre de la file « À traiter » :
 *   1. les non vues (admin_viewed false OU null) en tête ;
 *   2. dans chaque groupe, l'activité la plus récente d'abord (updated_at desc).
 *
 * `updated_at` est posé par le trigger `update_demarches_updated_at` à CHAQUE
 * UPDATE de la ligne. L'ajout d'un document par le client (DocumentUpload.tsx,
 * qui repasse admin_viewed à false) le remet donc à now() : la démarche
 * redevient non vue ET remonte en tête. Fallback created_at si updated_at manque.
 */
const parActiviteRecente = (a: any, b: any) => {
  const aVue = a.admin_viewed === true;
  const bVue = b.admin_viewed === true;
  if (aVue !== bVue) return aVue ? 1 : -1;
  return toTime(b.updated_at ?? b.created_at) - toTime(a.updated_at ?? a.created_at);
};

// ──────────────────────────────────────────────────────────────────────
// Composant principal
// ──────────────────────────────────────────────────────────────────────

export default function AllDemarches() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [demarches, setDemarches] = useState<any[]>([]);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(0);

  // Filtres globaux
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Pages courantes par section
  const [pageATraiter, setPageATraiter] = useState(1);
  const [pageAttenteClient, setPageAttenteClient] = useState(1);
  const [pageRefusees, setPageRefusees] = useState(1);
  const [pageTerminees, setPageTerminees] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdminRole = roles?.some((r) => r.role === "admin");
    if (!hasAdminRole) {
      navigate("/dashboard");
      return;
    }
    setIsAdmin(true);

    const allDemarches = await fetchAllDemarches((loaded) =>
      setProgressLoaded(loaded)
    );

    // On garde uniquement les non-brouillons (le bloc Brouillons a été retiré)
    setDemarches(allDemarches.filter((d) => d.is_draft === false));

    // UNE seule requête groupée : refus D'ACTUALITÉ (dernier doc par type = rejected)
    // sur les démarches non terminales — pour la pastille ROUGE côté admin aussi.
    const ids = allDemarches
      .filter((d) => d.is_draft === false && !TERMINAL_STATUSES.includes(d.status))
      .map((d) => d.id);
    if (ids.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("demarche_id, type_document, validation_status, created_at")
        .in("demarche_id", ids);
      const latestByKey: Record<string, { demarcheId: string; created_at: string; status: string | null }> = {};
      (docs || []).forEach((doc: any) => {
        const key = `${doc.demarche_id}|${doc.type_document}`;
        const prev = latestByKey[key];
        if (!prev || new Date(doc.created_at).getTime() > new Date(prev.created_at).getTime()) {
          latestByKey[key] = { demarcheId: doc.demarche_id, created_at: doc.created_at, status: doc.validation_status };
        }
      });
      const set = new Set<string>();
      Object.values(latestByKey).forEach((v) => { if (v.status === "rejected") set.add(v.demarcheId); });
      setRejectedIds(set);
    }

    setLoading(false);
  };

  // ── Filtres dérivés ────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    demarches.forEach((d) => {
      if (d.created_at) years.add(new Date(d.created_at).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [demarches]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    demarches.forEach((d) => d.type && types.add(d.type));
    return Array.from(types).sort();
  }, [demarches]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return demarches.filter((d) => {
      // Recherche : immat, n° démarche, raison sociale
      if (q) {
        const matchesSearch =
          (d.immatriculation || "").toLowerCase().includes(q) ||
          (d.numero_demarche || "").toLowerCase().includes(q) ||
          (d.garages?.raison_sociale || "").toLowerCase().includes(q) ||
          (d.client_email || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Année
      if (yearFilter !== "all" && d.created_at) {
        const y = new Date(d.created_at).getFullYear();
        if (y !== parseInt(yearFilter, 10)) return false;
      }
      // Type (DA / DC / CG…)
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      return true;
    });
  }, [demarches, searchQuery, yearFilter, typeFilter]);

  // ── Buckets filtrés ────────────────────────────────────────────────
  // Source unique de vérité : prédicat partagé isATraiter (identique au count
  // SQL du tableau de bord). `filtered` est déjà non-brouillon (is_draft=false).
  // `.filter()` renvoie déjà un nouveau tableau : le `.sort()` ne mute ni
  // `filtered` ni `demarches` (les autres sections gardent leur ordre).
  const aTraiter = useMemo(
    () => filtered.filter(isATraiter).sort(parActiviteRecente),
    [filtered]
  );
  const attenteClient = useMemo(
    () => filtered.filter((d) => d.status === "en_attente_paiement_client"),
    [filtered]
  );
  const terminees = useMemo(
    () => filtered.filter((d) => d.status === "finalise"),
    [filtered]
  );
  const refusees = useMemo(
    () => filtered.filter((d) => d.status === "refuse"),
    [filtered]
  );

  // Reset pagination quand les filtres changent
  useEffect(() => {
    setPageATraiter(1);
    setPageAttenteClient(1);
    setPageRefusees(1);
    setPageTerminees(1);
  }, [searchQuery, yearFilter, typeFilter]);

  // ── Compteur "non vues" ────────────────────────────────────────────
  const unviewedCount = aTraiter.filter((d) => !d.admin_viewed).length;

  // ── Handlers ───────────────────────────────────────────────────────
  const handleViewDemarche = async (demarche: any) => {
    if (!demarche.admin_viewed) {
      await supabase
        .from("demarches")
        .update({ admin_viewed: true })
        .eq("id", demarche.id);
      setDemarches((prev) =>
        prev.map((d) => (d.id === demarche.id ? { ...d, admin_viewed: true } : d))
      );
    }
    navigate(`/admin/demarche/${demarche.id}`);
  };

  // ── Export CSV (utile quand il y a beaucoup d'historique) ──────────
  const exportCsv = () => {
    const rows = filtered;
    if (!rows.length) return;
    const headers = [
      "Numéro", "Immatriculation", "Garage", "Type", "Statut",
      "Payé", "Jeton gratuit", "Montant TTC", "Date création",
    ];
    const csv = [
      headers.join(";"),
      ...rows.map((d) =>
        [
          d.numero_demarche,
          d.immatriculation,
          d.garages?.raison_sociale || "",
          d.type,
          d.status,
          d.paye ? "oui" : "non",
          d.is_free_token ? "oui" : "non",
          (d.montant_ttc || 0).toString().replace(".", ","),
          new Date(d.created_at).toLocaleDateString("fr-FR"),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demarches_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────────────
  // Helpers UI
  // ──────────────────────────────────────────────────────────────────

  const getPaymentStatusBadge = (demarche: any) => {
    if (demarche.is_free_token) {
      return (
        <Badge className="bg-green-500 text-white">
          <Gift className="h-3 w-3 mr-1" /> Jeton gratuit
        </Badge>
      );
    }
    if (demarche.paye) {
      return (
        <Badge className="bg-blue-500 text-white">
          <CreditCard className="h-3 w-3 mr-1" /> Payé
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-muted-foreground">Non payé</Badge>;
  };

  // Composant pagination compact (réutilisé pour chaque section)
  const Pagination = ({
    page,
    total,
    onChange,
  }: {
    page: number;
    total: number;
    onChange: (p: number) => void;
  }) => {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (total <= PAGE_SIZE) return null;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return (
      <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {start}–{end} sur <strong>{total}</strong>
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onChange(1)}
          >
            «
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs px-2 font-medium">
            Page {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onChange(totalPages)}
          >
            »
          </Button>
        </div>
      </div>
    );
  };

  // Slice utilitaire
  const paginate = <T,>(arr: T[], page: number): T[] =>
    arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ──────────────────────────────────────────────────────────────────
  // Rendu
  // ──────────────────────────────────────────────────────────────────

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        {progressLoaded > 0 && (
          <p className="text-sm text-muted-foreground">
            Chargement des démarches… {progressLoaded} lignes
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Toutes les démarches | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>

        {/* ── Barre de filtres globaux ──────────────────────────── */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher : immat, n° démarche, garage, email client…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes années</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-2" /> Exporter CSV
            </Button>

            {(searchQuery || yearFilter !== "all" || typeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setYearFilter("all");
                  setTypeFilter("all");
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            <strong>{filtered.length}</strong> démarche{filtered.length > 1 ? "s" : ""} affichée
            {filtered.length > 1 ? "s" : ""} sur <strong>{demarches.length}</strong> au total
          </p>
        </Card>

        {/* ── Section À TRAITER ────────────────────────────────── */}
        <Card className="p-6 mb-8 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Démarches à traiter</h1>
            <Badge variant="outline">{aTraiter.length}</Badge>
            {unviewedCount > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                {unviewedCount} nouvelle{unviewedCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {aTraiter.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune démarche à traiter</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>N° Démarche</TableHead>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Garage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginate(aTraiter, pageATraiter).map((d: any) => (
                    <TableRow
                      key={d.id}
                      className={
                        !d.admin_viewed
                          ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500"
                          : ""
                      }
                    >
                      <TableCell>
                        {!d.admin_viewed && (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        <div className="flex items-center gap-2">
                          {d.numero_demarche}
                          <ExpressBadge express={d.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {d.immatriculation}
                        {(d.marque || d.vehicules?.marque || d.modele || d.vehicules?.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[d.marque || d.vehicules?.marque, d.modele || d.vehicules?.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                        <div className="mt-1">
                          <StatusPill statut={d.status} hasActiveRejectedDoc={rejectedIds.has(d.id)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {d.garages?.raison_sociale}
                          {d.garages?.is_verified && (
                            <Badge className="bg-green-500 text-xs">Vérifié</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{getPaymentStatusBadge(d)}</TableCell>
                      <TableCell>{formatPrice(d.montant_ttc || 0)}€</TableCell>
                      <TableCell><TransactionDate row={d} /></TableCell>
                      <TableCell>
                        <Link to={`/admin/demarche/${d.id}`} onClick={() => handleViewDemarche(d)}>
                          <Button
                            size="sm"
                            className={!d.admin_viewed ? "bg-red-500 hover:bg-red-600" : ""}
                          >
                            {!d.admin_viewed ? "À traiter" : "Voir"}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={pageATraiter} total={aTraiter.length} onChange={setPageATraiter} />
            </>
          )}
        </Card>

        {/* ── Section ATTENTE PAIEMENT CLIENT ─────────────────── */}
        {attenteClient.length > 0 && (
          <Card className="p-6 mb-8 border-2 border-amber-500/20 bg-amber-50/5">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-6 w-6 text-amber-600" />
              <h1 className="text-2xl font-bold text-amber-700 dark:text-amber-500">
                En attente paiement client
              </h1>
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                {attenteClient.length}
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Démarche</TableHead>
                  <TableHead>Immat.</TableHead>
                  <TableHead>Garage</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Garage a payé</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Lien envoyé</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginate(attenteClient, pageAttenteClient).map((d: any) => {
                  const tokenExpired =
                    d.client_payment_token_expires_at &&
                    new Date(d.client_payment_token_expires_at) < new Date();
                  return (
                    <TableRow key={d.id} className="bg-amber-50/50 dark:bg-amber-950/10">
                      <TableCell className="font-mono text-xs font-semibold text-amber-700">
                        <div className="flex items-center gap-2">
                          {d.numero_demarche}
                          <ExpressBadge express={d.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {d.immatriculation}
                        {(d.marque || d.vehicules?.marque || d.modele || d.vehicules?.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[d.marque || d.vehicules?.marque, d.modele || d.vehicules?.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                        <div className="mt-1">
                          <StatusPill statut={d.status} hasActiveRejectedDoc={rejectedIds.has(d.id)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{d.garages?.raison_sociale}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                          {d.payment_mode === "split"
                            ? "Partagé"
                            : d.payment_mode === "client_pays_all"
                            ? "Client paie tout"
                            : d.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.payment_mode === "client_pays_all" ? (
                          <Badge variant="outline" className="text-muted-foreground text-xs">N/A</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white text-xs">Oui</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs">{d.client_email || "—"}</div>
                          {d.client_paid ? (
                            <Badge className="bg-green-500 text-white text-xs">A payé</Badge>
                          ) : (
                            <Badge className="bg-amber-500 text-white text-xs">En attente</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {d.client_payment_token ? (
                          <Badge className="bg-blue-500 text-white text-xs">Envoyé</Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white text-xs">Non envoyé</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {d.client_payment_token_expires_at ? (
                          <span className={tokenExpired ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                            {tokenExpired
                              ? "Expiré"
                              : new Date(d.client_payment_token_expires_at).toLocaleDateString("fr-FR")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/demarche/${d.id}`}>
                          <Button variant="outline" size="sm">Voir</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={pageAttenteClient}
              total={attenteClient.length}
              onChange={setPageAttenteClient}
            />
          </Card>
        )}

        {/* ── Section TERMINÉES ────────────────────────────────── */}
        <Card className="p-6 mb-8 border-2 border-green-500/20 bg-green-50/5">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-500">
              Démarches terminées
            </h1>
            <Badge variant="outline" className="border-green-500 text-green-600">
              {terminees.length}
            </Badge>
          </div>

          {terminees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune démarche terminée</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Démarche</TableHead>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Garage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginate(terminees, pageTerminees).map((d: any) => (
                    <TableRow key={d.id} className="bg-green-50/50 dark:bg-green-950/10">
                      <TableCell className="font-mono text-xs font-semibold text-green-700">
                        <div className="flex items-center gap-2">
                          {d.numero_demarche}
                          <ExpressBadge express={d.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {d.immatriculation}
                        {(d.marque || d.vehicules?.marque || d.modele || d.vehicules?.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[d.marque || d.vehicules?.marque, d.modele || d.vehicules?.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                        <div className="mt-1">
                          <StatusPill statut={d.status} hasActiveRejectedDoc={rejectedIds.has(d.id)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {d.garages?.raison_sociale}
                          {d.garages?.is_verified && (
                            <Badge className="bg-green-500 text-xs">Vérifié</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{getPaymentStatusBadge(d)}</TableCell>
                      <TableCell>{formatPrice(d.montant_ttc || 0)}€</TableCell>
                      <TableCell>{new Date(d.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Link to={`/admin/demarche/${d.id}`}>
                          <Button variant="outline" size="sm">Voir</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={pageTerminees} total={terminees.length} onChange={setPageTerminees} />
            </>
          )}
        </Card>

        {/* ── Section REFUSÉES ─────────────────────────────────── */}
        <Card className="p-6 mb-8 border-2 border-red-500/20 bg-red-50/5">
          <div className="flex items-center gap-3 mb-6">
            <XCircle className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-500">
              Démarches refusées
            </h1>
            <Badge variant="outline" className="border-red-500 text-red-600">
              {refusees.length}
            </Badge>
          </div>

          {refusees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune démarche refusée</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Démarche</TableHead>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Garage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginate(refusees, pageRefusees).map((d: any) => (
                    <TableRow key={d.id} className="bg-red-50/50 dark:bg-red-950/10">
                      <TableCell className="font-mono text-xs font-semibold text-red-700">
                        <div className="flex items-center gap-2">
                          {d.numero_demarche}
                          <ExpressBadge express={d.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {d.immatriculation}
                        {(d.marque || d.vehicules?.marque || d.modele || d.vehicules?.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[d.marque || d.vehicules?.marque, d.modele || d.vehicules?.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                        <div className="mt-1">
                          <StatusPill statut={d.status} hasActiveRejectedDoc={rejectedIds.has(d.id)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {d.garages?.raison_sociale}
                          {d.garages?.is_verified && (
                            <Badge className="bg-green-500 text-xs">Vérifié</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{getPaymentStatusBadge(d)}</TableCell>
                      <TableCell>{formatPrice(d.montant_ttc || 0)}€</TableCell>
                      <TableCell>{new Date(d.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Link to={`/admin/demarche/${d.id}`}>
                          <Button variant="outline" size="sm">Voir</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={pageRefusees} total={refusees.length} onChange={setPageRefusees} />
            </>
          )}
        </Card>

        {/* Le bloc "Brouillons en cours de saisie" a été supprimé volontairement */}
      </div>
    </div>
  );
}
