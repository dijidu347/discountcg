import { useEffect, useState } from "react";
import { X, Sparkles, Target } from "lucide-react";

/**
 * Popup de bienvenue SniperAuto.
 * Affichée 1x par garage (persistance via localStorage : "sniperauto_popup_seen").
 * - Backdrop noir 60% (clic ferme)
 * - ESC ferme
 * - Animation fade-in + scale 0.95 → 1
 */

const STORAGE_KEY = "sniperauto_popup_seen";
const SNIPERAUTO_URL = "https://sniperauto.fr";

export function SniperAutoPopup() {
  const [open, setOpen] = useState(false);

  // Au mount : vérifier si déjà vue
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== "true") {
        // Léger délai pour laisser le dashboard s'afficher avant la popup
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage indisponible (mode privé) → on affiche quand même
      setOpen(true);
    }
  }, []);

  // Fermeture (mémorise dans localStorage)
  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  // ESC ferme
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    // Bloquer le scroll du body pendant que la popup est ouverte
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  // Clic CTA principal
  const handleDiscover = () => {
    window.open(SNIPERAUTO_URL, "_blank", "noopener,noreferrer");
    close();
  };

  return (
    <>
      {/* Animations inline pour éviter d'ajouter un CSS global */}
      <style>{`
        @keyframes sniperauto-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sniperauto-scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .sniperauto-backdrop { animation: sniperauto-fade-in 200ms ease-out; }
        .sniperauto-card { animation: sniperauto-scale-in 200ms ease-out; }
      `}</style>

      {/* Backdrop noir 60% */}
      <div
        className="sniperauto-backdrop fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
        onClick={close}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sniperauto-popup-title"
      >
        {/* Carte */}
        <div
          className="sniperauto-card relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Croix de fermeture */}
          <button
            onClick={close}
            aria-label="Fermer"
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Bandeau dégradé en haut avec logo */}
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 px-8 pt-8 pb-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-white/70">Nouveauté partenaire</p>
                <h2 id="sniperauto-popup-title" className="text-2xl font-black leading-tight">
                  SniperAuto
                </h2>
              </div>
            </div>
            <p className="text-white/90 font-medium text-sm leading-relaxed">
              Le sniper d'occasions VO — économisez le salaire d'un acheteur grâce à notre IA qui surveille
              <span className="font-bold"> LeBonCoin, La Centrale, ParuVendu et Alcopa </span>
              24h/24, 7j/7.
            </p>
          </div>

          {/* Contenu */}
          <div className="px-8 py-6">
            <ul className="space-y-3 mb-6">
              {[
                "Alertes WhatsApp en temps réel sur les meilleures affaires",
                "Filtres ultra-précis (prix, km, marque, modèle, motorisation exclue, etc.)",
                "Validation automatique : zéro pro si tu veux que des particuliers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleDiscover}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Découvrir SniperAuto →
              </button>
              <button
                onClick={close}
                className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                Plus tard
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-4">
              Remplace un acheteur VO à temps plein • Service partenaire
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
