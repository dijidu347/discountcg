import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface StripePaymentProps {
  demarcheId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  immatriculation?: string;
  paymentMode?: string;
  clientEmail?: string;
  clientPhone?: string;
}

// Composant principal - Redirige vers la page de paiement
export function StripePayment({ demarcheId, amount, onSuccess, onCancel, immatriculation, paymentMode, clientEmail, clientPhone }: StripePaymentProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirection automatique vers la page de paiement
    const searchParams = new URLSearchParams();
    if (immatriculation) searchParams.set('immat', immatriculation);
    if (paymentMode) searchParams.set('mode', paymentMode);
    if (clientEmail) searchParams.set('email', clientEmail);
    if (clientPhone) searchParams.set('phone', clientPhone);
    if (paymentMode === 'split') searchParams.set('pro_amount', amount.toString());
    const qs = searchParams.toString();
    navigate(`/paiement-demarche/${demarcheId}${qs ? '?' + qs : ''}`);
  }, [demarcheId, navigate, immatriculation, paymentMode, amount]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Redirection vers le paiement...</p>
        </div>
      </CardContent>
    </Card>
  );
}
