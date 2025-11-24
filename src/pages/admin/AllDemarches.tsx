import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function AllDemarches() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [demarches, setDemarches] = useState<any[]>([]);
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
      setDemarches(data);
    }

    setLoading(false);
  };

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

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Toutes les démarches</h1>
          <Table>
            <TableHeader>
              <TableRow>
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
              {demarches.map((d: any) => (
                <TableRow key={d.id}>
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
                  <TableCell><Badge>{d.status}</Badge></TableCell>
                  <TableCell>{d.montant_ttc.toFixed(2)}€</TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => navigate(`/admin/demarche/${d.id}`)}>
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
