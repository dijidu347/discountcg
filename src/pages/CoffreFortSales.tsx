import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Archive, Camera, FolderOpen, Cloud, Search, Download, Zap,
  Receipt, HelpCircle, Menu, LogOut, LayoutDashboard,
  FileText, Loader2, Coins, Sparkles, CheckCircle2, Lock, Car,
  Wrench, Fuel, Settings, Truck, Wallet, Play,
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
  { icon: Camera, title: "Photo en 2 secondes", desc: "Prenez en photo votre facture depuis votre téléphone. C'est rangé instantanément.", color: "#3b82f6" },
  { icon: FolderOpen, title: "6 catégories dédiées", desc: "Classez vos factures par type : véhicules, pièces, carburant, entretien...", color: "#f59e0b" },
  { icon: Zap, title: "Stockage illimité", desc: "Archivez tous vos documents sans jamais vous soucier de l'espace.", color: "#ef4444" },
  { icon: Search, title: "Recherche instantanée", desc: "Retrouvez n'importe quelle facture en tapant le fournisseur ou la date.", color: "#10b981" },
  { icon: Download, title: "Export comptable en 1 clic", desc: "Envoyez votre dossier comptable par sélection, année ou tout en ZIP.", color: "#6366f1" },
  { icon: Cloud, title: "Sécurisé & confidentiel", desc: "Chiffré, sauvegardé, accessible uniquement par vous.", color: "#8b5cf6" },
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
    <div className="min-h-screen bg-white">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Coffre-fort factures | Discount Carte Grise</title>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 4px 24px rgba(59,130,246,0.35); }
            50% { box-shadow: 0 4px 48px rgba(59,130,246,0.65), 0 0 0 6px rgba(59,130,246,0.12); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          .sales-btn-glow { animation: glow-pulse 2.2s ease-in-out infinite; }
          .sales-btn-shimmer { position: relative; overflow: hidden; }
          .sales-btn-shimmer::after {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
            animation: shimmer 2.4s ease-in-out infinite;
          }
          .icon-float { animation: float 3s ease-in-out infinite; }
        `}</style>
      </Helmet>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate("/dashboard")}>
                DiscountCarteGrise
              </h1>
              <nav className="hidden md:flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => navigate("/dashboard")}>Tableau de bord</Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => navigate("/mes-demarches")}>Mes démarches</Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => navigate("/mes-factures")}>
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
                    <Button className="w-full justify-start bg-blue-600" onClick={() => setMobileMenuOpen(false)}>
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

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-gray-100">
        <div className="container mx-auto px-4 pt-12 pb-14 md:pt-16 md:pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* LEFT */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Exclusif garages professionnels
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
                Ne perdez plus<br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">JAMAIS</span> une facture
              </h1>

              <p className="text-gray-500 text-base md:text-lg mb-6 max-w-md mx-auto lg:mx-0">
                Importez une facture, un scan ou une photo depuis votre téléphone ou votre ordinateur.
              </p>

              <ul className="space-y-2.5 mb-8 max-w-sm mx-auto lg:mx-0">
                {[
                  "6 catégories dédiées aux garages auto",
                  "Export comptable ZIP en 1 clic",
                  "Recherche instantanée par fournisseur",
                  "Accessible partout, chiffré et sécurisé",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="flex items-baseline gap-2 justify-center lg:justify-start mb-6">
                <span className="text-5xl font-black text-gray-900">9,99€</span>
                <span className="text-gray-400 text-lg">/mois</span>
                <span className="inline-flex items-center bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-1 rounded-full border border-amber-200 ml-1">
                  1er mois OFFERT
                </span>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <button
                  onClick={() => subscribe.mutate()}
                  disabled={subscribe.isPending || subscribeWithTokens.isPending}
                  className="sales-btn-glow sales-btn-shimmer relative inline-flex items-center gap-2.5 px-7 rounded-xl bg-blue-600 text-white font-black text-base transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ height: 52 }}
                >
                  <span className="relative z-10 flex items-center gap-2.5">
                    {subscribe.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Sparkles className="h-4 w-4" />
                    }
                    Activer mon coffre-fort
                  </span>
                </button>

                {hasEnoughTokens && (
                  <button
                    onClick={() => subscribeWithTokens.mutate()}
                    disabled={subscribe.isPending || subscribeWithTokens.isPending}
                    className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {subscribeWithTokens.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Coins className="h-4 w-4 text-amber-500" />
                    }
                    Payer avec mes jetons
                  </button>
                )}
              </div>

              {!hasEnoughTokens && tokenBalance !== undefined && (
                <p className="text-gray-400 text-xs mt-3 text-center lg:text-left">
                  Solde jetons : <span className="text-gray-600">{(tokenBalance ?? 0).toFixed(2)}€</span>
                  {" · "}
                  <button className="underline underline-offset-2 hover:text-gray-900 transition-colors" onClick={() => navigate("/acheter-jetons")}>
                    Recharger →
                  </button>
                </p>
              )}

              <p className="text-gray-400 text-xs mt-4 text-center lg:text-left">
                Sans engagement · Annulable à tout moment · + de 180 garages inscrits
              </p>
            </div>

            {/* RIGHT: category preview card */}
            <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xl shadow-blue-100/50">

                {/* Mac-style top bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
                      <Archive className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Mon coffre-fort</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">24 docs</span>
                  </div>
                  <div className="w-12" />
                </div>

                {/* Category cards grid */}
                <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100">
                  {CATEGORIES.map((cat, i) => {
                    const CatIcon = cat.icon;
                    const fakeCounts = [8, 5, 4, 3, 2, 2];
                    const fakeAmounts = [2400, 860, 320, 450, 180, 290];
                    return (
                      <div key={cat.key}
                        className="p-3 hover:bg-gray-50/80 transition-colors"
                        style={{ background: i === 0 ? `${cat.color}06` : undefined }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${cat.color}18` }}>
                            <CatIcon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 leading-tight">{cat.label}</span>
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-black" style={{ color: cat.color }}>
                            {fakeCounts[i]} docs
                          </span>
                          <span className="text-[10px] text-gray-400">{fakeAmounts[i].toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="h-1 rounded-full w-full bg-gray-100">
                          <div className="h-1 rounded-full" style={{ backgroundColor: cat.color, width: `${(fakeCounts[i] / 8) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Lock overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-20 flex flex-col items-center justify-end pb-3"
                  style={{ background: "linear-gradient(to top, rgba(255,255,255,0.97) 40%, transparent)" }}>
                  <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-medium">
                    <Lock className="h-3 w-3" /> Accessible avec votre abonnement
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── VIDEO PRESENTATION ──────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-black">
            Découvrez le coffre-fort en <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">1 minute</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Voyez comment simplifier la gestion de vos documents en quelques clics
          </p>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-200/50 border border-gray-200 bg-black group">
            <video
              id="coffre-video"
              src="/videos/coffre-fort-promo.mp4"
              className="w-full"
              style={{ maxHeight: '500px' }}
              controls
              playsInline
              preload="none"
              poster=""
              onClick={(e) => {
                const vid = e.target as HTMLVideoElement;
                if (vid.paused) vid.play(); else vid.pause();
              }}
            />
          </div>
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-2">
          Tout ce dont votre garage a besoin
        </h2>
        <p className="text-gray-400 text-sm text-center mb-10">
          Conçu spécifiquement pour les professionnels de l'automobile
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow bg-white group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${f.color}15` }}>
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1.5">{f.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA BOTTOM ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 py-14">
        <div className="container mx-auto px-4 text-center">
          <div className="icon-float inline-flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center mb-5">
            <Archive className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            Prêt à ne plus perdre aucune facture ?
          </h2>
          <p className="text-white/70 mb-8 text-sm">
            1er mois gratuit · Sans engagement · Annulable à tout moment
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => subscribe.mutate()}
              disabled={subscribe.isPending || subscribeWithTokens.isPending}
              className="sales-btn-shimmer relative inline-flex items-center gap-2.5 px-8 rounded-xl bg-white text-blue-600 font-black text-base transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 shadow-xl shadow-blue-900/20"
              style={{ height: 52 }}
            >
              <span className="relative z-10 flex items-center gap-2.5">
                {subscribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Activer mon coffre-fort — 1er mois OFFERT
              </span>
            </button>
            {hasEnoughTokens && (
              <button
                onClick={() => subscribeWithTokens.mutate()}
                disabled={subscribe.isPending || subscribeWithTokens.isPending}
                className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-white/30 text-white hover:bg-white/10 text-sm font-semibold transition-colors"
              >
                <Coins className="h-4 w-4 text-amber-300" />
                Payer avec mes jetons
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
