import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PaiementDemarche() {
  const { demarcheId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [demarche, setDemarche] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDemarche();
  }, [demarcheId]);

  const loadDemarche = async () => {
    try {
      const { data, error } = await supabase
        .from('demarches')
        .select('*')
        .eq('id', demarcheId)
        .single();

      if (error) throw error;
      setDemarche(data);
    } catch (error) {
      console.error('Error loading demarche:', error);
      toast.error("Erreur lors du chargement de la démarche");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          demarcheId: demarcheId,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Erreur lors du paiement");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!demarche) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Démarche non trouvée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <Link to="/mes-demarches" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à mes démarches
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Paiement de la démarche</CardTitle>
            <CardDescription>
              Démarche N° {demarche.numero_demarche}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type :</span>
                <span className="font-medium">{demarche.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Immatriculation :</span>
                <span className="font-medium">{demarche.immatriculation}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total TTC :</span>
                <span>{demarche.montant_ttc.toFixed(2)} €</span>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                'Payer maintenant'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Paiement sécurisé par Stripe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
