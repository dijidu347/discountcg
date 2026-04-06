import { useEffect, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, UserPlus, LogIn } from "lucide-react";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { UploadListSimple } from "@/components/upload/UploadListSimple";
import { GuestOrderInfoForm } from "@/components/GuestOrderInfoForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, FileText, ArrowRightLeft, CheckCircle, Car, MapPin, PlusCircle, Copy, Search, PenTool, Home, ScrollText, Users, Bike, Receipt, Globe, XCircle, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { formatPrice } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

interface DemarcheTypeInfo {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  prix_base: number;
  actif: boolean;
  ordre: number;
  require_vehicle_info: boolean;
  require_carte_grise_price: boolean;
}

const getIconForCode = (code: string) => {
  switch (code) {
    case 'CG': return <Car className="w-5 h-5" />;
    case 'DA': return <FileText className="w-5 h-5" />;
    case 'DC': return <ArrowRightLeft className="w-5 h-5" />;
    case 'CHGT_ADRESSE': return <MapPin className="w-5 h-5" />;
    case 'CG_NEUF': return <PlusCircle className="w-5 h-5" />;
    case 'DUPLICATA': return <Copy className="w-5 h-5" />;
    case 'FIV': return <Search className="w-5 h-5" />;
    case 'MODIF_CG': return <PenTool className="w-5 h-5" />;
    case 'CHGT_ADRESSE_LOCATAIRE': return <Home className="w-5 h-5" />;
    case 'SUCCESSION': return <ScrollText className="w-5 h-5" />;
    case 'COTITULAIRE': return <Users className="w-5 h-5" />;
    case 'IMMAT_CYCLO_ANCIEN': return <Bike className="w-5 h-5" />;
    case 'QUITUS_FISCAL': return <Receipt className="w-5 h-5" />;
    case 'CPI_WW': return <Globe className="w-5 h-5" />;
    case 'ANNULER_CPI_WW': return <XCircle className="w-5 h-5" />;
    case 'DEMANDE_IMMAT': return <ClipboardList className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

export default function DemarcheSimple() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orderId, setOrderId] = useState<string>("");
  const [demarcheType, setDemarcheType] = useState<string>("");
  const [demarcheTypeInfo, setDemarcheTypeInfo] = useState<DemarcheTypeInfo | null>(null);
  const [plaque, setPlaque] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [isInfoCompleted, setIsInfoCompleted] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [isEmailSaved, setIsEmailSaved] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const fraisHT = demarcheTypeInfo?.prix_base || 0;
  const totalTTC = fraisHT; // Pas de TVA pour DA/DC

  useEffect(() => {
    const loadData = async () => {
      try {
        const orderIdParam = searchParams.get('orderId');
        const typeParam = searchParams.get('type');
        const plaqueParam = searchParams.get('plaque');

        if (!orderIdParam || !typeParam) {
          toast({
            title: "Erreur",
            description: "Données manquantes",
            variant: "destructive",
          });
          navigate('/simulateur');
          return;
        }

        setOrderId(orderIdParam);
        setDemarcheType(typeParam);
        setPlaque(plaqueParam || "");

        // Charger les infos du type de démarche
        const { data: typeData, error: typeError } = await supabase
          .from('guest_demarche_types')
          .select('*')
          .eq('code', typeParam)
          .single();

        if (!typeError && typeData) {
          setDemarcheTypeInfo(typeData);
        }

        // Vérifier si la commande existe et son statut
        const { data: order, error } = await supabase
          .from('guest_orders')
          .select('paye, nom, prenom, email')
          .eq('id', orderIdParam)
          .single();

        if (error) throw error;

        if (order?.paye) {
          setIsPaid(true);
        }
        if (order?.nom && order?.prenom) {
          setIsInfoCompleted(true);
        }
        if (order?.email) {
          setEmail(order.email);
          setIsEmailSaved(true);
        }

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
  }, [searchParams, navigate, toast]);

  const handleSaveEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Email invalide", description: "Veuillez saisir une adresse email valide", variant: "destructive" });
      return;
    }
    setIsSavingEmail(true);
    try {
      const { error } = await supabase
        .from('guest_orders')
        .update({ email, email_notifications: true, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      setIsEmailSaved(true);
      toast({ title: "Email enregistré", description: "Vous pouvez maintenant procéder au paiement" });

      // Notify admin
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'admin_new_guest_order',
            to: 'contact@discountcartegrise.fr',
            data: {
              client_name: email,
              client_email: email,
              client_phone: '',
              tracking_number: '',
              immatriculation: plaque,
              demarche_type: demarcheType,
              order_id: orderId,
              documents_count: 0,
            }
          }
        });
      } catch (e) { console.error('Admin notif failed:', e); }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder l'email", variant: "destructive" });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPaid(true);
    toast({
      title: "Paiement réussi",
      description: "Vous pouvez maintenant remplir vos informations et déposer vos documents.",
    });
  };

  const handleInfoComplete = () => {
    setIsInfoCompleted(true);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Helmet><meta name="robots" content="noindex" /></Helmet>
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/simulateur')}
          className="mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour au simulateur
        </Button>

        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getIconForCode(demarcheType)}
              {demarcheTypeInfo?.titre || demarcheType}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Immatriculation :</span>
                <p className="font-medium">{plaque}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prix :</span>
                <p className="font-bold text-primary text-lg">{formatPrice(totalTTC)}€</p>
              </div>
            </div>
            {demarcheTypeInfo?.description && (
              <p className="text-sm text-muted-foreground mt-4">{demarcheTypeInfo.description}</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Step 1: Email */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${isEmailSaved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                {isEmailSaved ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <h2 className="text-2xl font-bold">Votre email</h2>
            </div>

            {!isEmailSaved ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Adresse email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
                    />
                    <p className="text-sm text-muted-foreground">
                      Pour recevoir votre suivi de commande et votre facture
                    </p>
                  </div>
                  <Button onClick={handleSaveEmail} disabled={isSavingEmail || !email} size="lg" className="w-full">
                    {isSavingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Continuer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500/50 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-green-600">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-medium">{email}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIsEmailSaved(false)}>
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Step 2: Paiement */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                !isEmailSaved ? 'bg-muted text-muted-foreground' :
                isPaid ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
              }`}>
                {isPaid ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <h2 className={`text-2xl font-bold ${!isEmailSaved ? 'text-muted-foreground' : ''}`}>
                Paiement
              </h2>
            </div>

            {isEmailSaved && !isPaid && (
              <PaymentMethods
                orderId={orderId}
                amount={totalTTC}
                onPaymentSuccess={handlePaymentSuccess}
              />
            )}

            {isPaid && (
              <Card className="border-green-500/50 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">Paiement validé !</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Step 3: Informations personnelles */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                !isPaid ? 'bg-muted text-muted-foreground' :
                isInfoCompleted ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
              }`}>
                {isInfoCompleted ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <h2 className={`text-2xl font-bold ${!isPaid ? 'text-muted-foreground' : ''}`}>
                Informations personnelles
              </h2>
            </div>

            {isPaid && !isInfoCompleted && (
              <GuestOrderInfoForm
                orderId={orderId}
                onComplete={handleInfoComplete}
                isPaid={isPaid}
              />
            )}

            {isInfoCompleted && (
              <Card className="border-green-500/50 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">Informations enregistrées !</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Step 4: Documents */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                !isInfoCompleted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
              }`}>
                4
              </div>
              <h2 className={`text-2xl font-bold ${!isInfoCompleted ? 'text-muted-foreground' : ''}`}>
                Documents
              </h2>
            </div>

            {isInfoCompleted && (
              <UploadListSimple
                orderId={orderId}
                isPaid={isPaid}
                demarcheType={demarcheType}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}