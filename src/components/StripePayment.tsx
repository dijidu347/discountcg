import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface StripePaymentProps {
  demarcheId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

// Composant principal - Redirige vers la page de paiement
export function StripePayment({ demarcheId, amount, onSuccess, onCancel }: StripePaymentProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirection automatique vers la page de paiement
    navigate(`/paiement-demarche/${demarcheId}`);
  }, [demarcheId, navigate]);

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
