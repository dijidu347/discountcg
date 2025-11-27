import { useEffect, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PriceSummary } from "@/components/simulateur/PriceSummary";
import { DetailsCollapse } from "@/components/simulateur/DetailsCollapse";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { UploadList } from "@/components/upload/UploadList";
import { calculatePrice, PriceCalculation } from "@/utils/calculatePrice";
import { getVehicleByPlate, NormalizedVehicleData } from "@/lib/vehicle-api";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, Mail, MessageSquare, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [vehicleInfo, setVehicleInfo] = useState<NormalizedVehicleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  
  // Options de paiement
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [packNotifications, setPackNotifications] = useState(false);

  const emailPrix = 5;
  const smsPrix = 8;
  const packPrix = 10;

  const fraisDossier = 30;

  // Calcul du total TTC
  const calculateTotalTTC = () => {
    if (!calculation) return 0;
    const prixCarteGrise = calculation.prixTotal;
    let optionsPrix = 0;
    if (packNotifications) {
      optionsPrix = packPrix;
    } else {
      if (emailNotifications) optionsPrix += emailPrix;
      if (smsNotifications) optionsPrix += smsPrix;
    }
    const totalServicesHT = fraisDossier + optionsPrix;
    const tva = totalServicesHT * 0.20;
    return prixCarteGrise + totalServicesHT + tva;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const orderIdParam = searchParams.get('orderId');
        const departementParam = searchParams.get('departement');
        const plaqueParam = searchParams.get('plaque');
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

        // Récupérer les infos véhicule via l'API
        if (plaqueParam) {
          const vehicleResponse = await getVehicleByPlate(plaqueParam);
          if (vehicleResponse.success && vehicleResponse.data) {
            setVehicleInfo(vehicleResponse.data);
          }
        }

        // Calculer le prix
        const calc = calculatePrice(
          departementParam,
          vehicleData.chevauxFiscaux,
          vehicleData.dateMiseEnCirculation
        );

        setCalculation(calc);

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

  // Mettre à jour la commande quand les options changent
  useEffect(() => {
    const updateOrder = async () => {
      if (!orderId || !calculation) return;

      const prixCarteGrise = calculation.prixTotal;
      let optionsPrix = 0;
      if (packNotifications) {
        optionsPrix = packPrix;
      } else {
        if (emailNotifications) optionsPrix += emailPrix;
        if (smsNotifications) optionsPrix += smsPrix;
      }
      const totalServicesHT = fraisDossier + optionsPrix;
      const tva = totalServicesHT * 0.20;
      const montantTTC = prixCarteGrise + totalServicesHT + tva;

      // Email toujours actif (même si non coché, emails essentiels envoyés)
      // SMS seulement si payé (smsNotifications ou packNotifications)
      await supabase
        .from('guest_orders')
        .update({
          montant_ht: prixCarteGrise,
          montant_ttc: montantTTC,
          frais_dossier: fraisDossier,
          sms_notifications: smsNotifications || packNotifications,
          email_notifications: true, // Toujours actif
          marque: vehicleInfo?.marque || null,
          modele: vehicleInfo?.modele || null,
          energie: vehicleInfo?.energie || null,
          date_mec: vehicleInfo?.date_mec || null,
          puiss_fisc: calculation.chevauxFiscaux,
        })
        .eq('id', orderId);
    };

    updateOrder();
  }, [orderId, calculation, smsNotifications, emailNotifications, packNotifications, vehicleInfo, fraisDossier]);

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
          {/* Left side - Options and Payment */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Options de suivi */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  1
                </div>
                <h2 className="text-2xl font-bold">Options de suivi</h2>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Options de suivi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pack option */}
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                    packNotifications ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50'
                  }`}>
                    <Checkbox
                      id="pack_notif"
                      checked={packNotifications}
                      onCheckedChange={(checked) => {
                        setPackNotifications(checked as boolean);
                        if (checked) {
                          setEmailNotifications(false);
                          setSmsNotifications(false);
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor="pack_notif" className="cursor-pointer flex items-center gap-2 font-medium">
                        <Bell className="w-4 h-4 text-primary" />
                        Pack Suivi Complet
                        <span className="ml-auto text-primary font-semibold">+{packPrix},00 €</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Email + SMS - Économisez {emailPrix + smsPrix - packPrix}€
                      </p>
                    </div>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">ou choisissez séparément</div>

                  <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                    packNotifications ? 'opacity-50 pointer-events-none' : ''
                  } ${emailNotifications ? 'border-primary bg-primary/5' : 'bg-card hover:bg-accent/50'}`}>
                    <Checkbox
                      id="email_notif"
                      checked={emailNotifications}
                      disabled={packNotifications}
                      onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="email_notif" className="cursor-pointer flex items-center gap-2 font-medium">
                        <Mail className="w-4 h-4 text-primary" />
                        Suivi par email
                        <span className="ml-auto text-primary font-semibold">+{emailPrix},00 €</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recevez les mises à jour de votre dossier par email
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                    packNotifications ? 'opacity-50 pointer-events-none' : ''
                  } ${smsNotifications ? 'border-primary bg-primary/5' : 'bg-card hover:bg-accent/50'}`}>
                    <Checkbox
                      id="sms_notif"
                      checked={smsNotifications}
                      disabled={packNotifications}
                      onCheckedChange={(checked) => setSmsNotifications(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="sms_notif" className="cursor-pointer flex items-center gap-2 font-medium">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Suivi par SMS
                        <span className="ml-auto text-primary font-semibold">+{smsPrix},00 €</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recevez les mises à jour importantes par SMS en temps réel
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Step 2: Payment */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  2
                </div>
                <h2 className="text-2xl font-bold">Payer votre commande</h2>
              </div>
              
              <PaymentMethods
                amount={calculateTotalTTC()}
                orderId={orderId}
                onPaymentSuccess={() => setIsPaid(true)}
              />
            </div>

            {/* Step 3: Documents */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                  isPaid 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  3
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
              vehicleInfo={vehicleInfo || undefined}
              fraisDossier={fraisDossier}
              selectedOptions={{
                smsNotifications,
                emailNotifications,
                packNotifications,
              }}
            />

            <DetailsCollapse calculation={calculation} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
