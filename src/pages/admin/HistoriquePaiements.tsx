import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
  rembourse: "Remboursé"
};

export default function HistoriquePaiements() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [paiements, setPaiements] = useState<any[]>([]);
  const [filteredPaiements, setFilteredPaiements] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  useEffect(() => {
    let filtered = paiements;
    
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.garages?.raison_sociale?.toLowerCase().includes(query) ||
        p.demarches?.numero_demarche?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    setFilteredPaiements(filtered);
  }, [paiements, searchQuery, statusFilter]);

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

    loadPaiements();
  };

  const loadPaiements = async () => {
    const { data, error } = await supabase
      .from('paiements')
      .select(`
        *,
        garages:garage_id (raison_sociale, email),
        demarches:demarche_id (numero_demarche, type)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading paiements:', error);
    } else {
      setPaiements(data || []);
      setFilteredPaiements(data || []);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Historique des paiements</h1>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Rechercher par garage ou n° démarche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
                <SelectItem value="refuse">Refusé</SelectItem>
                <SelectItem value="rembourse">Remboursé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPaiements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun paiement trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Garage</TableHead>
                    <TableHead>N° Démarche</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Stripe ID</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaiements.map((paiement) => (
                    <TableRow key={paiement.id}>
                      <TableCell className="font-medium">
                        {paiement.garages?.raison_sociale}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {paiement.demarches?.numero_demarche}
                      </TableCell>
                      <TableCell className="font-bold">
                        {paiement.montant.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            paiement.status === 'valide' ? 'bg-green-500' :
                            paiement.status === 'refuse' ? 'bg-red-500' :
                            paiement.status === 'rembourse' ? 'bg-blue-500' :
                            'bg-orange-500'
                          }
                        >
                          {statusLabels[paiement.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {paiement.stripe_payment_id || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(paiement.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
