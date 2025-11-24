import { useEffect, useState } from "react";
import { PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone } from "lucide-react";

interface StripeWalletPaymentProps {
  amount: number;
  onSuccess: () => void;
}

export const StripeWalletPayment = ({ amount, onSuccess }: StripeWalletPaymentProps) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [showNotAvailable, setShowNotAvailable] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "FR",
      currency: "eur",
      total: {
        label: "Total",
        amount: Math.round(amount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      } else {
        setShowNotAvailable(true);
      }
    });

    pr.on("paymentmethod", async (e) => {
      e.complete("success");
      onSuccess();
    });
  }, [stripe, amount, onSuccess]);

  if (!canMakePayment && showNotAvailable) {
    return (
      <Alert className="bg-muted/50 border-muted">
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Apple Pay / Google Pay n'est pas disponible sur cet appareil ou ce navigateur.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canMakePayment) {
    return null;
  }

  return (
    <div className="w-full">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              theme: "dark",
              height: "48px",
              type: "default",
            },
          },
        }}
      />
    </div>
  );
};
