import { useEffect, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { UploadListSimple } from "@/components/upload/UploadListSimple";
import { GuestOrderInfoForm } from "@/components/GuestOrderInfoForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, FileText, ArrowRightLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type DemarcheType = "DA" | "DC";

interface DemarcheInfo {
  label: string;
  description: string;
  icon: React.ReactNode;
  prix: number;
}

const demarcheInfos: Record<DemarcheType, DemarcheInfo> = {
  DA: {
    label: "Déclaration d'achat",
    description: "Enregistrement de l'achat d'un véhicule",
    icon: <FileText className="w-5 h-5" />,
    prix: 10,
  },
  DC: {
    label: "Déclaration de cession",
    description: "Déclaration de la vente de votre véhicule",
    icon: <ArrowRightLeft className="w-5 h-5" />,
    prix: 10,
  },
};

export default function DemarcheSimple() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orderId, setOrderId] = useState<string>("");
  const [demarcheType, setDemarcheType] = useState<DemarcheType>("DA");
  const [plaque, setPlaque] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [isInfoCompleted, setIsInfoCompleted] = useState(false);

  const fraisHT = 10;
  const tva = fraisHT * 0.20;
  const totalTTC = fraisHT + tva;

  useEffect(() => {
    const loadData = async () => {
      try {
        const orderIdParam = searchParams.get('orderId');
        const typeParam = searchParams.get('type') as DemarcheType;
        const plaqueParam = searchParams.get('plaque');

        if (!orderIdParam || !typeParam || !plaqueParam) {
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
        setPlaque(plaqueParam);

        // Vérifier si la commande existe et son statut
        const { data: order, error } = await supabase
          .from('guest_orders')
          .select('paye, nom, prenom')
          .eq('id', orderIdParam)
          .single();

        if (error) throw error;

        if (order?.paye) {
          setIsPaid(true);
        }
        if (order?.nom && order?.prenom) {
          setIsInfoCompleted(true);
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

  const demarcheInfo = demarcheInfos[demarcheType];

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
              {demarcheInfo.icon}
              {demarcheInfo.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Immatriculation :</span>
                <p className="font-medium">{plaque}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prix TTC :</span>
                <p className="font-bold text-primary text-lg">{totalTTC.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">({fraisHT}€ HT + {tva.toFixed(2)}€ TVA)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Step 1: Paiement */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${isPaid ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                {isPaid ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <h2 className="text-2xl font-bold">Paiement</h2>
            </div>
            
            {!isPaid ? (
              <PaymentMethods
                orderId={orderId}
                amount={totalTTC}
                onPaymentSuccess={handlePaymentSuccess}
              />
            ) : (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Paiement effectué</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Step 2: Informations personnelles */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                !isPaid ? 'bg-muted text-muted-foreground' : 
                isInfoCompleted ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
              }`}>
                {isInfoCompleted ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <h2 className={`text-2xl font-bold ${!isPaid ? 'text-muted-foreground' : ''}`}>
                Informations personnelles
              </h2>
            </div>

            <GuestOrderInfoForm
              orderId={orderId}
              isPaid={isPaid}
              onComplete={handleInfoComplete}
            />
          </div>

          {/* Step 3: Documents */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                !isPaid || !isInfoCompleted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
              }`}>
                3
              </div>
              <h2 className={`text-2xl font-bold ${!isPaid || !isInfoCompleted ? 'text-muted-foreground' : ''}`}>
                Documents requis
              </h2>
            </div>

            <UploadListSimple
              orderId={orderId}
              isPaid={isPaid && isInfoCompleted}
              demarcheType={demarcheType}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
