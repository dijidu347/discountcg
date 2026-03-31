import { useNavigate } from "react-router-dom";
import { Archive, Plus, CheckCircle2, Sparkles, Lock } from "lucide-react";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
import { useCoffreDocuments } from "@/hooks/useCoffreDocuments";
import { COFFRE_CATEGORIES } from "@/lib/coffre-categories";

const CATEGORY_HEX_COLORS: Record<string, string> = {
  achats_vehicules: "#3b82f6",
  pieces_accessoires: "#f59e0b",
  carburant: "#ef4444",
  entretien: "#10b981",
  transport: "#6366f1",
  frais_divers: "#8b5cf6",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  achats_vehicules: "Factures d'achat de véhicules",
  pieces_accessoires: "Pièces, accessoires et équipements",
  carburant: "Factures de carburant et d'énergie",
  entretien: "Entretien, réparations, garage",
  transport: "Transport et convoyage de véhicules",
  frais_divers: "Loyer, assurance, frais généraux...",
};

export function CoffreWidget() {
  const navigate = useNavigate();
  const { isActive, isTrialing, isLoading: subLoading } = useCoffreSubscription();
  const { countsByCategory, monthlyAmountsByCategory } = useCoffreDocuments();

  if (subLoading) return null;

  // ── Non-subscriber: redesigned teaser ──────────────────────────────────
  if (!isActive) {
    return (
      <>
        {/* Shimmer keyframe */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25), 0 4px 24px rgba(59,130,246,0.4); }
            50% { box-shadow: 0 0 0 6px rgba(255,255,255,0.08), 0 4px 32px rgba(59,130,246,0.6); }
          }
          .btn-glow { animation: glow-pulse 2.2s ease-in-out infinite; }
          .btn-shimmer::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
            animation: shimmer 2.4s ease-in-out infinite;
          }
        `}</style>

        <div className="relative overflow-hidden rounded-2xl shadow-xl"
          style={{ background: "linear-gradient(135deg, #0f1e3c 0%, #1a3460 50%, #1e4080 100%)" }}>

          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          {/* NOUVEAU badge */}
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wide">
              <Sparkles className="h-2.5 w-2.5" /> Nouveau
            </span>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-0">

            {/* LEFT: content */}
            <div className="flex-1 p-5 md:p-6">
              {/* Icon + title */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Archive className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="text-[10px] text-blue-300/80 font-semibold uppercase tracking-wider">Coffre-fort factures</p>
                  <h3 className="font-black text-white text-base leading-tight">Ne perdez plus JAMAIS une facture</h3>
                </div>
              </div>

              <p className="text-sm text-white/65 mb-3 leading-snug">
                Photographiez → classé automatiquement → exportez en 1 clic.
              </p>

              {/* Benefits */}
              <ul className="space-y-1.5 mb-4">
                {[
                  "Photo en 2 secondes depuis votre téléphone",
                  "Classement automatique par catégorie",
                  "Export comptable CSV / ZIP",
                  "Recherche instantanée de vos factures",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-white/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Price + CTA */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Animated CTA button */}
                <button
                  onClick={() => navigate("/coffre-fort-sales")}
                  className="btn-glow btn-shimmer relative overflow-hidden inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-primary font-black text-sm transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Activer mon coffre-fort
                  </span>
                </button>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">9,99€/mois</p>
                  <p className="text-[10px] text-amber-300 font-semibold">1er mois OFFERT ✦</p>
                </div>
              </div>

              <p className="text-[10px] text-white/30 mt-2.5">+ de 180 garages professionnels déjà inscrits</p>
            </div>

            {/* RIGHT: mini category preview */}
            <div className="md:w-64 lg:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l border-white/8 p-4 relative">
              {/* Lock overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f1e3c]/60 rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none pointer-events-none z-10" />

              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Accès avec l'abonnement
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {COFFRE_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const color = CATEGORY_HEX_COLORS[cat.key];
                  return (
                    <div key={cat.key}
                      className="rounded-lg p-2 flex flex-col gap-1 relative overflow-hidden"
                      style={{ backgroundColor: `${color}12`, border: `1px solid ${color}20` }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}20` }}>
                          <CatIcon className="h-3 w-3" style={{ color }} />
                        </div>
                        <span className="text-[10px] font-semibold text-white/80 leading-tight line-clamp-1">
                          {cat.label}
                        </span>
                      </div>
                      <div className="h-1 rounded-full w-full" style={{ backgroundColor: `${color}20` }}>
                        <div className="h-1 rounded-full w-0" style={{ backgroundColor: color }} />
                      </div>
                      <span className="text-[9px] text-white/30">0 document</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Active subscriber: category cards grid ──────────────────────────────
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long" });

  return (
    <div className="rounded-xl border border-primary/10 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Archive className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-none">Coffre-fort</h3>
            {isTrialing && <p className="text-[11px] text-primary/70 mt-0.5">Essai gratuit en cours</p>}
          </div>
        </div>
        <button
          onClick={() => navigate("/coffre-fort")}
          className="inline-flex items-center h-7 px-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground/70 hover:text-foreground text-xs font-medium transition-colors"
        >
          Voir tout
        </button>
      </div>

      {/* Category mini-cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-border/40">
        {COFFRE_CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const color = CATEGORY_HEX_COLORS[cat.key] || "#6366f1";
          const count = countsByCategory[cat.key] || 0;
          const monthlyTotal = monthlyAmountsByCategory[cat.key] || 0;
          const desc = CATEGORY_DESCRIPTIONS[cat.key] || "";

          return (
            <div key={cat.key} className="relative p-3 bg-card hover:bg-muted/30 transition-colors group">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}18` }}>
                  <CatIcon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <span className="text-xs font-semibold text-foreground/90 leading-tight">{cat.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight mb-2 line-clamp-1">{desc}</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}15`, color }}>
                  {count} doc{count !== 1 ? "s" : ""}
                </span>
                {monthlyTotal > 0 ? (
                  <span className="text-[10px] font-semibold" style={{ color }}>{monthlyTotal.toFixed(0)} €</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 capitalize">0 € en {monthLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => navigate(`/coffre-fort?category=${cat.key}`)}
                  className="flex-1 h-6 rounded text-[10px] font-medium border transition-colors hover:bg-muted/60"
                  style={{ borderColor: `${color}40`, color }}>
                  Voir
                </button>
                <button onClick={() => navigate(`/coffre-fort?category=${cat.key}&add=1`)}
                  className="flex-1 h-6 rounded text-[10px] font-semibold text-white transition-colors hover:opacity-90 flex items-center justify-center gap-0.5"
                  style={{ backgroundColor: color }}>
                  <Plus className="h-2.5 w-2.5" /> Ajouter
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
