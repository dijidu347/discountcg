import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/StatusPill";
import {
  LogOut, FileText, Eye, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Plus, User, Download,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SecureDownloadButton } from "@/components/SecureDownloadButton";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-yellow-500", icon: Clock },
  paye: { label: "Payé", color: "bg-blue-500", icon: CheckCircle },
  en_traitement: { label: "En traitement", color: "bg-blue-500", icon: Clock },
  valide: { label: "Validé", color: "bg-green-500", icon: CheckCircle },
  finalise: { label: "Finalisé", color: "bg-green-600", icon: CheckCircle },
  refuse: { label: "Refusé", color: "bg-red-500", icon: AlertCircle },
};

export default function MonEspace() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminDocs, setAdminDocs] = useState<Record<string, any[]>>({});
  // État documentaire par commande — extensible : "rejected" (rouge) maintenant,
  // "missing" (orange) plus tard, sans changer la structure.
  const [docIssues, setDocIssues] = useState<Record<string, { rejected: boolean; missing: boolean }>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login-particulier");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profile
      let { data: profileData } = await supabase
        .from("particulier_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      // Auto-create profile for Google OAuth users who don't have one yet
      if (!profileData && user) {
        const meta = user.user_metadata || {};
        const { data: newProfile } = await supabase
          .from("particulier_profiles")
          .insert({
            user_id: user.id,
            email: user.email || "",
            nom: meta.full_name?.split(" ").slice(1).join(" ") || meta.name || "",
            prenom: meta.full_name?.split(" ")[0] || "",
            telephone: "",
          })
          .select()
          .single();
        profileData = newProfile;

        // Ensure particulier role exists
        await supabase
          .from("user_roles")
          .upsert({ user_id: user.id, role: "particulier" as any }, { onConflict: "user_id,role" });

        // Auto-link existing guest orders
        await supabase
          .from("guest_orders")
          .update({ user_id: user.id })
          .eq("email", user.email || "")
          .is("user_id", null);
      }
      setProfile(profileData);

      // Load orders linked to this user
      const { data: ordersData } = await supabase
        .from("guest_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setOrders(ordersData || []);

      // Load admin documents for each order
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((o) => o.id);
        const { data: docsData } = await supabase
          .from("guest_order_admin_documents")
          .select("*")
          .in("order_id", orderIds);

        const docsMap: Record<string, any[]> = {};
        (docsData || []).forEach((doc) => {
          if (!docsMap[doc.order_id]) docsMap[doc.order_id] = [];
          docsMap[doc.order_id].push(doc);
        });
        setAdminDocs(docsMap);

        // Niveau 1 — statuts terminaux : une commande traitée n'affiche jamais de pastille.
        const TERMINAL_STATUSES = ["valide", "finalise", "refuse"];
        const orderIdsToCheck = ordersData
          .filter((o) => !TERMINAL_STATUSES.includes(o.status))
          .map((o) => o.id);

        if (orderIdsToCheck.length > 0) {
          // UNE seule requête groupée : tous les documents des commandes non terminales.
          const { data: docs } = await supabase
            .from("guest_order_documents")
            .select("order_id, type_document, side, validation_status, created_at")
            .in("order_id", orderIdsToCheck);

          // Niveau 2 — par commande + type (+ side recto/verso), ne garder que le document
          // le PLUS RÉCENT ; refus d'actualité seulement si ce dernier est 'rejected'.
          const latestByKey: Record<string, { orderId: string; created_at: string; status: string | null }> = {};
          (docs || []).forEach((doc: any) => {
            const key = `${doc.order_id}|${doc.type_document}|${doc.side ?? ""}`;
            const prev = latestByKey[key];
            if (!prev || new Date(doc.created_at).getTime() > new Date(prev.created_at).getTime()) {
              latestByKey[key] = { orderId: doc.order_id, created_at: doc.created_at, status: doc.validation_status };
            }
          });

          const issues: Record<string, { rejected: boolean; missing: boolean }> = {};
          Object.values(latestByKey).forEach((v) => {
            if (v.status === "rejected") issues[v.orderId] = { rejected: true, missing: false };
          });
          setDocIssues(issues);
        }
      }
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Helmet>
        <title>Mon espace | Discount Carte Grise</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navbar />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Bonjour {profile?.prenom || ""}  👋
              </h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/carte-grise")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle démarche
              </Button>
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Orders list */}
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune commande</h3>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore de démarche en cours.
                </p>
                <Button onClick={() => navigate("/carte-grise")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Commencer une démarche
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Mes commandes ({orders.length})</h2>
              {orders.map((order) => {
                const status = statusLabels[order.status] || statusLabels.en_attente;
                const StatusIcon = status.icon;
                const docs = adminDocs[order.id] || [];

                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary text-lg">
                              {order.immatriculation}
                            </span>
                            <Badge className={`${status.color} text-white`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <StatusPill statut={order.status} hasActiveRejectedDoc={docIssues[order.id]?.rejected ?? false} />
                          <p className="text-sm text-muted-foreground">
                            N° de suivi : <span className="font-mono">{order.tracking_number}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("fr-FR")}
                            {order.demarche_type && ` • ${order.demarche_type}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/suivi/${order.tracking_number}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir le suivi
                          </Button>
                        </div>
                      </div>

                      {/* Admin documents (carte grise reçue, etc.) */}
                      {docs.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            Documents reçus
                          </p>
                          <div className="space-y-2">
                            {docs.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <span className="text-sm truncate">{doc.nom_fichier}</span>
                                <SecureDownloadButton
                                  url={doc.url}
                                  filename={doc.nom_fichier}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
