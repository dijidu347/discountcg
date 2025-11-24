import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, LogOut, Settings, UserCircle, Clock, CheckCircle, AlertCircle, Receipt } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
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
    } = await supabase.from('garages').select('*').eq('user_id', user.id).single();
    if (garageData) {
      setGarage(garageData);
      const {
        data: demarches
      } = await supabase.from('demarches').select('*').eq('garage_id', garageData.id).order('created_at', {
        ascending: false
      });
      setStats({
        totalDemarches: demarches?.length || 0,
        enAttente: demarches?.filter(d => d.status === 'en_attente' || d.status === 'en_saisie').length || 0,
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">DIscountCG</h1>
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
            {garage?.is_verified && (
              <Badge className="bg-green-500 mb-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compte Vérifié
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Bienvenue sur votre espace professionnel</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actionsRapides.map(action => <Card key={action.id} className={`cursor-pointer hover:shadow-xl transition-all border-2 hover:border-${action.couleur} hover:scale-105 bg-gradient-to-br from-${action.couleur}/10 to-${action.couleur}/5`} onClick={() => navigate(`/nouvelle-demarche?type=${action.code}`)}>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full bg-${action.couleur}/20 flex items-center justify-center`}>
                      <FileText className={`h-5 w-5 text-${action.couleur}`} />
                    </div>
                    {action.titre}
                  </CardTitle>
                  <CardDescription className={`text-3xl font-bold text-${action.couleur} mt-2`}>
                    {action.prix}€{action.code === 'CG' && ' + CG'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                  <Button className={`w-full mt-4 bg-${action.couleur} hover:bg-${action.couleur}/90`} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <FileText className="h-3 w-3" />
                Total des démarches
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{stats.totalDemarches}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                En attente
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-warning">{stats.enAttente}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3 w-3" />
                Validées
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-success">{stats.validees}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Bottom Section: Garage Info + Recent Demarches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Garage Info */}
          {garage && <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-primary" />
                    Informations de l'entreprise
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate("/garage-settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Raison sociale</p>
                    <p className="font-medium">{garage.raison_sociale}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SIRET</p>
                    <p className="font-medium">{garage.siret}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{garage.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{garage.telephone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Adresse</p>
                    <p className="font-medium">{garage.adresse}, {garage.code_postal} {garage.ville}</p>
                  </div>
                </div>
              </CardContent>
            </Card>}

          {/* Recent Demarches */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Dernières démarches
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDemarches.length > 0 ? <div className="space-y-3">
                  {recentDemarches.map(d => <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/demarche/${d.id}`)}>
                      <div>
                        <p className="font-medium">{d.immatriculation}</p>
                        <p className="text-sm text-muted-foreground">{d.type}</p>
                      </div>
                      <Badge variant={d.status === 'valide' || d.status === 'finalise' ? 'default' : 'secondary'} className={d.status === 'valide' || d.status === 'finalise' ? 'bg-success text-success-foreground' : d.status === 'en_attente' ? 'bg-warning text-warning-foreground' : ''}>
                        {d.status}
                      </Badge>
                    </div>)}
                </div> : <p className="text-center text-muted-foreground py-8">Aucune démarche pour le moment</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}