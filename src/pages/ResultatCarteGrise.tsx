import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { PriceSummary } from "@/components/simulateur/PriceSummary";
import { DetailsCollapse } from "@/components/simulateur/DetailsCollapse";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { UploadList } from "@/components/upload/UploadList";
import { calculatePrice, PriceCalculation } from "@/utils/calculatePrice";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ResultatCarteGrise() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [calculation, setCalculation] = useState<PriceCalculation | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [departement, setDepartement] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const orderIdParam = searchParams.get('orderId');
        const departementParam = searchParams.get('departement');
        const vehicleData = location.state?.vehicleData;

        if (!orderIdParam || !departementParam || !vehicleData) {
          toast({
            title: "Erreur",
            description: "Données manquantes",
            variant: "destructive",
          });
          navigate('/simulateur');
          return;
        }

        setOrderId(orderIdParam);
        setDepartement(departementParam);

        // Calculer le prix
        const calc = calculatePrice(
          departementParam,
          vehicleData.chevauxFiscaux,
          vehicleData.dateMiseEnCirculation
        );

        setCalculation(calc);

        // Calculer le TTC correct : carte grise + frais dossier + TVA sur frais dossier
        const fraisDossier = 30;
        const totalServicesHT = fraisDossier; // Pas d'options sélectionnées à ce stade
        const tva = totalServicesHT * 0.20;
        const montantTTC = calc.prixTotal + totalServicesHT + tva;

        // Mettre à jour la commande avec le prix calculé
        const { error } = await supabase
          .from('guest_orders')
          .update({
            montant_ht: calc.prixTotal, // Prix carte grise (exonéré TVA)
            montant_ttc: montantTTC, // Carte grise + frais dossier + TVA
            frais_dossier: fraisDossier,
            puiss_fisc: vehicleData.chevauxFiscaux,
            date_mec: vehicleData.dateMiseEnCirculation,
          })
          .eq('id', orderIdParam);

        if (error) throw error;

      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [searchParams, location.state, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!calculation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour au simulateur
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left side - Payment and Documents */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Payment */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  1
                </div>
                <h2 className="text-2xl font-bold">Payer votre commande</h2>
              </div>
              
              <PaymentMethods
                amount={calculation.prixTotal}
                orderId={orderId}
                onPaymentSuccess={() => setIsPaid(true)}
              />
            </div>

            {/* Step 2: Documents */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                  isPaid 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  2
                </div>
                <h2 className="text-2xl font-bold">Envoyer vos documents</h2>
              </div>
              
              <UploadList
                orderId={orderId}
                isPaid={isPaid}
              />
            </div>
          </div>

          {/* Right side - Price Summary */}
          <div className="space-y-6">
            <PriceSummary
              calculation={calculation}
              departement={departement}
            />

            <DetailsCollapse calculation={calculation} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
