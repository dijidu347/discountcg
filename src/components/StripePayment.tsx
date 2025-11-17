import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface StripePaymentProps {
  demarcheId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePayment({ demarcheId, amount, onSuccess, onCancel }: StripePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"full" | "installments">("full");
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Call edge function to create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { demarcheId, paymentType }
      });

      if (error) throw error;

      // In a real implementation, you would redirect to Stripe Checkout
      // or use Stripe Elements to collect payment
      
      // For now, we'll simulate success
      toast({
        title: "Redirection vers le paiement",
        description: "Vous allez être redirigé vers Stripe..."
      });

      // Simulate payment success after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiement sécurisé</CardTitle>
        <CardDescription>Choisissez votre mode de paiement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as "full" | "installments")}>
          <div className="flex items-center space-x-2 border rounded-lg p-4">
            <RadioGroupItem value="full" id="full" />
            <Label htmlFor="full" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Paiement en une fois</p>
                <p className="text-sm text-muted-foreground">
                  {amount.toFixed(2)} € - Paiement par carte bancaire via Stripe
                </p>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 border rounded-lg p-4">
            <RadioGroupItem value="installments" id="installments" />
            <Label htmlFor="installments" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Paiement en 4x sans frais</p>
                <p className="text-sm text-muted-foreground">
                  4 x {(amount / 4).toFixed(2)} € - Via PayPal
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handlePayment} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              `Payer ${amount.toFixed(2)} €`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
