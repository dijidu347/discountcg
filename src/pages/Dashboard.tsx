import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, LogOut, Settings, UserCircle, Clock, CheckCircle, AlertCircle, Receipt, Gift, Coins, Menu, X, HelpCircle, LayoutDashboard, Archive, Play, Sparkles, Camera, FolderOpen, Download } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { CoffreWidget } from "@/components/coffre-fort/CoffreWidget";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";

export default function Dashboard() {
  const {
    user,
    signOut,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const [garage, setGarage] = useState<any>(null);
  const [stats, setStats] = useState({
    totalDemarches: 0,
    enAttente: 0,
    validees: 0
  });
  const [recentDemarches, setRecentDemarches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionsRapides, setActionsRapides] = useState<any[]>([]);
  const [missingDocsCount, setMissingDocsCount] = useState(3);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVideoAutoPopup, setShowVideoAutoPopup] = useState(false);
  const { isActive: coffreActive, isBetaAllowed: coffreBeta } = useCoffreSubscription();
  const coffreLink = coffreActive ? "/coffre-fort" : "/coffre-fort-sales";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Full-page video coffre-fort — une seule fois par garage
  useEffect(() => {
    if (garage?.id && !coffreActive) {
      const key = `coffre_video_seen_${garage.id}`;
      if (!localStorage.getItem(key)) {
        setShowVideoAutoPopup(true);
      }
    }
  }, [garage?.id, coffreActive]);

  const handleDismissVideoPage = () => {
    setShowVideoAutoPopup(false);
    if (garage?.id) {
      localStorage.setItem(`coffre_video_seen_${garage.id}`, 'true');
    }
  };

  const loadData = async () => {
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!roleData);

    const { data: actionsData } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('actif', true)
      .order('ordre');
    if (actionsData) {
      setActionsRapides(actionsData);
    }

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData && !garageData) {
      navigate("/complete-profile");
      return;
    }

    if (garageData) {
      setGarage(garageData);
      const { data: demarches } = await supabase
        .from('demarches')
        .select('*')
        .eq('garage_id', garageData.id)
        .eq('paye', true)
        .order('created_at', { ascending: false });

      setStats({
        totalDemarches: demarches?.length || 0,
        enAttente: demarches?.filter(d => d.status === 'en_attente' || d.status === 'paye').length || 0,
        validees: demarches?.filter(d => d.status === 'valide' || d.status === 'finalise').length || 0
      });
      setRecentDemarches(demarches?.slice(0, 5) || []);

      // Count missing verification documents
      if (!garageData.is_verified) {
        const { data: verificationDocs } = await supabase
          .from('verification_documents')
          .select('document_type')
          .eq('garage_id', garageData.id)
          .in('status', ['pending', 'approved']);
        
        const uploadedTypes = new Set(verificationDocs?.map(d => d.document_type) || []);
        const requiredDocs = ['kbis', 'carte_identite', 'mandat'];
        const missing = requiredDocs.filter(doc => !uploadedTypes.has(doc)).length;
        setMissingDocsCount(missing);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
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

  // Full-page video intro — shown once per garage before dashboard
  if (showVideoAutoPopup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>Découvrez le Coffre-fort | Discount Carte Grise</title>
        </Helmet>

        {/* Top bar */}
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg">DiscountCarteGrise</span>
          </div>
          <Button
            variant="ghost"
            onClick={handleDismissVideoPage}
            className="text-white/50 hover:text-white hover:bg-white/10 text-sm"
          >
            Accéder au tableau de bord →
          </Button>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300">
              <Sparkles className="w-4 h-4" />
              Nouveau — Exclusif pour les professionnels
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Découvrez votre{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Coffre-fort Numérique
              </span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Stockez, organisez et retrouvez tous vos documents en quelques secondes
            </p>
          </div>

          {/* Video */}
          <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10 mb-10">
            <video
              src="/videos/coffre-fort-promo.mp4"
              controls
              autoPlay
              playsInline
              className="w-full"
              style={{ maxHeight: '55vh' }}
            />
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
            {[
              { icon: Camera, title: "Scan intelligent", desc: "Photographiez, le coffre-fort classe automatiquement" },
              { icon: FolderOpen, title: "6 catégories", desc: "Factures, entretiens, assurances, cartes grises, contrôles, amendes" },
              { icon: Download, title: "Export comptable", desc: "Exportez par mois ou par année en 1 clic" },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center space-y-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <Button
              onClick={() => { handleDismissVideoPage(); navigate("/coffre-fort-sales"); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-12 py-7 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:scale-105 transition-all"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              J'active mon coffre-fort — 1er mois offert
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/40">
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-400" /> 9,99€/mois</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-400" /> Sans engagement</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-400" /> Annulable à tout moment</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-400" /> +180 garages inscrits</span>
            </div>
            <Button
              variant="ghost"
              onClick={handleDismissVideoPage}
              className="text-white/40 hover:text-white hover:bg-white/10 mt-2"
            >
              Passer et accéder au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Tableau de bord | Discount Carte Grise</title>
      </Helmet>
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-2">
                <Button variant="default" size="sm">
                  Tableau de bord
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Mes démarches
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-factures")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Mes factures
                </Button>
                {coffreBeta && (
                  <Button variant="ghost" size="sm" onClick={() => navigate(coffreLink)} className="relative bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20">
                    <Archive className="mr-2 h-4 w-4" />
                    Coffre-fort
                    <Badge className="absolute -top-2 -right-3 bg-amber-500 text-white text-[9px] px-1.5 py-0 h-4 leading-4 animate-pulse">Nouveau</Badge>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
                  Support
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Administration
                  </Button>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {garage && <NotificationBell garageId={garage.id} />}
              
              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button 
                      variant="default" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); }}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Tableau de bord
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); navigate("/mes-demarches"); }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Mes démarches
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); navigate("/mes-factures"); }}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Mes factures
                    </Button>
                    {coffreBeta && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => { setMobileMenuOpen(false); navigate(coffreLink); }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Coffre-fort
                        <Badge className="ml-2 bg-amber-500 text-white text-[9px] px-1.5 py-0 h-4 leading-4">Nouveau</Badge>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => { setMobileMenuOpen(false); navigate("/support"); }}
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Support
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-primary" 
                        onClick={() => { setMobileMenuOpen(false); navigate("/admin"); }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Administration
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { setMobileMenuOpen(false); navigate("/garage-settings"); }}
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      Paramètres
                    </Button>
                    <div className="border-t my-2" />
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive" 
                      onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden md:flex">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Admin Announcements */}
        <AnnouncementBanner />

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {user?.email === 'contact@autotransfert.fr' && (
              <div className="bg-black rounded-lg p-2 shadow-sm">
                <img 
                  src="/assets/auto-transfert-logo.png" 
                  alt="Auto Transfert" 
                  className="h-14 w-auto"
                />
              </div>
            )}
            <h2 className="text-3xl font-bold mb-2">Tableau de bord</h2>
            {garage?.is_verified && (
              <Badge className="bg-green-500 mb-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compte Vérifié
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Bienvenue sur votre espace professionnel</p>
        </div>

        {/* Verification Alert */}
        {garage && !garage.is_verified && missingDocsCount > 0 && (
          <Alert className="mb-8 border-2 border-primary bg-primary/10">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-bold">
              {missingDocsCount === 3 ? "Bienvenue sur DiscountCarteGrise !" : `Il manque ${missingDocsCount} document${missingDocsCount > 1 ? 's' : ''}`}
            </AlertTitle>
            <AlertDescription className="text-primary">
              {missingDocsCount === 3 
                ? "Pour valider votre compte et bénéficier de tous les avantages, veuillez envoyer vos documents de vérification (KBIS, Carte d'identité, Mandat)."
                : `Il vous reste ${missingDocsCount} document${missingDocsCount > 1 ? 's' : ''} à envoyer pour compléter votre demande de vérification.`
              }
              <Button
                variant="outline"
                size="sm"
                className="mt-2 ml-0 border-primary text-primary hover:bg-primary hover:text-white"
                onClick={() => navigate("/garage-settings?tab=verification")}
              >
                {missingDocsCount === 3 ? "Envoyer mes documents" : "Compléter mes documents"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Free Token Alert */}
        {garage?.free_token_available && (
          <Alert className="mb-8 border-2 border-green-500 bg-green-500/10">
            <Gift className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-green-600 font-bold">
              🎁 Bienvenue ! Votre première démarche est offerte
            </AlertTitle>
            <AlertDescription className="text-green-600">
              En tant que nouveau client, vous bénéficiez d'une Déclaration de cession ou Déclaration d'achat gratuite.
              Cette offre est valable une seule fois.
            </AlertDescription>
          </Alert>
        )}

        {/* Solde Banner */}
        {garage && (
          <Card className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde disponible</p>
                    <p className="text-3xl font-bold">{garage.token_balance || 0}€</p>
                  </div>
                </div>
                <Button onClick={() => navigate("/acheter-jetons")} variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Recharger
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coffre-fort Widget — beta only */}
        {coffreBeta && (
          <div className="mb-8">
            <CoffreWidget />
          </div>
        )}

        {/* Coffre-fort Video CTA */}
        {!coffreActive && (
          <div className="mb-8">
            <Card className="relative overflow-hidden border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Coffre-fort Numérique</h3>
                    <p className="text-sm text-muted-foreground">Ne perdez plus jamais une facture. Découvrez la solution en 1 minute.</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowVideoModal(true)}
                  className="relative bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" style={{ animationDuration: '3s' }} />
                  Voir la démo
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Video Modal (CTA button) */}
        <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
            <div className="relative">
              <video
                src="/videos/coffre-fort-promo.mp4"
                controls
                autoPlay
                className="w-full"
                style={{ maxHeight: '80vh' }}
              />
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Coffre-fort Numérique — 9,99€/mois, 1er mois offert</p>
              <Button onClick={() => { setShowVideoModal(false); navigate(coffreLink); }} className="bg-blue-600 hover:bg-blue-700">
                <Sparkles className="w-4 h-4 mr-2" />
                J'active mon coffre-fort
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actionsRapides.map((action) => {
              const isFreeTokenEligible = garage?.free_token_available && (action.code === 'DA' || action.code === 'DC');
              const actionColor = action.couleur.startsWith('#') ? action.couleur : '#3b82f6';
              const priceDisplay = action.code === 'CG' ? `${action.prix}€ + CG` : `${action.prix}€`;

              return (
                <Card
                  key={action.id}
                  className={`relative overflow-hidden border-2 ${isFreeTokenEligible ? 'ring-2 ring-green-500' : ''}`}
                  style={{
                    borderColor: `${actionColor}40`,
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${actionColor}20` }}
                      >
                        <FileText className="h-5 w-5" style={{ color: actionColor }} />
                      </div>
                      {action.titre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: actionColor }}>
                        {isFreeTokenEligible ? (
                          <span className="text-green-500">Offert</span>
                        ) : (
                          priceDisplay
                        )}
                      </div>
                      {!isFreeTokenEligible && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <span>Payable avec le solde</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    <Button
                      className="w-full"
                      style={{
                        backgroundColor: actionColor,
                        borderColor: actionColor,
                      }}
                      onClick={() => navigate(`/nouvelle-demarche?type=${action.code}`)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Total des démarches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalDemarches}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.enAttente}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Validées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.validees}</div>
            </CardContent>
          </Card>
        </div>

        {/* Company Info & Recent Demarches - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Information Card */}
          {garage && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Informations de l'entreprise
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/garage-settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Raison sociale</p>
                  <p className="font-medium">{garage.raison_sociale}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SIRET</p>
                  <p className="font-medium">{garage.siret}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{garage.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{garage.telephone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{garage.adresse}, {garage.code_postal} {garage.ville}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Demarches */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Dernières démarches
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDemarches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune démarche pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDemarches.map((demarche) => {
                    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
                      en_saisie: { label: "En saisie", color: "text-gray-500", icon: UserCircle },
                      en_attente: { label: "En attente", color: "text-orange-500", icon: Clock },
                      paye: { label: "Payée", color: "text-blue-500", icon: CheckCircle },
                      valide: { label: "Validée", color: "text-green-500", icon: CheckCircle },
                      finalise: { label: "Finalisée", color: "text-primary", icon: CheckCircle }
                    };
                    const config = statusConfig[demarche.status] || statusConfig.en_attente;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={demarche.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/demarche/${demarche.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              config.color.includes('blue')
                                ? 'bg-blue-100'
                                : config.color.includes('green')
                                ? 'bg-green-100'
                                : config.color.includes('orange')
                                ? 'bg-orange-100'
                                : 'bg-gray-100'
                            }`}
                          >
                            <StatusIcon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <div className="font-medium">{demarche.immatriculation}</div>
                            <div className="text-xs text-muted-foreground">
                              {demarche.type === 'CG'
                                ? 'Carte Grise'
                                : demarche.type === 'DA'
                                ? "Déclaration d'Achat"
                                : demarche.type === 'DC'
                                ? 'Déclaration de Cession'
                                : demarche.type}
                            </div>
                          </div>
                        </div>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
