import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Archive, Camera, FolderOpen, Cloud, Search, Download, Zap,
  ArrowLeft, Receipt, HelpCircle, Menu, LogOut, LayoutDashboard,
  FileText, Loader2, Coins, Sparkles, CheckCircle2, Lock, Car,
  Wrench, Fuel, Settings, Truck, Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COFFRE_MONTHLY_PRICE = 9.99;

const CATEGORIES = [
  { key: "achats_vehicules", label: "Achats véhicules", icon: Car, color: "#3b82f6", desc: "Factures d'achat de véhicules" },
  { key: "pieces_accessoires", label: "Pièces & accessoires", icon: Wrench, color: "#f59e0b", desc: "Pièces, accessoires et équipements" },
  { key: "carburant", label: "Carburant", icon: Fuel, color: "#ef4444", desc: "Factures de carburant et d'énergie" },
  { key: "entretien", label: "Entretien / garage", icon: Settings, color: "#10b981", desc: "Entretien, réparations, garage" },
  { key: "transport", label: "Transport / convoyage", icon: Truck, color: "#6366f1", desc: "Transport et convoyage de véhicules" },
  { key: "frais_divers", label: "Frais divers", icon: Wallet, color: "#8b5cf6", desc: "Loyer, assurance, frais généraux..." },
];

const FEATURES = [
  { icon: Camera, title: "Photo en 2 secondes", desc: "Prenez en photo votre facture depuis votre téléphone. C'est rangé instantanément." },
  { icon: FolderOpen, title: "Classé automatiquement", desc: "6 catégories dédiées aux garages. Zéro effort de rangement." },
  { icon: Zap, title: "Stockage illimité", desc: "Archivez tous vos documents sans jamais vous soucier de l'espace." },
  { icon: Search, title: "Recherche instantanée", desc: "Retrouvez n'importe quelle facture en tapant le fournisseur ou la date." },
  { icon: Download, title: "Export comptable en 1 clic", desc: "Envoyez votre dossier comptable par sélection, année ou tout en ZIP." },
  { icon: Cloud, title: "Sécurisé & confidentiel", desc: "Chiffré, sauvegardé, accessible uniquement par vous." },
];

