import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Plus, CheckCircle2, Sparkles, Lock, ChevronDown, ChevronUp } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(true);

  const toggleCollapsed = () => setCollapsed((v) => !v);

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
            0%, 100% { box-shadow: 0 4px 24px rgba(59,130,246,0.35); }
            50% { box-shadow: 0 4px 48px rgba(59,130,246,0.65), 0 0 0 6px rgba(59,130,246,0.12); }
          }
          .btn-glow { animation: glow-pulse 2.2s ease-in-out infinite; }
          .btn-shimmer::after {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
            animation: shimmer 2.4s ease-in-out infinite;
          }
        `}</style>

        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-lg shadow-blue-100/50">

          {/* NOUVEAU badge */}
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wide">
              <Sparkles className="h-2.5 w-2.5" /> Nouveau
            </span>
          </div>

          <div className="flex flex-col md:flex-row">

            {/* LEFT: content */}
            <div className="flex-1 p-5 md:p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Archive className="h-[18px] w-[18px] text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">Coffre-fort factures</p>
                  <h3 className="font-black text-gray-900 text-base leading-tight">Ne perdez plus JAMAIS une facture</h3>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-3 leading-snug">
                Photographiez → classé automatiquement → exportez en 1 clic.
              </p>

              <ul className="space-y-1.5 mb-4">
                {[
                  "Photo en 2 secondes depuis votre téléphone",
                  "Classement automatique par catégorie",
                  "Export comptable CSV / ZIP",
                  "Recherche instantanée de vos factures",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate("/coffre-fort-sales")}
                  className="btn-glow btn-shimmer relative overflow-hidden inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white font-black text-sm transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Activer mon coffre-fort
                  </span>
                </button>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-700">9,99€/mois</p>
                  <p className="text-[10px] text-amber-600 font-semibold">1er mois OFFERT ✦</p>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 mt-2.5">+ de 180 garages professionnels déjà inscrits</p>
            </div>

            {/* RIGHT: mini category preview */}
            <div className="md:w-60 lg:w-64 flex-shrink-0 border-t md:border-t-0 md:border-l border-blue-100 p-4 relative bg-white/60">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80 rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none pointer-events-none z-10" />

              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Accès avec l'abonnement
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {COFFRE_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const color = CATEGORY_HEX_COLORS[cat.key];
                  return (
                    <div key={cat.key}
                      className="rounded-lg p-2 flex flex-col gap-1 bg-white border"
                      style={{ borderColor: `${color}25` }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}18` }}>
                          <CatIcon className="h-3 w-3" style={{ color }} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-700 leading-tight line-clamp-1">
                          {cat.label}
                        </span>
                      </div>
                      <div className="h-1 rounded-full w-full bg-gray-100">
                        <div className="h-1 rounded-full w-0" style={{ backgroundColor: color }} />
                      </div>
                      <span className="text-[9px] text-gray-400">0 document</span>
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

  // ── Active subscriber: 2-col grid + right panel ────────────────────────
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long" });
  const totalDocs = COFFRE_CATEGORIES.reduce((s, cat) => s + (countsByCategory[cat.key] || 0), 0);
  const totalAmount = COFFRE_CATEGORIES.reduce((s, cat) => s + (monthlyAmountsByCategory[cat.key] || 0), 0);
  const topAmountCat = COFFRE_CATEGORIES.reduce((best, cat) =>
    (monthlyAmountsByCategory[cat.key] || 0) > (monthlyAmountsByCategory[best.key] || 0) ? cat : best,
    COFFRE_CATEGORIES[0]
  );

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Archive style={{ width: 18, height: 18 }} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-none">Coffre-fort</h3>
            {isTrialing
              ? <p className="text-[11px] text-amber-500 font-medium mt-0.5">Essai gratuit en cours</p>
              : <p className="text-[11px] text-gray-400 mt-0.5">{totalAmount > 0 ? `${totalAmount.toFixed(0)} € dépensé en ${monthLabel}` : `0 € dépensé en ${monthLabel}`}</p>
            }
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <button
              onClick={() => navigate("/coffre-fort")}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          )}
          <button
            onClick={toggleCollapsed}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 text-xs font-medium transition-colors"
          >
            {collapsed ? <><ChevronDown className="h-3.5 w-3.5" /> Afficher</> : <><ChevronUp className="h-3.5 w-3.5" /> Masquer</>}
          </button>
        </div>
      </div>

      {/* Body: grid left + summary right */}
      {!collapsed && <div className="flex flex-col lg:flex-row">

        {/* LEFT: 2-col grid with horizontal cards */}
        <div className="flex-1 p-3 grid grid-cols-2 gap-2">
          {COFFRE_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const color = CATEGORY_HEX_COLORS[cat.key] || "#6366f1";
            const count = countsByCategory[cat.key] || 0;
            const monthlyTotal = monthlyAmountsByCategory[cat.key] || 0;

            return (
              <button
                key={cat.key}
                onClick={() => navigate(`/coffre-fort?category=${cat.key}`)}
                className="flex items-center gap-3 rounded-xl border p-3 text-left hover:shadow-sm transition-all"
                style={{ borderColor: `${color}30`, backgroundColor: `${color}06` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}18` }}>
                  <CatIcon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{cat.label}</p>
                  <p className="text-sm font-black leading-none mt-1" style={{ color: monthlyTotal > 0 ? color : "#d1d5db" }}>
                    {monthlyTotal > 0 ? `${monthlyTotal.toFixed(0)} €` : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{count} doc{count !== 1 ? "s" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT: summary panel */}
        <div className="lg:w-52 xl:w-60 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-50 flex flex-col">

          {/* Total docs */}
          <div className="p-4 border-b border-gray-50">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Total documents</p>
            <p className="text-3xl font-black text-gray-900 leading-none">{totalDocs}</p>
            <p className="text-xs text-gray-400 mt-0.5">dans toutes les catégories</p>
          </div>

          {/* Ce mois */}
          <div className="p-4 border-b border-gray-50">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 capitalize">{monthLabel}</p>
            <p className="text-2xl font-black text-blue-600 leading-none">
              {totalAmount > 0 ? `${totalAmount.toFixed(0)} €` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">dépenses du mois</p>
          </div>

          {/* Plus grosse dépense */}
          <div className="p-4 border-b border-gray-50">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">Plus grosse dépense</p>
            {(monthlyAmountsByCategory[topAmountCat.key] || 0) > 0 ? (() => {
              const TopIcon = topAmountCat.icon;
              const color = CATEGORY_HEX_COLORS[topAmountCat.key];
              return (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}18` }}>
                    <TopIcon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-none">{topAmountCat.label}</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color }}>{(monthlyAmountsByCategory[topAmountCat.key] || 0).toFixed(0)} € ce mois</p>
                  </div>
                </div>
              );
            })() : (
              <p className="text-xs text-gray-300 italic">Aucune dépense</p>
            )}
          </div>

          {/* CTA */}
          <div className="p-4 mt-auto">
            <button
              onClick={() => navigate("/coffre-fort")}
              className="w-full h-9 rounded-xl border-2 border-blue-100 text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors"
            >
              Voir tout →
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}
