import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, CreditCard, ArrowLeft } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GuestPaymentDetailsSummary, calculateGuestOrderTTC } from "@/components/payment/GuestPaymentDetailsSummary";

const CheckoutForm = ({ order }: { order: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate total amount with correct TVA
      const totalAmount = calculateGuestOrderTTC(
        order.montant_ht || 0,
        order.frais_dossier || 30,
        order.sms_notifications
      );

      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: Math.round(totalAmount * 100),
            metadata: {
              order_id: order.id,
              tracking_number: order.tracking_number,
              type: "guest_order",
            },
          },
        }
      );

      if (paymentError) throw paymentError;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${order.prenom} ${order.nom}`,
              email: order.email,
              phone: order.telephone,
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent?.status === "succeeded") {
        // Recalculate total for storage
        const finalTTC = calculateGuestOrderTTC(
          order.montant_ht || 0,
          order.frais_dossier || 30,
          order.sms_notifications
        );
        
        // Update order
        await supabase
          .from("guest_orders")
          .update({
            paye: true,
            payment_intent_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
            status: "paye",
            montant_ttc: finalTTC,
          })
          .eq("id", order.id);

        toast({
          title: "Paiement réussi",
          description: "Votre commande a été confirmée",
        });

        navigate(`/suivi/${order.tracking_number}`);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Informations de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-background">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "hsl(var(--foreground))",
                    "::placeholder": {
                      color: "hsl(var(--muted-foreground))",
                    },
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      <GuestPaymentDetailsSummary
        prixCarteGrise={order.montant_ht || 0}
        fraisDossier={order.frais_dossier || 30}
        smsNotifications={order.sms_notifications}
        emailNotifications={order.email_notifications}
      />

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        size="lg"
        className="w-full text-lg h-14"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Payer maintenant
          </>
        )}
      </Button>
    </form>
  );
};

const PaiementGuestOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    initializeStripe();
    loadOrder();
  }, [orderId]);

  const initializeStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-key');
      
      if (error) throw error;
      
      if (data?.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    } catch (error) {
      console.error("Error loading Stripe:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le système de paiement",
        variant: "destructive",
      });
    }
  };

  const loadOrder = async () => {
    if (!orderId) {
      navigate("/");
      return;
    }

    const { data, error } = await supabase
      .from("guest_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !data) {
      toast({
        title: "Erreur",
        description: "Commande introuvable",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (data.paye) {
      toast({
        title: "Commande déjà payée",
        description: "Redirection vers le suivi",
      });
      navigate(`/suivi/${data.tracking_number}`);
      return;
    }

    if (!data.documents_complets) {
      toast({
        title: "Documents manquants",
        description: "Veuillez d'abord envoyer vos documents",
      });
      navigate(`/commander/${orderId}`);
      return;
    }

    setOrder(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) return null;

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/commander/${orderId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Paiement sécurisé</h1>
            <p className="text-xl text-muted-foreground">
              Commande {order.tracking_number}
            </p>
          </div>

          <Elements stripe={stripePromise}>
            <CheckoutForm order={order} />
          </Elements>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaiementGuestOrder;
