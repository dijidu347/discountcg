import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, DollarSign, Mail, Calculator, ShoppingCart, UserCog, Wrench, Bell, AlertCircle, RefreshCw, Loader2, Euro, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RevenueStats from "@/components/admin/RevenueStats";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [regeneratingFactures, setRegeneratingFactures] = useState(false);
  const [stats, setStats] = useState({
    totalGarages: 0,
    totalDemarches: 0,
    demarchesATraiter: 0,
    demarchesNonVues: 0,
    totalPaiements: 0,
    garagesAVerifier: 0
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
      .select('id, verification_requested_at, is_verified, verification_admin_viewed');

    const { data: demarches } = await supabase
      .from('demarches')
      .select('status, montant_ttc, is_draft, paye, is_free_token, admin_viewed');

    // Fetch paiements with demarche info to calculate real revenue
    const { data: paiementsWithDemarches } = await supabase
      .from('paiements')
      .select(`
        montant, 
        status,
        demarches!inner(
          paid_with_tokens, 
          is_free_token, 
          frais_dossier,
          type
        )
      `);

    // Fetch token purchases (credit purchases)
    const { data: tokenPurchases } = await supabase
      .from('token_purchases')
      .select('amount');

    // Démarches à traiter = finalisées (pas brouillon) ET (payées OU jeton gratuit) ET pas encore finalisées ET pas refusées
    const demarchesATraiter = demarches?.filter(d => 
      d.is_draft === false && (d.paye === true || d.is_free_token === true) && d.status !== 'finalise' && d.status !== 'refuse'
    ) || [];

    // Démarches non vues par l'admin
    const demarchesNonVues = demarchesATraiter.filter(d => !d.admin_viewed);

    // Garages à vérifier = verification_requested_at not null ET is_verified false ET pas encore vu par admin
    const garagesAVerifier = garages?.filter(g => 
      g.verification_requested_at && !g.is_verified && !g.verification_admin_viewed
    ) || [];

    // Calculate total revenue: 
    // - Only validated payments where demarche was NOT paid with tokens (free or purchased)
    // - For CG type: count only frais_dossier (20€), for DA/DC: count montant (5€)
    const paiementsTotal = paiementsWithDemarches?.filter(p => 
      p.status === 'valide' && 
      !p.demarches?.paid_with_tokens && 
      !p.demarches?.is_free_token
    ).reduce((sum, p) => {
      // Pour CG : compter uniquement les frais de dossier (20€)
      // Pour DA/DC : compter le montant du paiement (5€)
      if (p.demarches?.type === 'CG' || p.demarches?.type === 'CG_DA' || p.demarches?.type === 'CG_IMPORT') {
        return sum + Number(p.demarches.frais_dossier || 20);
      }
      return sum + Number(p.montant);
    }, 0) || 0;
    
    const creditsTotal = tokenPurchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalGarages: garages?.length || 0,
      totalDemarches: demarches?.length || 0,
      demarchesATraiter: demarchesATraiter.length,
      demarchesNonVues: demarchesNonVues.length,
      totalPaiements: paiementsTotal + creditsTotal,
      garagesAVerifier: garagesAVerifier.length
    });

    setLoading(false);
  };

  const handleRegenerateAllFactures = async () => {
    setRegeneratingFactures(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-all-factures', {});
      
      if (error) throw error;

      toast({
        title: "Succès",
        description: data?.message || "Toutes les factures ont été régénérées",
      });
    } catch (error: any) {
      console.error('Error regenerating factures:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de régénérer les factures",
        variant: "destructive"
      });
    } finally {
      setRegeneratingFactures(false);
    }
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

        {/* Alerte démarches à traiter */}
        {stats.demarchesNonVues > 0 && (
          <Card className="mb-6 border-2 border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                onClick={() => navigate("/admin/demarches")}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-400">
                      {stats.demarchesNonVues} nouvelle{stats.demarchesNonVues > 1 ? 's' : ''} démarche{stats.demarchesNonVues > 1 ? 's' : ''} à traiter !
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      Cliquez pour voir les démarches en attente
                    </p>
                  </div>
                </div>
                <Button className="bg-red-500 hover:bg-red-600">
                  <Bell className="h-4 w-4 mr-2" />
                  Voir maintenant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerte garages à vérifier */}
        {stats.garagesAVerifier > 0 && (
          <Card className="mb-6 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                onClick={() => navigate("/admin/manage-garages")}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Building2 className="h-8 w-8 text-orange-500" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-orange-700 dark:text-orange-400">
                      {stats.garagesAVerifier} garage{stats.garagesAVerifier > 1 ? 's' : ''} à vérifier !
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-500">
                      Cliquez pour vérifier les documents soumis
                    </p>
                  </div>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Bell className="h-4 w-4 mr-2" />
                  Vérifier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/demarches")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="flex items-center gap-2">
                À traiter
                {stats.demarchesNonVues > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    {stats.demarchesNonVues}
                  </Badge>
                )}
              </CardDescription>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl text-primary">
                {stats.demarchesATraiter}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Démarches payées/jeton
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
                Toutes démarches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Stats Section - Link to full page */}
        <Card className="mb-8 cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/admin/revenus")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle>Revenus</CardTitle>
              </div>
              <Button variant="outline" size="sm">
                Voir les statistiques détaillées →
              </Button>
            </div>
            <CardDescription>Revenu total: {stats.totalPaiements.toFixed(2)} €</CardDescription>
          </CardHeader>
        </Card>

        {/* Section Particuliers masquée - accessible via URLs directes */}

        <Separator className="my-8" />

        {/* Annonces générales */}
        <div className="mb-8">
          <AnnouncementManager />
        </div>

        <Separator className="my-8" />

        {/* Section Garages */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <CardTitle>Espace Garages</CardTitle>
            </div>
            <CardDescription>
              Gérer les démarches et les utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className={`h-24 flex flex-col items-center justify-center gap-2 relative ${stats.demarchesNonVues > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}
                onClick={() => navigate("/admin/demarches")}
              >
                {stats.demarchesNonVues > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white animate-pulse">
                    {stats.demarchesNonVues}
                  </Badge>
                )}
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
                className="h-24 flex flex-col items-center justify-center gap-2 border-blue-200 hover:border-blue-300"
                onClick={() => navigate("/admin/token-purchases")}
              >
                <Euro className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Achats jetons</span>
              </Button>
              {/* Bouton masqué - accessible via /admin/actions */}
              {/* <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/actions")}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Actions rapides</span>
              </Button> */}
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
                className="h-24 flex flex-col items-center justify-center gap-2 border-green-200 hover:border-green-300"
                onClick={() => navigate("/admin/test-email")}
              >
                <Mail className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Test Email</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-orange-200 hover:border-orange-300"
                onClick={handleRegenerateAllFactures}
                disabled={regeneratingFactures}
              >
                {regeneratingFactures ? (
                  <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
                ) : (
                  <RefreshCw className="h-6 w-6 text-orange-600" />
                )}
                <span className="text-sm font-medium">
                  {regeneratingFactures ? "Régénération..." : "Régénérer factures"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
