import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Bell, CheckCircle, CreditCard, XCircle,
  Search, ChevronLeft, ChevronRight, Download,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

import { ExpressBadge } from "@/components/admin/ExpressBadge";
import { TransactionDate } from "@/components/admin/TransactionDate";
import { getExpressSurcharge } from "@/lib/expressOption";

interface GuestOrder {
  id: string;
  tracking_number: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  nom: string;
  prenom: string;
  email: string;
  montant_ht: number;
  montant_ttc: number;
  frais_dossier: number;
  sms_notifications?: boolean;
  email_notifications?: boolean;
  dossier_prioritaire?: boolean;
  certificat_non_gage?: boolean;
  status: string;
  express?: boolean;
  paye: boolean;
  documents_complets: boolean;
  admin_viewed?: boolean | null;
  created_at: string;
  /** Instant de l'encaissement, posé par les webhooks Stripe/Sogecommerce. */
  paid_at?: string | null;
  demarche_type?: string;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Récupère TOUTES les commandes en boucle par tranches de 1000
 * (Supabase limite à 1000 lignes par requête).
 */
const fetchAllOrders = async (
  onProgress?: (loaded: number) => void
): Promise<GuestOrder[]> => {
  const PAGE_SIZE = 1000;
  const all: GuestOrder[] = [];
  let from = 0;
  let keepGoing = true;

  while (keepGoing) {
    const { data, error } = await supabase
      .from("guest_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Erreur fetch commandes:", error);
      break;
    }

    if (!data || data.length === 0) {
      keepGoing = false;
    } else {
      all.push(...(data as GuestOrder[]));
      onProgress?.(all.length);
      keepGoing = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }
  }

  return all;
};

const PAGE_SIZE = 50;

// ──────────────────────────────────────────────────────────────────────
// Composant principal
// ──────────────────────────────────────────────────────────────────────

