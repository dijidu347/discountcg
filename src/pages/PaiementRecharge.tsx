import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CreditCard, Euro, Percent, LogOut, Settings, Receipt, Lock } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { redirectToSogecommerce } from "@/lib/sogecommerce";

interface CreditPack {
  id: string;
  quantity: number;
  price: number;
  description: string | null;
}

// Recharge de solde : paiement par carte sur la page hebergee Societe Generale
// (Sogecommerce), comme les demarches. Le solde est credite par le webhook
// Sogecommerce a la confirmation du paiement.
export default function PaiementRecharge() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();

  // Seul l'identifiant du pack vient de l'adresse : le prix est lu en base.
  const packId = searchParams.get("packId");
  const retourPaiement = searchParams.get("paiement");

  const [pack, setPack] = useState<CreditPack | null>(null);
  const [garage, setGarage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const creditAmount = pack?.quantity || 0;
  const price = pack?.price || 0;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!packId) {
      navigate("/acheter-jetons");
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, packId, authLoading]);

  const loadData = async () => {
    if (!user || !packId) return;

    try {
      const { data: packData, error: packError } = await supabase
        .from("token_pricing")
        .select("*")
        .eq("id", packId)
        .eq("active", true)
        .single();

      if (packError || !packData) {
        toast({
          title: "Erreur",
          description: "Pack de crédits invalide ou inactif",
          variant: "destructive",
        });
        navigate("/acheter-jetons");
        return;
      }
      setPack(packData);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleData);

      const { data: garageData, error: garageError } = await supabase
        .from("garages")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (garageError || !garageData) {
        toast({
          title: "Erreur",
          description: "Garage introuvable",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      setGarage(garageData);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initialiser le paiement",
        variant: "destructive",
      });
      navigate("/acheter-jetons");
    }
  };

  const handlePay = async () => {
    if (!packId) return;
    setIsRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-sogecommerce-token-payment", {
        body: { packId, origin: window.location.origin },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      redirectToSogecommerce(data); // quitte le site vers la page Societe Generale
    } catch (e: any) {
      console.error("Payment error:", e);
      setIsRedirecting(false);
      toast({
        title: "Erreur",
        description: e.message || "Impossible de démarrer le paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const discount = creditAmount > 0 ? Math.round(((creditAmount - price) / creditAmount) * 100) : 0;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!garage || !pack) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Paiement recharge | Discount Carte Grise</title>
      </Helmet>
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  Tableau de bord
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-demarches")}>
                  Mes démarches
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-factures")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Mes factures
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>
                  Support
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Administration
                  </Button>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {garage && <NotificationBell garageId={garage.id} />}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/acheter-jetons")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="grid lg:grid-cols-[1fr,400px] gap-6 max-w-7xl mx-auto">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Paiement par carte bancaire</CardTitle>
                <CardDescription>
                  Vous allez être redirigé vers la page de paiement sécurisée de la Société Générale.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {retourPaiement && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    {retourPaiement === "annule"
                      ? "Le paiement a été annulé. Aucun montant n'a été débité."
                      : "Le paiement n'a pas abouti. Aucun montant n'a été débité : vous pouvez réessayer."}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Visa, Mastercard, CB. Votre solde est crédité dès que la banque confirme le paiement.
                </p>
                <Button
                  onClick={handlePay}
                  disabled={isRedirecting}
                  size="lg"
                  className="w-full text-lg h-12"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Redirection vers la page de paiement…
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Payer {formatPrice(price)} € par carte
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Paiement sécurisé par la Société Générale
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Récapitulatif */}
          <div className="space-y-4">
            <Card className="border-2 border-primary/20 sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  Récapitulatif
                </CardTitle>
                <CardDescription>Recharge de solde</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Crédit ajouté</span>
                    <span className="font-medium">{creditAmount}€</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Prix normal</span>
                    <span className="font-medium line-through text-muted-foreground">{creditAmount}€</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Remise ({discount}%)
                    </span>
                    <span className="font-medium text-green-600">-{formatPrice(creditAmount - price)}€</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">À payer</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(price)}€
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    🎉 Vous économisez {formatPrice(creditAmount - price)}€ !
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <CreditCard className="w-4 h-4" />
                  <span>Paiement 100% sécurisé</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
