import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Archive, Camera, FolderOpen, Cloud, Search, Download, Zap,
  ArrowLeft, Receipt, HelpCircle, Menu, LogOut, LayoutDashboard, FileText, Settings, Loader2
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
import { useAuth } from "@/hooks/useAuth";

export default function CoffreFortSales() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isActive, isBetaAllowed, isLoading: subLoading, subscribe } = useCoffreSubscription();

  // Redirect non-beta users + already subscribed
  useEffect(() => {
    if (subLoading) return;
    if (!isBetaAllowed) { navigate("/dashboard", { replace: true }); return; }
    if (isActive) navigate("/coffre-fort", { replace: true });
  }, [subLoading, isBetaAllowed, isActive, navigate]);

  const handleSubscribe = () => {
    subscribe.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Coffre-fort factures | Discount Carte Grise</title>
      </Helmet>

      {/* Nav */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer" onClick={() => navigate("/dashboard")}>
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Tableau de bord</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-demarches")}>Mes démarches</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/mes-factures")}><Receipt className="mr-2 h-4 w-4" />Mes factures</Button>
                <Button variant="default" size="sm"><Archive className="mr-2 h-4 w-4" />Coffre-fort <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1.5">PRO</Badge></Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/support")}>Support</Button>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate("/mes-demarches"); }}>
                      <FileText className="mr-2 h-4 w-4" /> Mes démarches
                    </Button>
                    <Button variant="default" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                      <Archive className="mr-2 h-4 w-4" /> Coffre-fort
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate("/support"); }}>
                      <HelpCircle className="mr-2 h-4 w-4" /> Support
                    </Button>
                    <div className="border-t my-2" />
                    <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-primary text-white py-12 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Archive className="h-14 w-14 md:h-16 md:w-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-2xl md:text-4xl font-bold mb-3">Coffre-fort factures</h1>
          <p className="text-base md:text-lg opacity-85 mb-2 max-w-lg mx-auto font-semibold">
            Ne perdez plus JAMAIS une facture fournisseur.
          </p>
          <p className="text-sm md:text-base opacity-70 mb-6 max-w-lg mx-auto">
            Prenez-la en photo &rarr; elle est class&eacute;e automatiquement
          </p>
          <div className="mb-4">
            <span className="text-4xl md:text-5xl font-extrabold">9,99&euro;</span>
            <span className="text-lg md:text-xl opacity-70">/mois</span>
          </div>
          <div className="inline-flex items-center bg-white/15 rounded-lg px-4 py-2 text-sm mb-6">
            <Zap className="h-4 w-4 mr-1.5 flex-shrink-0" /> 1er mois offert &middot; Sans engagement
          </div>
          <div>
            <Button size="lg" variant="secondary" className="text-base font-bold px-8 h-13 w-full sm:w-auto" onClick={handleSubscribe} disabled={subscribe.isPending}>
              {subscribe.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activer mon coffre-fort
            </Button>
          </div>
          <p className="text-sm text-white/60 mt-4">Rejoint par + de 180 garages professionnels</p>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {[
            { icon: Camera, title: "Photo en 2 secondes", desc: "Prenez en photo votre facture depuis votre téléphone. C'est rangé." },
            { icon: FolderOpen, title: "Classé automatiquement", desc: "Achats véhicules, pièces, carburant, entretien, transport, frais divers." },
            { icon: Zap, title: "Stockage illimité", desc: "Aucune limite. Archivez tout." },
            { icon: Search, title: "Recherche instantanée", desc: "Retrouvez n'importe quelle facture en 2 secondes." },
            { icon: Download, title: "Export comptable en 1 clic", desc: "Sélection, par année ou tout. Envoyez directement à votre comptable." },
            { icon: Cloud, title: "Sécurisé et confidentiel", desc: "Vos documents protégés, accessibles uniquement par vous." },
          ].map((f, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5 flex items-start gap-4 sm:flex-col sm:items-center sm:text-center">
                <f.icon className="h-8 w-8 text-primary flex-shrink-0 mt-0.5 sm:mt-0 sm:mx-auto sm:mb-1" />
                <div>
                  <h3 className="font-bold mb-1 text-sm md:text-base">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div className="bg-primary py-10 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Ne perdez plus une seule facture</h2>
          <p className="text-white/80 mb-6 text-sm md:text-base">1er mois gratuit, puis 9,99 &euro;/mois. Annulable &agrave; tout moment.</p>
          <Button size="lg" variant="secondary" className="text-base font-bold px-8 h-13 w-full sm:w-auto" onClick={handleSubscribe} disabled={subscribe.isPending}>
            {subscribe.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Activer mon coffre-fort
          </Button>
        </div>
      </div>
    </div>
  );
}
