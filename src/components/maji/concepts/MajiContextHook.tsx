import { Lightbulb, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { openMajiApply } from "@/components/maji/maji-shared";

/**
 * CONCEPT 6 (Wildcard) — Le hook contextuel post-démarche.
 * S'affiche AU MOMENT où le garage vient de finaliser une carte grise :
 * "Ce client revend bientôt ? Vous pourriez gérer la vente — et en vivre."
 * Levier = pertinence contextuelle maximale (greffé dans le flux de travail).
 */
export function MajiContextHook(_props: { ville?: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="text-xs text-emerald-600 underline"
      >
        (démo) ré-afficher le hook contextuel
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      {/* simulation du contexte : une démarche qui vient d'être validée */}
      <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold mb-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Carte grise AB-123-CD finalisée pour M. Dupont
      </div>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="h-[18px] w-[18px] text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 leading-snug">
            Ce client revend bientôt sa voiture ?
          </p>
          <p className="text-xs text-gray-600 mt-1 leading-snug">
            Avec MaJi, vous pourriez gérer la vente de A à Z — et toucher une commission.
            Le dépôt-vente, c'est le prolongement naturel de votre activité.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={openMajiApply}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
            >
              Devenir agent dépôt-vente <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-300 hover:text-gray-500"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
