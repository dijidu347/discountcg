import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalButtonProps {
  amount: number;
  onSuccess: () => void;
  onError: (error: any) => void;
}

export function PayPalButton({ amount, onSuccess, onError }: PayPalButtonProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Load PayPal script
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=EUR&enable-funding=paylater`;
    script.async = true;
    
    script.onload = () => {
      if (window.paypal) {
        window.paypal.Buttons({
          createOrder: function(data: any, actions: any) {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: amount.toFixed(2),
                  breakdown: {
                    item_total: {
                      currency_code: 'EUR',
                      value: amount.toFixed(2)
                    }
                  }
                },
                description: 'Paiement en 4x sans frais'
              }]
            });
          },
          onApprove: function(data: any, actions: any) {
            return actions.order.capture().then(function() {
              toast({
                title: "Paiement réussi",
                description: "Votre paiement en 4x a été validé"
              });
              onSuccess();
            });
          },
          onError: function(err: any) {
            console.error('PayPal error:', err);
            toast({
              title: "Erreur PayPal",
              description: "Une erreur est survenue lors du paiement",
              variant: "destructive"
            });
            onError(err);
          }
        }).render('#paypal-button-container');
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [amount, onSuccess, onError]);

  return <div id="paypal-button-container"></div>;
}
