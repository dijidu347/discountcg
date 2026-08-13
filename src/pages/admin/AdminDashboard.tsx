import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { applyATraiterFilters } from "@/lib/demarcheFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, DollarSign, Mail, Calculator, ShoppingCart, UserCog, Wrench, Bell, AlertCircle, Euro, ClipboardList, Clock, Archive, CreditCard, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RevenueStats from "@/components/admin/RevenueStats";
import AnnouncementManager from "@/components/admin/AnnouncementManager";

// Fenêtre glissante utilisée par la carte Revenus et la carte Démarches 30J.
const REVENUE_PERIOD_DAYS = 30;

// Borne basse "depuis toujours" : antérieure à la première démarche en base.
const ALL_TIME_START = "2024-01-01T00:00:00.000Z";

const PARIS_TZ = "Europe/Paris";

// Agrégats renvoyés par la RPC public.get_admin_revenue_totals(p_start, p_end).
// La fonction agrège côté base : aucune ligne de paiement ni de démarche n'est
// transférée, donc le plafond PostgREST de 1000 lignes ne peut plus tronquer les
// totaux (c'est ce qui faisait afficher 19 120 € au lieu de 28 695 €).
// types.ts est généré depuis la base et ne connaît pas cette fonction, d'où le
// cast à l'appel — même approche que get_public_garage_count dans Login.tsx.
interface RevenueTotalsRow {
  total_service_fees: number | null;
  total_token_revenue: number | null;
  total_revenue: number | null;
  total_demarches: number | null;
}

// Décalage d'un fuseau à un instant donné (gère l'heure d'été).
function tzOffsetMs(timeZone: string, at: Date): number {
  const asTz = new Date(at.toLocaleString("en-US", { timeZone }));
  const asUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return asTz.getTime() - asUtc.getTime();
}

