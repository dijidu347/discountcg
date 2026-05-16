import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Eye, Package, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GuestOrder {
  id: string;
  tracking_number: string;
  immatriculation: string;
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
  paye: boolean;
  documents_complets: boolean;
  created_at: string;
  demarche_type?: string;
}

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffH < 1) return "il y a quelques min";
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString("fr-FR");
};

export default function GuestOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("to_process");

  useEffect(() => {
    if (user) checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) { navigate("/dashboard"); return; }
    await loadOrders();
  };

  const loadOrders = async () => {
    try {
      // Récupération par lots de 1000 pour contourner la limite Supabase par défaut
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
        if (error) throw error;
        if (!data || data.length === 0) {
          keepGoing = false;
        } else {
          all.push(...(data as GuestOrder[]));
          keepGoing = data.length === PAGE_SIZE;
          from += PAGE_SIZE;
        }
      }
      setOrders(all);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les commandes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Catégorie UNIQUE par commande (mutuellement exclusives) — priorité descendante
  const getCategory = (o: GuestOrder): string => {
    if (o.status === 'finalise') return 'done';
    if (o.status === 'refuse') return 'refused';
    if (!o.paye) return 'abandoned';                                  // jamais payé (paniers abandonnés / brouillons)
    if (['valide', 'en_traitement'].includes(o.status)) return 'in_progress'; // admin en train de traiter
    if (o.documents_complets) return 'to_process';                    // payé + docs OK → l'admin doit agir
    return 'awaiting_docs';                                           // payé mais docs manquants → on attend le client
  };

  const categoryByOrderId: Record<string, string> = {};
  const counts: Record<string, number> = {
    to_process: 0, awaiting_docs: 0, in_progress: 0, done: 0, refused: 0, abandoned: 0,
  };
  orders.forEach((o) => {
    const cat = getCategory(o);
    categoryByOrderId[o.id] = cat;
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const toProcessCount = counts.to_process;
  const awaitingDocsCount = counts.awaiting_docs;
  const inProgressCount = counts.in_progress;
  const doneCount = counts.done;
  const refusedCount = counts.refused;
  const abandonedCount = counts.abandoned;

  // Montant à afficher : montant réellement payé (source de vérité) sinon estimation
  const getDisplayAmount = (o: GuestOrder): number => {
    if (o.paye && o.montant_ttc && o.montant_ttc > 0) return o.montant_ttc;
    return (o.montant_ht || 0)
      + (o.frais_dossier || 0)
      + (o.dossier_prioritaire ? 5 : 0)
      + (o.certificat_non_gage ? 10 : 0)
      + (o.email_notifications ? 5 : 0)
      + (o.sms_notifications ? 5 : 0);
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    if (activeTab !== "all") {
      filtered = orders.filter((o) => categoryByOrderId[o.id] === activeTab);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.tracking_number.toLowerCase().includes(q) ||
        o.immatriculation.toLowerCase().includes(q) ||
        o.nom.toLowerCase().includes(q) ||
        o.prenom.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string; className?: string }> = {
      en_attente: { variant: "secondary", label: "En attente" },
      paye: { variant: "default", label: "Payé", className: "bg-blue-500" },
      en_traitement: { variant: "default", label: "En traitement", className: "bg-orange-500" },
      valide: { variant: "default", label: "Validé", className: "bg-blue-700" },
      finalise: { variant: "default", label: "Finalisé", className: "bg-green-600" },
      refuse: { variant: "destructive", label: "Refusé" },
    };
    const c = map[status] || { variant: "secondary", label: status };
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 md:p-8">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Commandes particuliers | Discount Carte Grise</title>
      </Helmet>
      <div className="max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour au dashboard
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <Package className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Commandes Particuliers</h1>
            <p className="text-muted-foreground text-sm">{orders.length} commande{orders.length > 1 ? "s" : ""} au total</p>
          </div>
        </div>

        {/* Stats cards — 4 catégories principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={`border-red-200 bg-red-50/50 dark:bg-red-950/20 cursor-pointer hover:shadow-md transition-shadow ${activeTab === "to_process" ? "ring-2 ring-red-400" : ""}`} onClick={() => setActiveTab("to_process")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{toProcessCount}</p>
                  <p className="text-xs font-medium text-red-600">À traiter</p>
                </div>
                <div className="relative">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  {toProcessCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 cursor-pointer hover:shadow-md transition-shadow ${activeTab === "awaiting_docs" ? "ring-2 ring-orange-400" : ""}`} onClick={() => setActiveTab("awaiting_docs")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-orange-600">{awaitingDocsCount}</p>
                  <p className="text-xs font-medium text-orange-600">En attente de documents</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={`border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 cursor-pointer hover:shadow-md transition-shadow ${activeTab === "in_progress" ? "ring-2 ring-blue-400" : ""}`} onClick={() => setActiveTab("in_progress")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                  <p className="text-xs font-medium text-blue-600">En traitement</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={`border-green-200 bg-green-50/50 dark:bg-green-950/20 cursor-pointer hover:shadow-md transition-shadow ${activeTab === "done" ? "ring-2 ring-green-400" : ""}`} onClick={() => setActiveTab("done")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{doneCount}</p>
                  <p className="text-xs font-medium text-green-600">Finalisé</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + Search */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="to_process">À traiter ({toProcessCount})</TabsTrigger>
              <TabsTrigger value="awaiting_docs">En attente de documents ({awaitingDocsCount})</TabsTrigger>
              <TabsTrigger value="in_progress">En traitement ({inProgressCount})</TabsTrigger>
              <TabsTrigger value="done">Finalisé ({doneCount})</TabsTrigger>
              <TabsTrigger value="refused">Refusées ({refusedCount})</TabsTrigger>
              <TabsTrigger value="abandoned">Abandonnées ({abandonedCount})</TabsTrigger>
              <TabsTrigger value="all">Toutes ({orders.length})</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table content for all tabs */}
          {["to_process", "awaiting_docs", "in_progress", "done", "refused", "abandoned", "all"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Commande</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Immat</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Paiement</TableHead>
                          <TableHead>Documents</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                              Aucune commande trouvée
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.map((order) => (
                            <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/guest-order/${order.id}`)}>
                              <TableCell className="font-mono font-medium text-sm">{order.tracking_number}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {order.demarche_type === 'DA' ? "DA" : order.demarche_type === 'DC' ? "DC" : "CG"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{order.prenom} {order.nom}</p>
                                  <p className="text-xs text-muted-foreground">{order.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{order.immatriculation}</TableCell>
                              <TableCell className="font-medium text-sm">
                                {getDisplayAmount(order).toFixed(2)} €
                                {!order.paye && <span className="block text-[10px] text-muted-foreground font-normal">estimation</span>}
                              </TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>
                                <Badge variant={order.paye ? "default" : "secondary"} className={order.paye ? "bg-green-600" : ""}>
                                  {order.paye ? "Payé" : "Non payé"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={order.documents_complets ? "default" : "secondary"} className={order.documents_complets ? "bg-green-600" : ""}>
                                  {order.documents_complets ? "Complets" : "Incomplets"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatRelativeDate(order.created_at)}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/guest-order/${order.id}`); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