export default function GuestOrders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(0);

  // Filtres globaux
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Pages courantes par section
  const [pageATraiter, setPageATraiter] = useState(1);
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

    try {
      const allOrders = await fetchAllOrders((loaded) => setProgressLoaded(loaded));
      setOrders(allOrders);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les commandes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Montant à afficher : montant réellement payé (source de vérité) sinon estimation ──
  // Estimation alignée à l'identique sur computeGuestTotal (edge create-sogecommerce-guest-payment) :
  // montant_ht + frais_dossier + sms + certificat_non_gage + express(surcharge selon type).
  // Sans dossier_prioritaire (colonne morte) ni email (non facturé).
  const getDisplayAmount = (o: GuestOrder): number => {
    if (o.paye && o.montant_ttc && o.montant_ttc > 0) return o.montant_ttc;
    return (o.montant_ht || 0)
      + (o.frais_dossier || 0)
      + (o.sms_notifications ? 5 : 0)
      + (o.certificat_non_gage ? 10 : 0)
      + (o.express ? getExpressSurcharge(o.demarche_type) : 0);
  };

  // ── Filtres dérivés ────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach((o) => {
      if (o.created_at) years.add(new Date(o.created_at).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    orders.forEach((o) => o.demarche_type && types.add(o.demarche_type));
    return Array.from(types).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      // Recherche : n° commande (TRK), immat, nom, prénom, email
      if (q) {
        const matchesSearch =
          (o.tracking_number || "").toLowerCase().includes(q) ||
          (o.immatriculation || "").toLowerCase().includes(q) ||
          (o.nom || "").toLowerCase().includes(q) ||
          (o.prenom || "").toLowerCase().includes(q) ||
          (o.email || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Année
      if (yearFilter !== "all" && o.created_at) {
        const y = new Date(o.created_at).getFullYear();
        if (y !== parseInt(yearFilter, 10)) return false;
      }
      // Type (DA / DC / CG…)
      if (typeFilter !== "all" && o.demarche_type !== typeFilter) return false;
      return true;
    });
  }, [orders, searchQuery, yearFilter, typeFilter]);

  // ── Buckets filtrés ────────────────────────────────────────────────
  const aTraiter = useMemo(
    () =>
      filtered.filter(
        (o) => o.paye === true && o.status !== "finalise" && o.status !== "refuse"
      ),
    [filtered]
  );
  const terminees = useMemo(
    () => filtered.filter((o) => o.status === "finalise"),
    [filtered]
  );
  const refusees = useMemo(
    () => filtered.filter((o) => o.status === "refuse"),
    [filtered]
  );

  // Reset pagination quand les filtres changent
  useEffect(() => {
    setPageATraiter(1);
    setPageRefusees(1);
    setPageTerminees(1);
  }, [searchQuery, yearFilter, typeFilter]);

  // ── Compteur "non vues" ────────────────────────────────────────────
  const unviewedCount = aTraiter.filter((o) => !o.admin_viewed).length;

  // ── Handlers ───────────────────────────────────────────────────────
  const handleViewOrder = async (order: GuestOrder) => {
    if (!order.admin_viewed) {
      await supabase
        .from("guest_orders")
        .update({ admin_viewed: true })
        .eq("id", order.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, admin_viewed: true } : o))
      );
    }
    navigate(`/admin/guest-order/${order.id}`);
  };

  // ── Export CSV (utile quand il y a beaucoup d'historique) ──────────
  const exportCsv = () => {
    const rows = filtered;
    if (!rows.length) return;
    const headers = [
      "N° Commande", "Client", "Email", "Immatriculation",
      "Type", "Montant", "Statut", "Date création",
    ];
    const csv = [
      headers.join(";"),
      ...rows.map((o) =>
        [
          o.tracking_number,
          `${o.prenom || ""} ${o.nom || ""}`.trim(),
          o.email || "",
          o.immatriculation,
          o.demarche_type || "",
          getDisplayAmount(o).toFixed(2).replace(".", ","),
          o.status,
          new Date(o.created_at).toLocaleDateString("fr-FR"),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes_particuliers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────────────
  // Helpers UI
  // ──────────────────────────────────────────────────────────────────

  const getPaymentStatusBadge = (order: GuestOrder) => {
    if (order.paye) {
      return (
        <Badge className="bg-blue-500 text-white">
          <CreditCard className="h-3 w-3 mr-1" /> Payé
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-muted-foreground">Non payé</Badge>;
  };

  const renderClientCell = (o: GuestOrder) => (
    <div className="flex flex-col">
      <span className="font-medium">{`${o.prenom || ""} ${o.nom || ""}`.trim() || "—"}</span>
      <span className="text-xs text-muted-foreground">{o.email || "—"}</span>
    </div>
  );

  const renderAmountCell = (o: GuestOrder) => (
    <div className="font-medium">
      {getDisplayAmount(o).toFixed(2)} €
      {!o.paye && <span className="block text-[10px] text-muted-foreground font-normal">estimation</span>}
    </div>
  );

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
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(1)}>
            «
          </Button>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs px-2 font-medium">
            Page {page} / {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(totalPages)}>
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
            Chargement des commandes… {progressLoaded} lignes
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Commandes particuliers | Discount Carte Grise</title>
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
                placeholder="Rechercher : n° commande, immat, client, email…"
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
            <strong>{filtered.length}</strong> commande{filtered.length > 1 ? "s" : ""} affichée
            {filtered.length > 1 ? "s" : ""} sur <strong>{orders.length}</strong> au total
          </p>
        </Card>

        {/* ── Section À TRAITER ────────────────────────────────── */}
        <Card className="p-6 mb-8 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Commandes à traiter</h1>
            <Badge variant="outline">{aTraiter.length}</Badge>
            {unviewedCount > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                {unviewedCount} nouvelle{unviewedCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {aTraiter.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune commande à traiter</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginate(aTraiter, pageATraiter).map((o) => (
                    <TableRow
                      key={o.id}
                      className={
                        !o.admin_viewed
                          ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500"
                          : ""
                      }
                    >
                      <TableCell>
                        {!o.admin_viewed && (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        <div className="flex items-center gap-2">
                          {o.tracking_number}
                          <ExpressBadge express={o.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {o.immatriculation}
                        {(o.marque || o.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[o.marque, o.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{renderClientCell(o)}</TableCell>
                      <TableCell>{o.demarche_type || "—"}</TableCell>
                      <TableCell>{getPaymentStatusBadge(o)}</TableCell>
                      <TableCell>{renderAmountCell(o)}</TableCell>
                      <TableCell><TransactionDate row={o} /></TableCell>
                      <TableCell>
                        <Link to={`/admin/guest-order/${o.id}`} onClick={() => handleViewOrder(o)}>
                          <Button
                            size="sm"
                            className={!o.admin_viewed ? "bg-red-500 hover:bg-red-600" : ""}
                          >
                            {!o.admin_viewed ? "À traiter" : "Voir"}
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

        {/* ── Section REFUSÉES ─────────────────────────────────── */}
        <Card className="p-6 mb-8 border-2 border-red-500/20 bg-red-50/5">
          <div className="flex items-center gap-3 mb-6">
            <XCircle className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-500">
              Commandes refusées
            </h1>
            <Badge variant="outline" className="border-red-500 text-red-600">
              {refusees.length}
            </Badge>
          </div>

          {refusees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune commande refusée</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginate(refusees, pageRefusees).map((o) => (
                    <TableRow key={o.id} className="bg-red-50/50 dark:bg-red-950/10">
                      <TableCell className="font-mono text-xs font-semibold text-red-700">
                        <div className="flex items-center gap-2">
                          {o.tracking_number}
                          <ExpressBadge express={o.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {o.immatriculation}
                        {(o.marque || o.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[o.marque, o.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{renderClientCell(o)}</TableCell>
                      <TableCell>{o.demarche_type || "—"}</TableCell>
                      <TableCell>{getPaymentStatusBadge(o)}</TableCell>
                      <TableCell>{renderAmountCell(o)}</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Link to={`/admin/guest-order/${o.id}`}>
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

        {/* ── Section TERMINÉES ────────────────────────────────── */}
        <Card className="p-6 mb-8 border-2 border-green-500/20 bg-green-50/5">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-500">
              Commandes terminées
            </h1>
            <Badge variant="outline" className="border-green-500 text-green-600">
              {terminees.length}
            </Badge>
          </div>

          {terminees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune commande terminée</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginate(terminees, pageTerminees).map((o) => (
                    <TableRow key={o.id} className="bg-green-50/50 dark:bg-green-950/10">
                      <TableCell className="font-mono text-xs font-semibold text-green-700">
                        <div className="flex items-center gap-2">
                          {o.tracking_number}
                          <ExpressBadge express={o.express} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {o.immatriculation}
                        {(o.marque || o.modele) && (
                          <span className="block text-xs text-muted-foreground">
                            {[o.marque, o.modele].filter(Boolean).join(" ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{renderClientCell(o)}</TableCell>
                      <TableCell>{o.demarche_type || "—"}</TableCell>
                      <TableCell>{getPaymentStatusBadge(o)}</TableCell>
                      <TableCell>{renderAmountCell(o)}</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <Link to={`/admin/guest-order/${o.id}`}>
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
      </div>
    </div>
  );
}
