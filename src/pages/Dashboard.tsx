import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, LogOut, Settings, UserCircle, Clock, CheckCircle, AlertCircle, Receipt, Gift, Coins } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const loadData = async () => {
    if (!user) return;

    // Check if user is admin
    const {
      data: roleData
    } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    setIsAdmin(!!roleData);

    // Load actions rapides
    const {
      data: actionsData
    } = await supabase.from('actions_rapides').select('*').eq('actif', true).order('ordre');
    if (actionsData) {
      setActionsRapides(actionsData);
    }
    const {
      data: garageData
    } = await supabase.from('garages').select('*').eq('user_id', user.id).maybeSingle();

    // If not admin and no garage profile, redirect to complete profile
    if (!roleData && !garageData) {
      navigate("/complete-profile");
      return;
    }
    if (garageData) {
      setGarage(garageData);
      const {
        data: demarches
      } = await supabase.from('demarches').select('*').eq('garage_id', garageData.id).eq('paye', true).order('created_at', {
        ascending: false
      });
      setStats({
        totalDemarches: demarches?.length || 0,
        enAttente: demarches?.filter(d => d.status === 'en_attente' || d.status === 'paye').length || 0,
        validees: demarches?.filter(d => d.status === 'valide' || d.status === 'finalise').length || 0
      });
      setRecentDemarches(demarches?.slice(0, 5) || []);
    }
    setLoading(false);
  };
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">DiscountCarteGrise </h1>
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
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
                  Support
                </Button>
                {isAdmin && <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Administration
                  </Button>}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {garage && <NotificationBell garageId={garage.id} />}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold mb-2">Tableau de bord</h2>
            {garage?.is_verified && <Badge className="bg-green-500 mb-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compte Vérifié
              </Badge>}
          </div>
          <p className="text-muted-foreground">Bienvenue sur votre espace professionnel</p>
        </div>

        {/* Verification Alert */}
        {garage && !garage.is_verified && !garage.verification_requested_at && (
          <Alert className="mb-8 border-2 border-primary bg-primary/10">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-bold">
              Bienvenue sur DiscountCarteGrise !
            </AlertTitle>
            <AlertDescription className="text-primary">
              Pour valider votre compte et bénéficier de tous les avantages, veuillez envoyer vos documents de vérification (KBIS, Carte d'identité, Mandat).
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 ml-0 border-primary text-primary hover:bg-primary hover:text-white"
                onClick={() => navigate("/garage-settings?tab=verification")}
              >
                Envoyer mes documents
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Free Token Alert */}
        {garage?.free_token_available && <Alert className="mb-8 border-2 border-green-500 bg-green-500/10">
            <Gift className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-green-600 font-bold">🎁 Bienvenue ! Votre première démarche est offerte</AlertTitle>
            <AlertDescription className="text-green-600">
              En tant que nouveau client, vous bénéficiez d'une Déclaration de cession ou Déclaration d'achat gratuite. 
              Cette offre est valable une seule fois.
            </AlertDescription>
          </Alert>}

        {/* Token Balance Card */}
        {garage && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde de jetons</p>
                    <p className="text-2xl font-bold">{garage.token_balance || 0} jetons</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/acheter-jetons")}
                  variant="default"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Recharger
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actionsRapides.map(action => {
            // Free token only applies to DA and DC, not CG
            const isFreeTokenEligible = garage?.free_token_available && (action.code === 'DA' || action.code === 'DC');
            const mainPrice = isFreeTokenEligible ? '0€' : `${action.prix}€`;
            const tokenPrice = `${action.prix / 5} jeton${action.prix / 5 > 1 ? 's' : ''}`;
            const cgSuffix = action.code === 'CG' ? ' + CG' : '';
            const actionColor = action.couleur.startsWith('#') ? action.couleur : '#3b82f6';
            return <Card 
              key={action.id} 
              className={`cursor-pointer hover:shadow-xl transition-all border-2 hover:scale-105 ${isFreeTokenEligible ? 'ring-2 ring-green-500' : ''}`} 
              style={{ 
                borderColor: `${actionColor}40`,
                background: `linear-gradient(to bottom right, ${actionColor}15, ${actionColor}08)`
              }}
              onClick={() => navigate(`/nouvelle-demarche?type=${action.code}`)}
            >
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${actionColor}20` }}
                      >
                        <FileText className="h-5 w-5" style={{ color: actionColor }} />
                      </div>
                      {action.titre}
                      {isFreeTokenEligible && <Badge className="bg-green-500 text-white ml-2">GRATUIT</Badge>}
                    </CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{mainPrice}</span>
                        <span className="text-sm text-muted-foreground">{cgSuffix}</span>
                      </div>
                      {!isFreeTokenEligible && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Coins className="w-3 h-3" />
                          <span>ou {tokenPrice}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>;
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Total Démarches
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
              <div className="text-3xl font-bold">{stats.enAttente}</div>
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
              <div className="text-3xl font-bold">{stats.validees}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Demarches */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dernières démarches</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/mes-demarches")}>
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDemarches.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune démarche pour le moment</p>
                <p className="text-sm mt-2">Créez votre première démarche pour commencer</p>
              </div> : <div className="space-y-4">
                {recentDemarches.map(demarche => {
              const statusConfig: Record<string, {
                label: string;
                color: string;
                icon: any;
              }> = {
                en_saisie: {
                  label: "En saisie",
                  color: "text-gray-500",
                  icon: UserCircle
                },
                en_attente: {
                  label: "En attente",
                  color: "text-orange-500",
                  icon: Clock
                },
                paye: {
                  label: "Payée",
                  color: "text-blue-500",
                  icon: CheckCircle
                },
                valide: {
                  label: "Validée",
                  color: "text-green-500",
                  icon: CheckCircle
                },
                finalise: {
                  label: "Finalisée",
                  color: "text-primary",
                  icon: CheckCircle
                }
              };
              const config = statusConfig[demarche.status] || statusConfig.en_attente;
              const StatusIcon = config.icon;
              return <div key={demarche.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/demarche/${demarche.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color.includes('blue') ? 'bg-blue-100' : config.color.includes('green') ? 'bg-green-100' : config.color.includes('orange') ? 'bg-orange-100' : 'bg-gray-100'}`}>
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="font-medium">{demarche.immatriculation}</div>
                        <div className="text-sm text-muted-foreground">
                          {demarche.type === 'CG' ? 'Carte Grise' : demarche.type === 'DA' ? 'Déclaration d\'Achat' : demarche.type === 'DC' ? 'Déclaration de Cession' : demarche.type}
                        </div>
                      </div>
                    </div>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>;
            })}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
}