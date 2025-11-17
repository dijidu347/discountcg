import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText } from "lucide-react";

const statusLabels: Record<string, string> = {
  en_saisie: "En saisie",
  en_attente: "En attente",
  paye: "Payé",
  valide: "Validé",
  finalise: "Finalisé",
  refuse: "Refusé"
};

const statusColors: Record<string, string> = {
  en_saisie: "bg-gray-500",
  en_attente: "bg-orange-500",
  paye: "bg-blue-500",
  valide: "bg-green-500",
  finalise: "bg-green-700",
  refuse: "bg-red-500"
};

const typeLabels: Record<string, string> = {
  DA: "Déclaration d'achat",
  DC: "Déclaration de cession",
  CG: "Carte grise",
  CG_DA: "CG + DA",
  DA_DC: "DA + DC",
  CG_IMPORT: "Import étranger"
};

export default function MesDemarches() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [garage, setGarage] = useState<any>(null);
  const [demarches, setDemarches] = useState<any[]>([]);
  const [filteredDemarches, setFilteredDemarches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  useEffect(() => {
    let filtered = demarches;
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.numero_demarche?.toLowerCase().includes(query) ||
        d.immatriculation?.toLowerCase().includes(query) ||
        typeLabels[d.type]?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(d => d.status === statusFilter);
    }
    
    setFilteredDemarches(filtered);
  }, [demarches, searchQuery, statusFilter]);

  const loadData = async () => {
    if (!user) return;

    // Load garage
    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (garageData) {
      setGarage(garageData);

      // Load demarches
      const { data: demarchesData } = await supabase
        .from('demarches')
        .select('*')
        .eq('garage_id', garageData.id)
        .order('created_at', { ascending: false });

      if (demarchesData) {
        setDemarches(demarchesData);
        setFilteredDemarches(demarchesData);
      }
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <Button onClick={() => navigate("/nouvelle-demarche")}>
            <FileText className="mr-2 h-4 w-4" />
            Nouvelle démarche
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Mes démarches</h1>
            <p className="text-muted-foreground">
              Suivez l'état de toutes vos démarches administratives
            </p>
          </div>

          {demarches.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune démarche</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore créé de démarche
              </p>
              <Button onClick={() => navigate("/nouvelle-demarche")}>
                Créer ma première démarche
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Input
                  placeholder="Rechercher par n°, immat ou type..."
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
                    <SelectItem value="en_saisie">En saisie</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="paye">Payé</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                    <SelectItem value="finalise">Finalisé</SelectItem>
                    <SelectItem value="refuse">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Démarche</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Immatriculation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Date de création</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemarches.map((demarche) => (
                    <TableRow 
                      key={demarche.id} 
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {demarche.numero_demarche}
                      </TableCell>
                      <TableCell className="font-medium">
                        {typeLabels[demarche.type]}
                      </TableCell>
                      <TableCell>{demarche.immatriculation}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[demarche.status]}>
                          {statusLabels[demarche.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{demarche.montant_ttc.toFixed(2)} €</TableCell>
                      <TableCell>
                        {demarche.facture_id ? (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Disponible
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(demarche.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => navigate(`/demarche/${demarche.id}`)}>
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
