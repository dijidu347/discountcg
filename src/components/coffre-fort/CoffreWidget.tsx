import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Plus, CheckCircle2 } from "lucide-react";
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

  // Non-subscriber: eye-catching teaser widget
  if (!isActive) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-primary rounded-lg p-6 text-white shadow-lg">
        <div className="absolute -top-1 -right-1">
          <Badge className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-bl-lg rounded-tr-lg shadow-md">
            NOUVEAU
          </Badge>
        </div>
        <div className="flex items-start gap-4">
          <Archive className="h-9 w-9 flex-shrink-0 mt-1 opacity-90" />
          <div className="flex-1">
            <h3 className="font-extrabold text-lg leading-tight mb-1">
              Ne perdez plus JAMAIS une facture
            </h3>
            <p className="text-sm text-white/80 mb-3">
              Prenez vos factures en photo → classées automatiquement
            </p>
            <ul className="text-sm space-y-1 mb-4 text-white/90">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Photo en 2 secondes</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Classement automatique</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Export comptable en 1 clic</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Stockage illimité</li>
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate("/coffre-fort-sales")} variant="secondary" className="font-bold shadow-md">
                Activer mon coffre-fort
              </Button>
              <span className="text-xs text-white/70">9,99€/mois — 1er mois OFFERT</span>
            </div>
            <p className="text-[11px] text-white/50 mt-2">Rejoins par + de 180 garages pros</p>
          </div>
        </div>
      </div>
    );
  }

  // Active subscriber: get current month label
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
            <div
              key={cat.key}
              className="relative p-3 bg-card hover:bg-muted/30 transition-colors group"
            >
              {/* Icon + title */}
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}18` }}
                >
                  <CatIcon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <span className="text-xs font-semibold text-foreground/90 leading-tight">{cat.label}</span>
              </div>

              {/* Description */}
              <p className="text-[10px] text-muted-foreground leading-tight mb-2 line-clamp-1">{desc}</p>

              {/* Count + monthly */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {count} doc{count !== 1 ? "s" : ""}
                </span>
                {monthlyTotal > 0 ? (
                  <span className="text-[10px] font-semibold" style={{ color }}>
                    {monthlyTotal.toFixed(0)} €
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 capitalize">
                    0 € en {monthLabel}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/coffre-fort?category=${cat.key}`)}
                  className="flex-1 h-6 rounded text-[10px] font-medium border transition-colors hover:bg-muted/60"
                  style={{ borderColor: `${color}40`, color }}
                >
                  Voir
                </button>
                <button
                  onClick={() => navigate(`/coffre-fort?category=${cat.key}&add=1`)}
                  className="flex-1 h-6 rounded text-[10px] font-semibold text-white transition-colors hover:opacity-90 flex items-center justify-center gap-0.5"
                  style={{ backgroundColor: color }}
                >
                  <Plus className="h-2.5 w-2.5" />
                  Ajouter
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