export default function CoffreFortSales() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isActive, isBetaAllowed, isLoading: subLoading, subscribe, subscribeWithTokens } = useCoffreSubscription();

  const { data: tokenBalance } = useQuery({
    queryKey: ["garage-token-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("garages").select("token_balance").eq("user_id", user!.id).single();
      return Number(data?.token_balance) || 0;
    },
    enabled: !!user,
  });

  const hasEnoughTokens = (tokenBalance ?? 0) >= COFFRE_MONTHLY_PRICE;

  useEffect(() => {
    if (subLoading) return;
    if (!isBetaAllowed) { navigate("/dashboard", { replace: true }); return; }
    if (isActive) navigate("/coffre-fort", { replace: true });
  }, [subLoading, isBetaAllowed, isActive, navigate]);

  return (
    <div className="min-h-screen bg-[#060e1e]">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Coffre-fort factures | Discount Carte Grise</title>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2), 0 8px 32px rgba(59,130,246,0.5); }
            50% { box-shadow: 0 0 0 8px rgba(255,255,255,0.06), 0 8px 48px rgba(59,130,246,0.8); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
          .sales-btn-glow { animation: glow-pulse 2.2s ease-in-out infinite; }
          .sales-btn-shimmer { position: relative; overflow: hidden; }
          .sales-btn-shimmer::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
            animation: shimmer 2.4s ease-in-out infinite;
          }
          .icon-float { animation: float 3s ease-in-out infinite; }
        `}</style>
      </Helmet>

      {/* Nav */}
      <div className="bg-[#060e1e]/95 backdrop-blur border-b border-white/8 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white cursor-pointer" onClick={() => navigate("/dashboard")}>
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/8" onClick={() => navigate("/dashboard")}>Tableau de bord</Button>
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/8" onClick={() => navigate("/mes-demarches")}>Mes démarches</Button>
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/8" onClick={() => navigate("/mes-factures")}>
                  <Receipt className="mr-1.5 h-3.5 w-3.5" />Mes factures
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Archive className="mr-1.5 h-3.5 w-3.5" />Coffre-fort
                  <Badge className="ml-1.5 bg-amber-400 text-amber-900 text-[9px] px-1.5 font-black">PRO</Badge>
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="text-white/70"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-[#0a1628] border-white/10">
                  <SheetHeader><SheetTitle className="text-white">Menu</SheetTitle></SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/8" onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/8" onClick={() => { setMobileMenuOpen(false); navigate("/mes-demarches"); }}>
                      <FileText className="mr-2 h-4 w-4" /> Mes démarches
                    </Button>
                    <Button className="w-full justify-start bg-blue-600" onClick={() => setMobileMenuOpen(false)}>
                      <Archive className="mr-2 h-4 w-4" /> Coffre-fort
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/8" onClick={() => { setMobileMenuOpen(false); navigate("/support"); }}>
                      <HelpCircle className="mr-2 h-4 w-4" /> Support
                    </Button>
                    <div className="border-t border-white/10 my-2" />
                    <Button variant="outline" className="w-full justify-start text-red-400 border-red-400/30 hover:bg-red-400/10" onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" className="hidden md:flex border-white/20 text-white/70 hover:text-white hover:bg-white/8 bg-transparent" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="container mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* LEFT: copy + CTA */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/25 rounded-full px-3.5 py-1.5 text-blue-300 text-xs font-semibold mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Exclusif garages professionnels
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                Ne perdez plus<br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">JAMAIS</span> une facture
              </h1>

              <p className="text-white/60 text-base md:text-lg mb-6 max-w-md mx-auto lg:mx-0">
                Photographiez votre facture fournisseur → elle est classée, stockée et exportable en 1 clic.
              </p>

              {/* Checklist */}
              <ul className="space-y-2 mb-8 max-w-sm mx-auto lg:mx-0">
                {[
                  "6 catégories dédiées aux garages auto",
                  "Export comptable ZIP en 1 clic",
                  "Recherche instantanée par fournisseur",
                  "Accessible partout, chiffré et sécurisé",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/75">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="flex items-baseline gap-2 justify-center lg:justify-start mb-5">
                <span className="text-5xl font-black text-white">9,99€</span>
                <span className="text-white/50 text-lg">/mois</span>
                <span className="inline-flex items-center bg-amber-400/20 text-amber-300 text-xs font-black px-2.5 py-1 rounded-full border border-amber-400/30 ml-1">
                  1er mois OFFERT
                </span>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <button
                  onClick={() => subscribe.mutate()}
                  disabled={subscribe.isPending || subscribeWithTokens.isPending}
                  className="sales-btn-glow sales-btn-shimmer relative inline-flex items-center gap-2.5 h-13 px-7 rounded-xl bg-white text-[#0f1e3c] font-black text-base transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ height: 52 }}
                >
                  <span className="relative z-10 flex items-center gap-2.5">
                    {subscribe.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4 text-blue-600" />
                    }
                    Activer mon coffre-fort
                  </span>
                </button>

                {hasEnoughTokens && (
                  <button
                    onClick={() => subscribeWithTokens.mutate()}
                    disabled={subscribe.isPending || subscribeWithTokens.isPending}
                    className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/8 text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {subscribeWithTokens.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Coins className="h-4 w-4 text-amber-400" />
                    }
                    Payer avec mes jetons ({(tokenBalance ?? 0).toFixed(2)}€)
                  </button>
                )}
              </div>

              {!hasEnoughTokens && tokenBalance !== undefined && (
                <p className="text-white/35 text-xs mt-3 text-center lg:text-left">
                  Solde jetons : <span className="text-white/60">{(tokenBalance ?? 0).toFixed(2)}€</span>
                  {" · "}
                  <button className="underline underline-offset-2 hover:text-white/60 transition-colors" onClick={() => navigate("/acheter-jetons")}>
                    Recharger →
                  </button>
                </p>
              )}

              <p className="text-white/25 text-xs mt-4 text-center lg:text-left">
                Sans engagement · Annulable à tout moment · + de 180 garages inscrits
              </p>
            </div>

            {/* RIGHT: category cards preview */}
            <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0">
              <div className="relative rounded-2xl overflow-hidden border border-white/10"
                style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d1e38 100%)" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                      <Archive className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-white/80">Mon coffre-fort</span>
                    <span className="text-[10px] text-white/30 bg-white/8 px-1.5 py-0.5 rounded-full">24 docs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/60" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                  </div>
                </div>

                {/* Category cards grid */}
                <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-white/6">
                  {CATEGORIES.map((cat, i) => {
                    const CatIcon = cat.icon;
                    const fakeCounts = [8, 5, 4, 3, 2, 2];
                    const fakeAmounts = [2400, 860, 320, 450, 180, 290];
                    return (
                      <div key={cat.key}
                        className="p-3 relative hover:bg-white/4 transition-colors"
                        style={{ background: i === 0 ? `${cat.color}06` : undefined }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${cat.color}20` }}>
                            <CatIcon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                          </div>
                          <span className="text-[11px] font-bold text-white/80 leading-tight">{cat.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black" style={{ color: cat.color }}>
                            {fakeCounts[i]} docs
                          </span>
                          <span className="text-[10px] text-white/40">{fakeAmounts[i].toLocaleString("fr-FR")} €</span>
                        </div>
                        {/* Mini bar */}
                        <div className="mt-1.5 h-1 rounded-full w-full bg-white/8">
                          <div className="h-1 rounded-full transition-all" style={{ backgroundColor: cat.color, width: `${(fakeCounts[i] / 8) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Lock overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16 flex flex-col items-center justify-end pb-3"
                  style={{ background: "linear-gradient(to top, #060e1e 30%, transparent)" }}>
                  <div className="flex items-center gap-1.5 text-white/40 text-[11px]">
                    <Lock className="h-3 w-3" /> Accessible avec votre abonnement
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <div className="border-t border-white/8">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-xl md:text-2xl font-black text-white text-center mb-2">Tout ce dont votre garage a besoin</h2>
          <p className="text-white/40 text-sm text-center mb-10">Conçu spécifiquement pour les professionnels de l'automobile</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/8 p-5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3">
                  <f.icon className="h-4.5 w-4.5 text-blue-400" style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{f.title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA BOTTOM ──────────────────────────────────────────────────── */}
      <div className="border-t border-white/8 py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-blue-500/15 rounded-full blur-[80px]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="icon-float inline-flex w-14 h-14 rounded-2xl bg-blue-500/20 items-center justify-center mb-5">
            <Archive className="h-7 w-7 text-blue-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Prêt à ne plus perdre aucune facture ?</h2>
          <p className="text-white/45 mb-8 text-sm">1er mois gratuit · Sans CB requise pendant le trial · Annulable à tout moment</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => subscribe.mutate()}
              disabled={subscribe.isPending || subscribeWithTokens.isPending}
              className="sales-btn-glow sales-btn-shimmer relative inline-flex items-center gap-2.5 px-8 rounded-xl bg-white text-[#0f1e3c] font-black text-base transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ height: 52 }}
            >
              <span className="relative z-10 flex items-center gap-2.5">
                {subscribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-blue-600" />}
                Activer mon coffre-fort — 1er mois OFFERT
              </span>
            </button>
            {hasEnoughTokens && (
              <button
                onClick={() => subscribeWithTokens.mutate()}
                disabled={subscribe.isPending || subscribeWithTokens.isPending}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/8 text-sm font-semibold transition-colors"
              >
                <Coins className="h-4 w-4 text-amber-400" />
                Payer avec mes jetons
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
