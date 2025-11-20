import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const RechercheSuivi = () => {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/suivi/${trackingNumber.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold">Suivre ma commande</h1>
            <p className="text-muted-foreground text-lg">
              Entrez votre numéro de suivi pour consulter l'état de votre carte grise
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recherche de commande</CardTitle>
              <CardDescription>
                Vous avez reçu votre numéro de suivi par email lors de votre commande
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="tracking" className="text-sm font-medium">
                    Numéro de suivi
                  </label>
                  <Input
                    id="tracking"
                    type="text"
                    placeholder="Ex: TRK-2025-000007"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: TRK-XXXX-XXXXXX
                  </p>
                </div>
                <Button type="submit" className="w-full" size="lg">
                  <Search className="mr-2 h-5 w-5" />
                  Rechercher ma commande
                </Button>
              </form>

              <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Vous ne trouvez pas votre numéro ?</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Vérifiez votre boîte email (et les spams) pour retrouver l'email de confirmation
                  contenant votre numéro de suivi.
                </p>
                <p className="text-sm text-muted-foreground">
                  Pour toute question, contactez-nous à{" "}
                  <a href="mailto:support@discountcg.fr" className="text-primary hover:underline">
                    support@discountcg.fr
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RechercheSuivi;
