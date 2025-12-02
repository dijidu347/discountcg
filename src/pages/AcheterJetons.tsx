import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Euro, Loader2, Percent, LogOut, Settings, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

interface CreditPack {
  id: string;
  quantity: number;
  price: number;
  description: string;
  ordre: number;
}

export default function AcheterJetons() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarageData();
      loadCreditPacks();
      checkAdmin();
    }
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!roleData);
  };

  const loadGarageData = async () => {
    if (!user) return;

    const { data: garageData, error } = await supabase
      .from("garages")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error loading garage:", error);
      return;
    }

    setGarage(garageData);
  };

  const loadCreditPacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("token_pricing")
      .select("*")
      .eq("active", true)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Error loading credit packs:", error);
    } else {
      setCreditPacks(data || []);
    }
    setLoading(false);
  };

  const handleSelectPack = (pack: CreditPack) => {
    // Redirect to payment page with pack details
    navigate(`/paiement-recharge?amount=${pack.quantity}&price=${pack.price}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getDiscount = (creditAmount: number, price: number) => {
    const discount = ((creditAmount - price) / creditAmount) * 100;
    return Math.round(discount);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      {/* Header - Same as Dashboard */}
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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Euro className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Recharger mon compte</h1>
          </div>
          <p className="text-muted-foreground">
            Rechargez votre solde et profitez de remises exclusives
          </p>
        </div>

        {garage && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Euro className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solde actuel</p>
                    <p className="text-2xl font-bold">{formatPrice(garage.token_balance || 0)}€</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {creditPacks.map((pack) => {
            const discount = getDiscount(pack.quantity, pack.price);
            const isPopular = pack.quantity === 200;

            return (
              <Card 
                key={pack.id} 
                className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    Populaire
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    <Percent className="w-3 h-3" />
                    -{discount}%
                  </div>
                </div>
                <CardHeader className="pt-10">
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-primary" />
                    {pack.quantity}€ de crédit
                  </CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(pack.quantity)}€
                      </p>
                      <p className="text-3xl font-bold text-green-600">{formatPrice(pack.price)}€</p>
                      <p className="text-sm text-green-600 mt-1">
                        Économisez {formatPrice(pack.quantity - pack.price)}€
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleSelectPack(pack)}
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                    >
                      Recharger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
