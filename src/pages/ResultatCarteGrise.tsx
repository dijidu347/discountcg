import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PriceSummary } from "@/components/simulateur/PriceSummary";
import { DetailsCollapse } from "@/components/simulateur/DetailsCollapse";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { UploadList } from "@/components/upload/UploadList";
import { GuestOrderInfoForm } from "@/components/GuestOrderInfoForm";
import { calculatePrice, PriceCalculation } from "@/utils/calculatePrice";
import { getVehicleByPlate, NormalizedVehicleData } from "@/lib/vehicle-api";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, Mail, MessageSquare, Bell, Zap, FileSearch, CheckCircle, UserPlus, LogIn } from "lucide-react";
import { ExpressOptionCard } from "@/components/ExpressOptionCard";
import { getExpressSurcharge } from "@/lib/expressOption";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ResultatCarteGrise() {
  const { user } = useAuth();
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
  const [isInfoCompleted, setIsInfoCompleted] = useState(false);
  const [demarcheType, setDemarcheType] = useState<string>("CG");
  
  // Options de suivi
  const [emailNotifications, setEmailNotifications] = useState(false);
  
  // Email obligatoire avant paiement
  const [email, setEmail] = useState("");
  const [isEmailSaved, setIsEmailSaved] = useState(false);
  const [isPriceSaved, setIsPriceSaved] = useState(false);

  // Nouvelles options
  const [express, setExpress] = useState(false);
  const [certificatNonGage, setCertificatNonGage] = useState(false);

  const emailPrix = 5;
  const certificatNonGagePrix = 10;

  const fraisDossier = 30;

  // Calcul du total TTC (pas de TVA)
  const calculateTotalTTC = () => {
    if (!calculation) return 0;
    const prixCarteGrise = calculation.prixTotal;
    let optionsPrix = 0;
    if (emailNotifications) optionsPrix += emailPrix;
    if (express) optionsPrix += getExpressSurcharge(demarcheType);
    if (certificatNonGage) optionsPrix += certificatNonGagePrix;
    
    const totalServicesHT = fraisDossier + optionsPrix;
    return prixCarteGrise + totalServicesHT;
  };

  // handleSaveEmail removed - email is now saved via GuestOrderInfoForm before payment

  useEffect(() => {
    const loadData = async () => {
      try {
        const orderIdParam = searchParams.get('orderId');
        const departementParam = searchParams.get('departement');
        const plaqueParam = searchParams.get('plaque');

        // vehicleData peut venir du state (1ère visite) ou du sessionStorage (retour depuis register/login)
        let vehicleData = location.state?.vehicleData;
        if (!vehicleData && orderIdParam) {
          const cached = sessionStorage.getItem(`vehicleData_${orderIdParam}`);
          if (cached) {
            try {
              vehicleData = JSON.parse(cached);
            } catch (e) {
              console.error('Failed to parse cached vehicleData:', e);
              sessionStorage.removeItem(`vehicleData_${orderIdParam}`);
            }
          }
        }
        // Sauvegarder dans sessionStorage pour survivre aux navigations
        if (vehicleData && orderIdParam) {
          sessionStorage.setItem(`vehicleData_${orderIdParam}`, JSON.stringify(vehicleData));
        }

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

        // Load demarche type + email + paid status from order
        const { data: orderData } = await supabase
          .from("guest_orders")
          .select("demarche_type, email, paye, express")
          .eq("id", orderIdParam)
          .single();
        if (orderData?.demarche_type) {
          setDemarcheType(orderData.demarche_type);
        }
        setExpress(orderData?.express || false);
        if (orderData?.email) {
          setEmail(orderData.email);
          setIsEmailSaved(true);
        }
        // Au retour de la page de paiement Sogecommerce, la commande est déjà
        // payée (webhook) → restaurer l'état pour afficher l'étape documents.
        if (orderData?.paye) {
          setIsPaid(true);
        }

        // Auto-fill email from connected user
        if (user?.email) {
          setEmail(user.email);
          setIsEmailSaved(true);
        }

        // Récupérer le tarif du département
        const { data: tarifData } = await supabase
          .from("department_tariffs")
          .select("tarif")
          .eq("code", departementParam)
          .single();

        if (!tarifData) {
          toast({
            title: "Erreur",
            description: "Département non trouvé",
            variant: "destructive",
          });
          navigate('/simulateur');
          return;
        }

        // Récupérer les infos véhicule via l'API
        if (plaqueParam) {
          const vehicleResponse = await getVehicleByPlate(plaqueParam);
          if (vehicleResponse.success && vehicleResponse.data) {
            setVehicleInfo(vehicleResponse.data);
          }
        }

        // Calculer le prix
        const calc = calculatePrice(
          tarifData.tarif,
          vehicleData.chevauxFiscaux,
          vehicleData.dateMiseEnCirculation,
          vehicleData.genre
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

  // Auto-populate email for logged-in users
  useEffect(() => {
    if (user?.email && !isEmailSaved) {
      setEmail(user.email);
      setIsEmailSaved(true);
    }
  }, [user, isEmailSaved]);

  // Mettre à jour la commande quand les options changent — BLOQUANT
  useEffect(() => {
    const updateOrder = async () => {
      if (!orderId || !calculation) return;

      setIsPriceSaved(false);
      const prixCarteGrise = calculation.prixTotal;
      let optionsPrix = 0;
      if (emailNotifications) optionsPrix += emailPrix;
      if (express) optionsPrix += getExpressSurcharge(demarcheType);
      if (certificatNonGage) optionsPrix += certificatNonGagePrix;

      const totalServicesHT = fraisDossier + optionsPrix;
      const montantTTC = prixCarteGrise + totalServicesHT;

      const { error } = await supabase
        .from('guest_orders')
        .update({
          montant_ht: prixCarteGrise,
          montant_ttc: montantTTC,
          frais_dossier: fraisDossier,
          sms_notifications: false,
          email_notifications: emailNotifications,
          dossier_prioritaire: false,
          express: express,
          certificat_non_gage: certificatNonGage,
          marque: vehicleInfo?.marque || null,
          modele: vehicleInfo?.modele || null,
          energie: vehicleInfo?.energie || null,
          date_mec: vehicleInfo?.date_mec || null,
          puiss_fisc: calculation.chevauxFiscaux,
        })
        .eq('id', orderId);

      if (!error) {
        setIsPriceSaved(true);
        console.log("✅ Prix sauvegardé en DB:", { montant_ht: prixCarteGrise, montant_ttc: montantTTC });
      } else {
        console.error("❌ Erreur sauvegarde prix:", error);
      }
    };

    updateOrder();
  }, [orderId, calculation, emailNotifications, express, certificatNonGage, vehicleInfo, fraisDossier]);

  // Bloquer le refresh/fermeture pendant la commande
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Ne pas avertir lors d'une redirection paiement volontaire vers Sogecommerce.
      if (!isPaid && orderId && !(window as any).__sogeRedirecting) {
        e.preventDefault();
        e.returnValue = "Votre commande est en cours. Êtes-vous sûr de vouloir quitter ?";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPaid, orderId]);

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
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Résultat carte grise | Discount Carte Grise</title>
      </Helmet>
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
            {/* Step 1: Options - masqué après paiement */}
            {!isPaid && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  1
                </div>
                <h2 className="text-2xl font-bold">Options</h2>
              </div>
              
              {/* Options supplémentaires */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Options supplémentaires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dossier Prioritaire (option express) */}
                  <ExpressOptionCard demarcheType={demarcheType} checked={express} onCheckedChange={setExpress} />

                  {/* Certificat de non-gage */}
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                    certificatNonGage ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-border bg-card hover:bg-accent/50'
                  }`}>
                    <Checkbox
                      id="certificat_non_gage"
                      checked={certificatNonGage}
                      onCheckedChange={(checked) => setCertificatNonGage(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="certificat_non_gage" className="cursor-pointer flex items-center gap-2 font-medium">
                        <FileSearch className="w-4 h-4 text-blue-500" />
                        Certificat de non-gage
                        <span className="ml-auto text-blue-500 font-semibold">+{certificatNonGagePrix},00 €</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recommandé pour vérifier qu'aucun bloquant n'empêche la vente du véhicule
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Options de suivi */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Options de suivi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                    emailNotifications ? 'border-primary bg-primary/5' : 'bg-card hover:bg-accent/50'
                  }`}>
                    <Checkbox
                      id="email_notif"
                      checked={emailNotifications}
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
                  
                  {/* SMS - Coming soon */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/50 opacity-60">
                    <Checkbox
                      id="sms_notif"
                      checked={false}
                      disabled={true}
                    />
                    <div className="flex-1">
                      <Label htmlFor="sms_notif" className="cursor-not-allowed flex items-center gap-2 font-medium text-muted-foreground">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        Suivi par SMS
                        <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">À venir</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Bientôt disponible
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
            )}

            {/* Step 2: Vos informations (AVANT paiement) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                  isInfoCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {isInfoCompleted ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <h2 className="text-2xl font-bold">Vos informations</h2>
              </div>

              <GuestOrderInfoForm
                orderId={orderId}
                isEnabled={true}
                onEmailSaved={(savedEmail) => {
                  setEmail(savedEmail);
                  setIsEmailSaved(true);
                }}
                onComplete={async () => {
                  setIsInfoCompleted(true);
                  setIsEmailSaved(true);
                }}
              />
            </div>

            {/* Step 3: Payment (seulement après infos complètes) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${!isInfoCompleted ? 'bg-muted text-muted-foreground' : isPaid ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                  {isPaid ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
                <h2 className={`text-2xl font-bold ${!isInfoCompleted ? 'text-muted-foreground' : ''}`}>Payer votre commande</h2>
              </div>

              {isInfoCompleted && isPriceSaved ? <PaymentMethods
                amount={calculateTotalTTC()}
                orderId={orderId}
                onPaymentSuccess={async () => {
                  setIsPaid(true);
                  // Send admin notification + client confirmation with full order data
                  try {
                    const { data: orderData } = await supabase
                      .from("guest_orders")
                      .select("*")
                      .eq("id", orderId)
                      .single();
                    if (orderData) {
                      const totalPaid = calculateTotalTTC();
                      // Admin notification
                      await supabase.functions.invoke('send-email', {
                        body: {
                          type: 'admin_new_guest_order',
                          to: 'contact@discountcartegrise.fr',
                          data: {
                            client_name: orderData.nom ? `${orderData.prenom} ${orderData.nom}` : 'Non renseigné',
                            client_email: orderData.email || 'Non renseigné',
                            client_phone: orderData.telephone || 'Non renseigné',
                            tracking_number: orderData.tracking_number,
                            immatriculation: orderData.immatriculation,
                            demarche_type: orderData.demarche_type || 'CG',
                            order_id: orderData.id,
                            documents_count: 0,
                            montant_ttc: totalPaid,
                            options: {
                              dossier_prioritaire: false,
                              express: express,
                              certificat_non_gage: certificatNonGage,
                              email_notifications: emailNotifications,
                            }
                          }
                        }
                      });
                      // Client confirmation email
                      if (orderData.email) {
                        await supabase.functions.invoke('send-email', {
                          body: {
                            type: 'guest_order_submitted',
                            to: orderData.email,
                            data: {
                              prenom: orderData.prenom,
                              nom: orderData.nom,
                              tracking_number: orderData.tracking_number,
                              immatriculation: orderData.immatriculation,
                            }
                          }
                        });
                      }
                    }
                  } catch (e) { console.error('Email notification failed:', e); }
                }}
              /> : (
                <Card className="opacity-50">
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center py-4">{!isInfoCompleted ? "Veuillez d'abord renseigner vos informations" : "Calcul du prix en cours..."}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Step 4: Documents (seulement après paiement) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                  isPaid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  4
                </div>
                <h2 className={`text-2xl font-bold ${!isPaid ? 'text-muted-foreground' : ''}`}>Envoyer vos documents</h2>
              </div>

              <UploadList
                orderId={orderId}
                isPaid={isPaid}
                demarcheType={demarcheType}
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
              demarcheType={demarcheType}
              selectedOptions={{
                smsNotifications: false,
                emailNotifications,
                packNotifications: false,
                dossierPrioritaire: express,
                certificatNonGage,
              }}
              isPaid={isPaid}
            />

            <DetailsCollapse calculation={calculation} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
