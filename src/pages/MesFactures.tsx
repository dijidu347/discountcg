import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MesFactures() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [factures, setFactures] = useState<any[]>([]);
  const [garageId, setGarageId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (garageData) {
      setGarageId(garageData.id);
      await loadFactures(garageData.id);
    }
    
    setLoading(false);
  };

  const loadFactures = async (gId: string) => {
    const { data, error } = await supabase
      .from('factures')
      .select(`
        *,
        demarches (
          immatriculation,
          type,
          status
        )
      `)
      .eq('garage_id', gId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive"
      });
      return;
    }

    setFactures(data || []);
  };

  const handleDownload = (pdfUrl: string, numero: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast({
        title: "Erreur",
        description: "URL de facture non disponible",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Mes Factures</h1>
            <p className="text-muted-foreground mt-1">
              Consultez et téléchargez toutes vos factures
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Liste des factures ({factures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {factures.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Aucune facture</p>
                <p className="text-muted-foreground">
                  Vos factures apparaîtront ici une fois générées
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Immatriculation</TableHead>
                      <TableHead>Type démarche</TableHead>
                      <TableHead className="text-right">Montant HT</TableHead>
                      <TableHead className="text-right">TVA</TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factures.map((facture) => (
                      <TableRow key={facture.id}>
                        <TableCell className="font-medium">{facture.numero}</TableCell>
                        <TableCell>
                          {new Date(facture.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {facture.demarches?.immatriculation || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {facture.demarches?.type || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(facture.montant_ht).toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right">
                          {facture.tva}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(facture.montant_ttc).toFixed(2)} €
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={facture.demarches?.status === 'validee' ? 'default' : 'secondary'}
                          >
                            {facture.demarches?.status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(facture.pdf_url, facture.numero)}
                            disabled={!facture.pdf_url}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
