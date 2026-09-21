import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, LogOut, Settings, Receipt, Coins, CreditCard } from "lucide-react";
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
  // Frais de service actuels, pour traduire un pack en nombre de démarches.
  const [prixDaDc, setPrixDaDc] = useState(5);
  const [prixCg, setPrixCg] = useState(20);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarageData();
      loadCreditPacks();
      loadPrixDemarches();
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

  const loadPrixDemarches = async () => {
    const { data } = await supabase
      .from("actions_rapides")
      .select("code, prix")
      .in("code", ["DA", "CG"]);
    (data || []).forEach((a: { code: string; prix: number }) => {
      if (a.code === "DA" && Number(a.prix) > 0) setPrixDaDc(Number(a.prix));
      if (a.code === "CG" && Number(a.prix) > 0) setPrixCg(Number(a.prix));
    });
  };

  const handleSelectPack = (pack: CreditPack) => {
    // SECURITY: Only pass pack ID, price is validated server-side
    navigate(`/paiement-recharge?packId=${pack.id}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
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
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Acheter des jetons | Discount Carte Grise</title>
      </Helmet>
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

        {/* En-tête + solde */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Recharger mon solde</h1>
            <p className="text-muted-foreground mt-1">Plus vous rechargez, plus le bonus est grand.</p>
          </div>
          {garage && (
            <div className="rounded-lg border bg-card px-4 py-2 text-right">
              <p className="text-xs text-muted-foreground">Solde actuel</p>
              <p className="text-2xl font-bold tabular-nums">{formatPrice(garage.token_balance || 0)} €</p>
            </div>
          )}
        </div>

        {/* Ce que paient les jetons, et ce qu'ils ne paient pas */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="flex gap-3 items-start">
            <Coins className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm">
              <span className="font-semibold">1 jeton = 1 €</span>
              <span className="block text-muted-foreground">Votre solde est en euros.</span>
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <Receipt className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm">
              <span className="font-semibold">Paie vos frais de service</span>
              <span className="block text-muted-foreground">
                DA et DC à {formatPrice(prixDaDc)} €, carte grise à {formatPrice(prixCg)} €…
              </span>
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm">
              <span className="font-semibold">Taxe régionale par carte</span>
              <span className="block text-muted-foreground">Reversée à l'État, jamais en jetons.</span>
            </p>
          </div>
        </div>

        {/* Packs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {creditPacks.map((pack) => {
            const isPopular = pack.price === 500;
            const bonusAmount = pack.quantity - pack.price;
            const nbDaDc = prixDaDc > 0 ? Math.floor(pack.quantity / prixDaDc) : 0;
            const nbCg = prixCg > 0 ? Math.floor(pack.quantity / prixCg) : 0;

            return (
              <Card
                key={pack.id}
                className={`relative flex flex-col ${isPopular ? "border-2 border-primary shadow-lg" : ""}`}
              >
                <CardContent className="flex flex-1 flex-col gap-3 pt-6">
                  {/* Bandeau posé sur le bord de la carte : hors du flux, il ne
                      décale pas les prix, qui restent alignés d'une carte à l'autre. */}
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Populaire · meilleur bonus
                    </span>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Vous payez</p>
                    <p className="text-3xl font-bold tabular-nums">{formatPrice(pack.price)} €</p>
                  </div>
                  <p className="text-sm">
                    Vous recevez <span className="font-semibold">{formatPrice(pack.quantity)} €</span>
                  </p>
                  {bonusAmount > 0 && (
                    <span className="self-start rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      +{formatPrice(bonusAmount)} € offerts
                    </span>
                  )}
                  {nbDaDc > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {nbDaDc} DA/DC ou {nbCg} cartes grises
                    </p>
                  )}
                  <Button
                    onClick={() => handleSelectPack(pack)}
                    className="mt-auto w-full"
                    variant={isPopular ? "default" : "outline"}
                  >
                    Recharger
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Paiement sécurisé par carte · une facture est envoyée pour chaque recharge.
        </p>
      </div>
    </div>
  );
}
