import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, FileText, CreditCard, Loader2, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const Services = () => {
  const [actions, setActions] = useState<Tables<"actions_rapides">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActions = async () => {
      try {
        const { data, error } = await supabase
          .from("actions_rapides")
          .select("*")
          .eq("actif", true)
          .order("ordre");
        
        if (error) throw error;
        setActions(data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des actions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, []);

  const getIconForCode = (code: string) => {
    switch (code) {
      case "DA":
        return ShoppingCart;
      case "DC":
        return FileText;
      case "CG":
      case "CG_DA":
      case "DA_DC":
      case "CG_IMPORT":
        return CreditCard;
      default:
        return FileText;
    }
  };

  const scrollToSimulator = () => {
    const element = document.getElementById("simulateur");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <section id="services" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="services" className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Nos démarches
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Toutes vos démarches d'immatriculation en quelques clics
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {actions.map((action) => {
            const Icon = getIconForCode(action.code);
            return (
              <Card 
                key={action.id} 
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border hover:border-primary/50 bg-card"
              >
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{action.titre}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description || "Service professionnel pour vos démarches"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-primary">
                      {action.prix}€ 
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {action.code.includes("CG") && "+ taxe régionale"}
                      </span>
                    </p>
                  </div>
                  <Button 
                    onClick={scrollToSimulator} 
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    Commencer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
