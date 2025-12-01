import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Bell, CheckCircle, Clock, Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function AllDemarches() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [demarchesATraiter, setDemarchesATraiter] = useState<any[]>([]);
  const [demarchesEnSaisie, setDemarchesEnSaisie] = useState<any[]>([]);
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

    const { data } = await supabase
      .from('demarches')
      .select('*, garages(raison_sociale, is_verified)')
      .order('created_at', { ascending: false });

    if (data) {
      // Séparer les démarches : à traiter (payées ou jeton offert) vs en saisie
      const aTraiter = data.filter(d => d.paye === true || d.is_free_token === true);
      const enSaisie = data.filter(d => d.paye !== true && d.is_free_token !== true);
      
      setDemarchesATraiter(aTraiter);
      setDemarchesEnSaisie(enSaisie);
    }

    setLoading(false);
  };

  const handleViewDemarche = async (demarche: any) => {
    // Marquer comme vue si pas encore vue
    if (!demarche.admin_viewed && (demarche.paye || demarche.is_free_token)) {
      await supabase
        .from('demarches')
        .update({ admin_viewed: true })
        .eq('id', demarche.id);
      
      // Mettre à jour localement
      setDemarchesATraiter(prev => 
        prev.map(d => d.id === demarche.id ? { ...d, admin_viewed: true } : d)
      );
    }
    
    navigate(`/admin/demarche/${demarche.id}`);
  };

  const getStatusBadge = (demarche: any) => {
    if (demarche.is_free_token) {
      return <Badge className="bg-green-500">Jeton offert</Badge>;
    }
    if (demarche.paye) {
      return <Badge className="bg-blue-500">Payé</Badge>;
    }
    return <Badge variant="secondary">En saisie</Badge>;
  };

  const unviewedCount = demarchesATraiter.filter(d => !d.admin_viewed).length;

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        {/* Section À TRAITER - Payées ou Jeton offert */}
        <Card className="p-6 mb-8 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Démarches à traiter</h1>
            {unviewedCount > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                {unviewedCount} nouvelle{unviewedCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          {demarchesATraiter.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune démarche à traiter</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>N° Démarche</TableHead>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Garage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demarchesATraiter.map((d: any) => (
                  <TableRow 
                    key={d.id} 
                    className={!d.admin_viewed ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell>
                      {!d.admin_viewed && (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{d.numero_demarche}</TableCell>
                    <TableCell className="font-medium">{d.immatriculation}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {d.garages?.raison_sociale}
                        {d.garages?.is_verified && (
                          <Badge className="bg-green-500 text-xs">
                            Vérifié
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(d)}
                        {d.is_free_token && <Gift className="h-4 w-4 text-green-500" />}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(d.montant_ttc || 0)}€</TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => handleViewDemarche(d)}
                        className={!d.admin_viewed ? "bg-red-500 hover:bg-red-600" : ""}
                      >
                        {!d.admin_viewed ? "À traiter" : "Voir"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Section EN SAISIE - Non payées */}
        <Card className="p-6 opacity-70">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-xl font-bold text-muted-foreground">En cours de saisie (non payées)</h1>
            <Badge variant="outline">{demarchesEnSaisie.length}</Badge>
          </div>
          
          {demarchesEnSaisie.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune démarche en saisie</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Démarche</TableHead>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Garage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demarchesEnSaisie.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.numero_demarche}</TableCell>
                    <TableCell className="text-muted-foreground">{d.immatriculation}</TableCell>
                    <TableCell className="text-muted-foreground">{d.garages?.raison_sociale}</TableCell>
                    <TableCell className="text-muted-foreground">{d.type}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPrice(d.montant_ttc || 0)}€</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demarche/${d.id}`)}>
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
