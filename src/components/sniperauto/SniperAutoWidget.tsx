import { useState } from "react";
import { Target, Sparkles, CheckCircle2, ExternalLink, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Widget de mise en avant SniperAuto sur le dashboard garage.
 * - PAS d'autoplay : la vidéo ne se lance jamais toute seule.
 * - Aperçu statique (1re frame) + bouton "Voir la vidéo" → ouvre une modale.
 * - La vidéo ne joue QUE si le garage clique explicitement dessus.
 * - CTA principal vers https://sniperauto.fr
 */

const SNIPERAUTO_URL = "https://sniperauto.fr";
const VIDEO_SRC = "/videos/sniperauto-demo.mp4";

export function SniperAutoWidget() {
  const [showVideo, setShowVideo] = useState(false);

  const openSniper = () => {
    window.open(SNIPERAUTO_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-lg shadow-blue-100/50">
        {/* Badge NOUVEAU */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wide">
            <Sparkles className="h-2.5 w-2.5" /> Nouveau
          </span>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* GAUCHE : contenu textuel */}
          <div className="flex-1 p-5 md:p-6 order-2 lg:order-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Target className="h-[18px] w-[18px] text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">
                  SniperAuto · Acheteur VO automatisé
                </p>
                <h3 className="font-black text-gray-900 text-base leading-tight">
                  Le sniper d'occasions VO 24h/24
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-3 leading-snug">
              Économisez le salaire d'un acheteur VO. Notre IA scanne LeBonCoin, La Centrale,
              ParuVendu et Alcopa pour vous envoyer les meilleures affaires en direct sur WhatsApp.
            </p>

            <ul className="space-y-1.5 mb-4">
              {[
                "Alertes WhatsApp temps réel sur les meilleures affaires",
                "Filtres ultra-précis (prix, km, marque, motorisation…)",
                "Filtre pro/particulier : zéro pro si vous voulez que des particuliers",
                "Remplace un acheteur VO à temps plein",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openSniper}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/30 transition-all hover:scale-[1.03] active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Visiter sniperauto.fr
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </button>
              <button
                onClick={() => setShowVideo(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-blue-200 text-blue-600 font-bold text-sm hover:bg-blue-50 transition-colors"
              >
                <Play className="h-4 w-4" />
                Voir la vidéo
              </button>
              <div className="text-left">
                <p className="text-sm font-black text-amber-600">+180 garages connectés</p>
                <p className="text-[10px] text-gray-400">Service partenaire DiscountCarteGrise</p>
              </div>
            </div>
          </div>

          {/* DROITE : aperçu cliquable (ne joue PAS tout seul) */}
          <div className="lg:w-[420px] xl:w-[460px] flex-shrink-0 p-4 lg:p-5 order-1 lg:order-2">
            <button
              onClick={() => setShowVideo(true)}
              className="group relative w-full overflow-hidden rounded-xl bg-black shadow-md aspect-video"
              aria-label="Voir la vidéo de présentation SniperAuto"
            >
              {/* 1re frame seulement (preload metadata) → sert de poster, ne joue pas */}
              <video
                src={VIDEO_SRC}
                preload="metadata"
                muted
                playsInline
                tabIndex={-1}
                className="w-full h-full object-cover pointer-events-none"
              />
              {/* Overlay play */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/45 transition-colors">
                <span className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-gray-900 font-bold text-sm shadow-xl group-hover:scale-105 transition-transform">
                  <Play className="h-5 w-5 fill-current" />
                  Voir la vidéo
                </span>
              </span>
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Démo SniperAuto · 60 secondes
            </p>
          </div>
        </div>
      </div>

      {/* Modale vidéo : ne s'ouvre QUE sur clic explicite du garage */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
          {showVideo && (
            <video
              src={VIDEO_SRC}
              controls
              autoPlay
              playsInline
              className="w-full"
              style={{ maxHeight: "80vh" }}
            />
          )}
          <div className="p-4 bg-white flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Démo SniperAuto · L'acheteur VO automatisé</p>
            <button
              onClick={openSniper}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-transform hover:scale-105"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Visiter sniperauto.fr
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