// Minuit du jour courant À PARIS, exprimé en instant absolu (ISO UTC).
// Sans cette conversion, une journée calée sur UTC ferait basculer du mauvais
// jour toutes les démarches créées entre minuit et 1h/2h du matin.
function startOfTodayParisISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Minuit parisien lu naïvement comme s'il était UTC, puis corrigé du décalage
  // réel du fuseau à cet instant (+1 en hiver, +2 en été).
  const naif = new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
  return new Date(naif.getTime() - tzOffsetMs(PARIS_TZ, naif)).toISOString();
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalGarages: 0,
    totalDemarches: 0,
    demarchesATraiter: 0,
    demarchesNonVues: 0,
    totalPaiements: 0,
    revenuDemarches: 0,
    revenuCredits: 0,
    revenuPeriode: 0,
    garagesAVerifier: 0,
    demarches30j: 0,
    demarchesAujourdhui: 0,
    demarchesAttenteClient: 0,
    coffreAbonnes: 0,
    coffrePaying: 0,
    coffreStripe: 0,
    coffreTokens: 0,
    coffreBeta: 0,
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

    // "À traiter" : count SQL exact, filtres appliqués CÔTÉ BASE via la source
    // unique de vérité partagée avec la page liste. Aucune ligne transférée,
    // donc aucun échantillonnage/troncature à 1000 lignes.
    const { count: demarchesATraiterCount } = await applyATraiterFilters(
      supabase.from('demarches').select('*', { count: 'exact', head: true }),
    );

    // "À traiter" ET jamais vues par l'admin ("nouvelles") : même count SQL exact,
    // + admin_viewed IS NOT TRUE (couvre false ET null, comme le prédicat JS
    // `!admin_viewed`). Aucune troncature à 1000 lignes.
    const { count: demarchesNonVuesCount } = await applyATraiterFilters(
      supabase.from('demarches').select('*', { count: 'exact', head: true }),
    ).not('admin_viewed', 'is', true);

    // Démarches en attente de paiement client : count SQL exact (head), donc
    // insensible au plafond de 1000 lignes. Ce compteur venait auparavant d'un
    // filtre JS sur un `select` tronqué : la bannière pouvait rester masquée
    // alors que des dossiers attendaient.
    const { count: demarchesAttenteClientCount } = await supabase
      .from('demarches')
      .select('*', { count: 'exact', head: true })
      .eq('is_draft', false)
      .eq('status', 'en_attente_paiement_client');

    // Revenus et volumes : trois appels à la RPC d'agrégation, sur trois
    // fenêtres. Remplace le calcul JS qui rapatriait toutes les lignes de
    // `paiements` et `token_purchases` pour les sommer côté client — sans
    // `.range()`, PostgREST plafonnait ces requêtes à 1000 lignes et le total
    // était calculé sur un échantillon tronqué.
    // Les trois fenêtres passent par la MÊME fonction : les chiffres affichés
    // côte à côte (30 jours vs aujourd'hui) partagent donc exactement le même
    // périmètre de calcul, ce qu'un count maison ne garantirait pas.
    const nowISO = new Date().toISOString();
    const periodStartISO = new Date(
      Date.now() - REVENUE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const todayStartISO = startOfTodayParisISO();

    const callRevenueTotals = async (
      startISO: string,
      endISO: string,
    ): Promise<RevenueTotalsRow | null> => {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .rpc('get_admin_revenue_totals' as any, { p_start: startISO, p_end: endISO });

      if (error) {
        console.error('get_admin_revenue_totals', { startISO, endISO }, error);
        return null;
      }
      // La RPC renvoie une TABLE (tableau) ; on tolère aussi un enregistrement
      // simple si la fonction venait à être redéfinie en RETURNS record.
      const row = Array.isArray(data) ? data[0] : data;
      return (row as RevenueTotalsRow | undefined) ?? null;
    };

    const [totauxGlobaux, totaux30j, totauxAujourdhui] = await Promise.all([
      callRevenueTotals(ALL_TIME_START, nowISO),
      callRevenueTotals(periodStartISO, nowISO),
      callRevenueTotals(todayStartISO, nowISO),
    ]);

    if (!totauxGlobaux || !totaux30j || !totauxAujourdhui) {
      toast({
        title: "Statistiques indisponibles",
        description: "Les revenus et volumes de démarches n'ont pas pu être calculés.",
        variant: "destructive",
      });
    }

    // Fetch coffre-fort subscriptions
    const { data: coffreSubs } = await supabase
      .from('coffre_subscriptions')
      .select('status, payment_mode')
      .in('status', ['active', 'trialing']);

    // Garages à vérifier = verification_requested_at not null ET is_verified false ET pas encore vu par admin
    const garagesAVerifier = garages?.filter(g => 
      g.verification_requested_at && !g.is_verified && !g.verification_admin_viewed
    ) || [];

    const coffreActive = coffreSubs || [];
    setStats({
      totalGarages: garages?.length || 0,
      totalDemarches: Number(totauxGlobaux?.total_demarches ?? 0),
      demarchesATraiter: demarchesATraiterCount || 0,
      demarchesNonVues: demarchesNonVuesCount || 0,
      totalPaiements: Number(totauxGlobaux?.total_revenue ?? 0),
      revenuDemarches: Number(totauxGlobaux?.total_service_fees ?? 0),
      revenuCredits: Number(totauxGlobaux?.total_token_revenue ?? 0),
      revenuPeriode: Number(totaux30j?.total_revenue ?? 0),
      garagesAVerifier: garagesAVerifier.length,
      demarches30j: Number(totaux30j?.total_demarches ?? 0),
      demarchesAujourdhui: Number(totauxAujourdhui?.total_demarches ?? 0),
      demarchesAttenteClient: demarchesAttenteClientCount || 0,
      coffreAbonnes: coffreActive.length,
      coffrePaying: coffreActive.filter(s => s.status === 'active' && s.payment_mode !== 'beta').length,
      coffreStripe: coffreActive.filter(s => s.payment_mode === 'stripe').length,
      coffreTokens: coffreActive.filter(s => s.payment_mode === 'tokens').length,
      coffreBeta: coffreActive.filter(s => s.payment_mode === 'beta').length,
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
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin tableau de bord | Discount Carte Grise</title>
      </Helmet>
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

        {/* Alerte attente paiement client */}
        {stats.demarchesAttenteClient > 0 && (
          <Card className="mb-6 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                onClick={() => navigate("/admin/demarches")}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-bold text-amber-700 dark:text-amber-400">
                      {stats.demarchesAttenteClient} démarche{stats.demarchesAttenteClient > 1 ? 's' : ''} en attente de paiement client
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      Le client n'a pas encore payé sa part
                    </p>
                  </div>
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600">Voir</Button>
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
              <CardDescription>Démarches 30J</CardDescription>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl">{stats.demarches30j}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.demarchesAujourdhui} aujourd'hui
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
            <CardDescription>
              <span className="block text-base font-semibold text-foreground">
                Revenu total : {stats.totalPaiements.toFixed(2)} €
              </span>
              <span className="block">
                {REVENUE_PERIOD_DAYS} derniers jours : {stats.revenuPeriode.toFixed(2)} €
              </span>
              <span className="block text-xs mt-1">
                Dont démarches {stats.revenuDemarches.toFixed(2)} € · jetons {stats.revenuCredits.toFixed(2)} €
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Section Particuliers */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <CardTitle>Espace Particuliers</CardTitle>
            </div>
            <CardDescription>
              Gérer les commandes et la configuration pour les particuliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/pricing-config")}
              >
                <Calculator className="h-6 w-6" />
                <span className="text-sm font-medium">Simulateur Particulier</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/guest-orders")}
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-sm font-medium">Commandes Particuliers</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/guest-actions")}
              >
                <ClipboardList className="h-6 w-6" />
                <span className="text-sm font-medium">Actions rapides Particuliers</span>
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate("/admin/actions")}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Prix démarches Pro</span>
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
                className="h-24 flex flex-col items-center justify-center gap-2 border-green-200 hover:border-green-300"
                onClick={() => navigate("/admin/test-email")}
              >
                <Mail className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Test Email</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
