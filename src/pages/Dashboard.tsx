import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, LogOut, Settings, UserCircle, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [garage, setGarage] = useState<any>(null);
  const [stats, setStats] = useState({
    totalDemarches: 0,
    enAttente: 0,
    validees: 0
  });
  const [recentDemarches, setRecentDemarches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (garageData) {
      setGarage(garageData);

      const { data: demarches } = await supabase
        .from('demarches')
        .select('*')
        .eq('garage_id', garageData.id)
        .order('created_at', { ascending: false });

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Bienvenue sur AutoDocs Pro</p>
          </div>
          <div className="flex items-center gap-2">
            {garage && <NotificationBell garageId={garage.id} />}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Garage Info */}
        {garage && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Informations de l'entreprise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Adresse</p>
                  <p className="font-medium">{garage.adresse}, {garage.code_postal} {garage.ville}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardDescription>Total des démarches</CardDescription>
              <CardTitle className="text-4xl">{stats.totalDemarches}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>En attente</CardDescription>
              <CardTitle className="text-4xl text-orange-600">{stats.enAttente}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Validées</CardDescription>
              <CardTitle className="text-4xl text-green-600">{stats.validees}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate("/nouvelle-demarche")}>
              <CardHeader>
                <CardTitle className="text-lg">Déclaration d'achat</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">10€</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Certificat de cession, déclaration d'achat</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate("/nouvelle-demarche")}>
              <CardHeader>
                <CardTitle className="text-lg">Déclaration de cession</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">10€</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Certificat de cession, carte grise</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate("/nouvelle-demarche")}>
              <CardHeader>
                <CardTitle className="text-lg">Carte Grise</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">30€ + CG</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Documents complets requis</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Demarches */}
        {recentDemarches.length > 0 && (
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
              <div className="space-y-3">
                {recentDemarches.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{d.immatriculation}</p>
                      <p className="text-sm text-muted-foreground">{d.type}</p>
                    </div>
                    <Badge>{d.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
