import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimplePaymentButtonProps {
  amount: number;
  orderId: string;
  onPaymentSuccess: () => void;
}

export function SimplePaymentButton({ amount, orderId, onPaymentSuccess }: SimplePaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: Math.round(amount * 100),
          metadata: {
            type: 'guest_order',
            order_id: orderId,
          },
        },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Erreur lors du paiement");
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirection...
        </>
      ) : (
        'Payer par carte bancaire'
      )}
    </Button>
  );
}
