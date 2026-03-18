import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Eye, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ManageAccounts() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [garages, setGarages] = useState<any[]>([]);
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [demarches, setDemarches] = useState<any[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadGarages();
  };

  const loadGarages = async () => {
    const { data, error } = await supabase
      .from('garages')
      .select(`
        *,
        subscriptions(plan_type, status, price_per_demarche, margin_percentage)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGarages(data);
    }
    setLoading(false);
  };

  const loadGarageDemarches = async (garageId: string) => {
    const { data } = await supabase
      .from('demarches')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    setDemarches(data || []);
  };

  const handleViewDetails = async (garage: any) => {
    setSelectedGarage(garage);
    await loadGarageDemarches(garage.id);
    setShowDetailsDialog(true);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Gérer les comptes | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Gestion des comptes</h1>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raison sociale</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Vérifié</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Démarches</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {garages.map((garage) => (
                <TableRow key={garage.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {garage.raison_sociale}
                      {garage.is_gold && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                  </TableCell>
                  <TableCell>{garage.email}</TableCell>
                  <TableCell>{garage.telephone}</TableCell>
                  <TableCell>{garage.siret}</TableCell>
                  <TableCell>
                    <Badge variant={garage.is_verified ? "default" : "secondary"}>
                      {garage.is_verified ? "Vérifié" : "Non vérifié"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {garage.subscriptions?.[0] ? (
                      <div>
                        <Badge>{garage.subscriptions[0].plan_type}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {garage.subscriptions[0].price_per_demarche}€/démarche
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Aucun</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Voir détails</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(garage)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du compte - {selectedGarage?.raison_sociale}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Informations du garage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">SIRET</p>
                    <p className="font-medium">{selectedGarage?.siret}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedGarage?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{selectedGarage?.telephone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="font-medium">
                      {selectedGarage?.adresse}, {selectedGarage?.code_postal} {selectedGarage?.ville}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'inscription</p>
                    <p className="font-medium">
                      {new Date(selectedGarage?.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <div className="flex gap-2">
                      {selectedGarage?.is_verified && <Badge>Vérifié</Badge>}
                      {selectedGarage?.is_gold && <Badge variant="secondary"><Crown className="h-3 w-3 mr-1" />Gold</Badge>}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Démarches ({demarches.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Démarche</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Immatriculation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Montant TTC</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demarches.map((demarche) => (
                      <TableRow key={demarche.id}>
                        <TableCell className="font-medium">{demarche.numero_demarche}</TableCell>
                        <TableCell>{demarche.type}</TableCell>
                        <TableCell>{demarche.immatriculation}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{demarche.status}</Badge>
                        </TableCell>
                        <TableCell>{demarche.montant_ttc?.toFixed(2) || '0.00'} €</TableCell>
                        <TableCell>
                          {new Date(demarche.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
