import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

interface TokenPurchase {
  id: string;
  garage_id: string;
  quantity: number;
  amount: number;
  created_at: string;
  stripe_payment_id: string | null;
  garages: {
    raison_sociale: string;
    email: string;
  } | null;
  facture?: {
    id: string;
    numero: string;
    pdf_url: string | null;
  } | null;
}

export default function TokenPurchases() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<TokenPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

    loadPurchases();
  };

  const loadPurchases = async () => {
    // Load purchases with their garages
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('token_purchases')
      .select(`
        *,
        garages:garage_id (raison_sociale, email)
      `)
      .order('created_at', { ascending: false });

    if (purchasesError) {
      console.error('Error loading purchases:', purchasesError);
      setLoading(false);
      return;
    }

    // Load factures for token purchases
    const { data: factures } = await supabase
      .from('factures')
      .select('id, numero, pdf_url, token_purchase_id')
      .not('token_purchase_id', 'is', null);

    // Map factures to purchases
    const facturesMap = new Map(
      (factures || []).map(f => [f.token_purchase_id, f])
    );

    const purchasesWithFactures = (purchasesData || []).map(p => ({
      ...p,
      facture: facturesMap.get(p.id) || null
    }));

    setPurchases(purchasesWithFactures);
    setLoading(false);
  };

  const generateFacture = async (purchaseId: string) => {
    setGeneratingId(purchaseId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-token-facture', {
        body: { tokenPurchaseId: purchaseId }
      });

      if (error) throw error;

      toast({
        title: "Facture générée",
        description: `Facture ${data.facture.numero} créée avec succès`
      });

      loadPurchases();
    } catch (error: any) {
      console.error('Error generating facture:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération",
        variant: "destructive"
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const generateAllFactures = async () => {
    setGeneratingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-all-token-factures', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Génération terminée",
        description: `${data.successCount} factures générées, ${data.errorCount} erreurs`
      });

      loadPurchases();
    } catch (error: any) {
      console.error('Error generating all factures:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération",
        variant: "destructive"
      });
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleDownloadFacture = async (purchase: TokenPurchase) => {
    if (!purchase.facture?.pdf_url) return;

    setDownloadingId(purchase.id);
    try {
      // Import dynamically to avoid circular deps
      const { downloadFacture, extractPathFromUrl } = await import("@/lib/storage-utils");
      
      // Extract clean path from pdf_url
      const path = extractPathFromUrl(purchase.facture.pdf_url);
      
      console.log(`📄 TokenPurchases: Downloading facture, path="${path}"`);
      
      // Use the UNIQUE download function
      await downloadFacture(path);
      
      toast({
        title: "Facture téléchargée",
        description: `Facture ${purchase.facture.numero}`
      });
    } catch (error: any) {
      console.error('Error downloading facture:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de télécharger la facture",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const purchasesWithoutFacture = purchases.filter(p => !p.facture);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Achats de jetons | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Achats de jetons</h1>
              <p className="text-muted-foreground">
                {purchases.length} achats • {purchasesWithoutFacture.length} sans facture
              </p>
            </div>
            {purchasesWithoutFacture.length > 0 && (
              <Button
                onClick={generateAllFactures}
                disabled={generatingAll}
              >
                {generatingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Générer {purchasesWithoutFacture.length} factures
                  </>
                )}
              </Button>
            )}
          </div>

          {purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun achat de jetons</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Garage</TableHead>
                    <TableHead>Crédits</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => {
                    const bonus = purchase.quantity - purchase.amount;
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.garages?.raison_sociale || 'N/A'}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {formatPrice(purchase.quantity)}€
                        </TableCell>
                        <TableCell>
                          {formatPrice(purchase.amount)}€
                        </TableCell>
                        <TableCell>
                          {bonus > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              +{formatPrice(bonus)}€
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {purchase.facture ? (
                            <Badge className="bg-blue-500">
                              {purchase.facture.numero}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Non générée
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(purchase.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {purchase.facture ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadFacture(purchase)}
                              disabled={downloadingId === purchase.id}
                            >
                              {downloadingId === purchase.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateFacture(purchase.id)}
                              disabled={generatingId === purchase.id}
                            >
                              {generatingId === purchase.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
