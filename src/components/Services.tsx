import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, FileText, CreditCard, Loader2, ArrowRight, Search } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getDemarcheByCode } from "@/data/demarchesConfig";

const Services = ({ embedded = false }: { embedded?: boolean }) => {
  const [actions, setActions] = useState<Tables<"actions_rapides">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredActions = useMemo(() => {
    if (!search.trim()) return actions;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return actions.filter((a) => {
      const text = `${a.titre} ${a.description || ""} ${a.code}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return text.includes(q);
    });
  }, [actions, search]);

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

  if (loading) {
    if (embedded) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
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

  const content = (
    <>
      <h2 className={`font-bold text-foreground mb-4 ${embedded ? "text-2xl" : "text-3xl md:text-4xl text-center"}`}>
        Nos démarches
      </h2>
      <p className={`text-muted-foreground mb-4 ${embedded ? "" : "text-center max-w-xl mx-auto"}`}>
        Toutes vos démarches d'immatriculation en quelques clics
      </p>

      <div className={`relative mb-6 ${embedded ? "" : "max-w-md mx-auto"}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher une démarche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className={`grid gap-4 ${embedded ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"}`}>
          {filteredActions.map((action) => {
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
                  <Link to={`/${getDemarcheByCode(action.code)?.slug || "simulateur?type=" + action.code}`}>
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      Commencer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

      {filteredActions.length === 0 && search.trim() && (
        <p className="text-center text-muted-foreground py-8">
          Aucune démarche trouvée pour "{search}"
        </p>
      )}
    </>
  );

  if (embedded) {
    return <div id="services">{content}</div>;
  }

  return (
    <section id="services" className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        {content}
      </div>
    </section>
  );
};

export default Services;
