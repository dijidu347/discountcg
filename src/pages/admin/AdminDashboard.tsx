import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, FileText, DollarSign, Mail, Calculator } from "lucide-react";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalGarages: 0,
    totalDemarches: 0,
    demarchesEnAttente: 0,
    totalPaiements: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndLoadData();
    }
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');

    if (!hasAdminRole) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);

    // Load admin statistics
    const { data: garages } = await supabase
      .from('garages')
      .select('id');

    const { data: demarches } = await supabase
      .from('demarches')
      .select('status, montant_ttc');

    const { data: paiements } = await supabase
      .from('paiements')
      .select('montant, status');

    setStats({
      totalGarages: garages?.length || 0,
      totalDemarches: demarches?.length || 0,
      demarchesEnAttente: demarches?.filter(d => d.status === 'en_attente' || d.status === 'en_saisie').length || 0,
      totalPaiements: paiements?.filter(p => p.status === 'valide').reduce((sum, p) => sum + Number(p.montant), 0) || 0
    });

    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Administration</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de la plateforme DiscountCG
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total Garages</CardDescription>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl">{stats.totalGarages}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Entreprises inscrites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total Démarches</CardDescription>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl">{stats.totalDemarches}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Démarches créées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>En attente</CardDescription>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl text-orange-600">
                {stats.demarchesEnAttente}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                À traiter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Revenus</CardDescription>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl text-green-600">
                {stats.totalPaiements.toFixed(2)} €
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Paiements validés
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestion</CardTitle>
            <CardDescription>
              Gérer les démarches et les utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/demarches")}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Toutes les démarches</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/manage-garages")}
              >
                <Building2 className="h-6 w-6" />
                <span className="text-sm font-medium">Gérer les garages</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/manage-accounts")}
              >
                <Building2 className="h-6 w-6" />
                <span className="text-sm font-medium">Gestion des comptes</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/manage-subscriptions")}
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-sm font-medium">Gérer les abonnements</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/notifications")}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Notifications</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/historique-paiements")}
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-sm font-medium">Historique paiements</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/actions")}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Actions rapides</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/users")}
              >
                <Building2 className="h-6 w-6" />
                <span className="text-sm font-medium">Administrateurs</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/email-templates")}
              >
                <Mail className="h-6 w-6" />
                <span className="text-sm font-medium">Templates Email</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/pricing-config")}
              >
                <Calculator className="h-6 w-6" />
                <span className="text-sm font-medium">Simulateur Particulier</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
