import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface PayPalButtonProps {
  amount: number;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
}

declare global {
  interface Window {
    paypal: any;
  }
}

export const PayPalButton = ({ amount, onSuccess, onError }: PayPalButtonProps) => {
  const { toast } = useToast();
  const paypalRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);

  useEffect(() => {
    const loadPayPalScript = () => {
      // Check if script already exists
      if (document.querySelector('script[src*="paypal.com/sdk"]')) {
        if (window.paypal && !buttonsRendered.current) {
          renderPayPalButtons();
        }
        return;
      }

      const script = document.createElement("script");
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&intent=authorize&components=buttons,payment-fields,funding-eligibility`;
      script.async = true;
      script.onload = () => {
        renderPayPalButtons();
      };
      script.onerror = () => {
        toast({
          title: "Erreur PayPal",
          description: "Impossible de charger PayPal",
          variant: "destructive",
        });
      };
      document.body.appendChild(script);
    };

    const renderPayPalButtons = () => {
      if (!paypalRef.current || !window.paypal || buttonsRendered.current) return;

      buttonsRendered.current = true;

      // Render PayPal button
      window.paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 45,
          },
          fundingSource: window.paypal.FUNDING.PAYPAL,
          createOrder: function (data: any, actions: any) {
            return actions.order.create({
              purchase_units: [
                {
                  amount: { 
                    value: amount.toFixed(2),
                    currency_code: "EUR"
                  },
                },
              ],
            });
          },
          onApprove: function (data: any, actions: any) {
            return actions.order.capture().then(function (details: any) {
              toast({
                title: "Paiement réussi",
                description: "Votre paiement PayPal a été effectué avec succès",
              });
              onSuccess(details);
            });
          },
          onError: function (err: any) {
            console.error("PayPal error:", err);
            toast({
              title: "Erreur PayPal",
              description: "Une erreur est survenue lors du paiement",
              variant: "destructive",
            });
            onError(err);
          },
        })
        .render(paypalRef.current);

      // Render Pay Later button if amount >= 30
      if (amount >= 30 && paypalRef.current) {
        const payLaterContainer = document.createElement("div");
        payLaterContainer.className = "mt-2";
        paypalRef.current.appendChild(payLaterContainer);

        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paylater",
              height: 45,
            },
            fundingSource: window.paypal.FUNDING.PAYLATER,
            createOrder: function (data: any, actions: any) {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: { 
                      value: amount.toFixed(2),
                      currency_code: "EUR"
                    },
                  },
                ],
              });
            },
            onApprove: function (data: any, actions: any) {
              return actions.order.capture().then(function (details: any) {
                toast({
                  title: "Paiement réussi",
                  description: "Votre paiement PayPal 4x a été effectué avec succès",
                });
                onSuccess(details);
              });
            },
            onError: function (err: any) {
              console.error("PayPal Pay Later error:", err);
              toast({
                title: "Erreur PayPal",
                description: "Une erreur est survenue lors du paiement",
                variant: "destructive",
              });
              onError(err);
            },
          })
          .render(payLaterContainer);
      }
    };

    loadPayPalScript();

    return () => {
      buttonsRendered.current = false;
    };
  }, [amount, onSuccess, onError, toast]);

  return (
    <div className="w-full">
      <div ref={paypalRef} className="w-full" />
      {amount >= 30 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Paiement en 4x disponible pour ce montant
        </p>
      )}
    </div>
  );
};
