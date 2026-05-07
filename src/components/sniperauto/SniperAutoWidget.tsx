import { useRef, useState } from "react";
import { Target, Sparkles, CheckCircle2, ExternalLink, Volume2, VolumeX, Play } from "lucide-react";

/**
 * Widget de mise en avant SniperAuto sur le dashboard garage.
 * - Vidéo locale (NON mute) avec contrôles + bouton son
 * - Lecture automatique UNE SEULE FOIS, puis reste en pause (persistance localStorage)
 * - CTA principal vers https://sniperauto.fr
 * - Remplace le bloc "coffre fort" historiquement en hero du dashboard
 *
 * Note autoplay : les navigateurs bloquent l'autoplay AVEC son. Le composant
 * tente l'autoplay non-muté ; en cas d'échec il retombe sur muted=true et
 * affiche un overlay "Activer le son". L'utilisateur clique → unmute + play.
 */

const SNIPERAUTO_URL = "https://sniperauto.fr";
const VIDEO_SRC = "/videos/sniperauto-demo.mp4";
const VIDEO_SEEN_KEY = "sniperauto_video_seen";

export function SniperAutoWidget() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [needsClickToPlay, setNeedsClickToPlay] = useState(false);

  // A-t-on déjà joué la vidéo en entier sur ce navigateur ?
  const alreadySeen = (() => {
    try {
      return localStorage.getItem(VIDEO_SEEN_KEY) === "true";
    } catch {
      return false;
    }
  })();

  // Marque la vidéo comme vue (déclenché à la fin de lecture)
  const markAsSeen = () => {
    try {
      localStorage.setItem(VIDEO_SEEN_KEY, "true");
    } catch {
      /* noop */
    }
  };

  // Au montage : si jamais vue → autoplay (avec fallback muted) ; sinon → reste en pause.
  const handleLoaded = async () => {
    const v = videoRef.current;
    if (!v) return;

    if (alreadySeen) {
      // Déjà vue : on laisse en pause, mais on garde les contrôles natifs
      v.pause();
      setNeedsClickToPlay(false);
      return;
    }

    try {
      v.muted = false;
      await v.play();
      setIsMuted(false);
      setNeedsClickToPlay(false);
    } catch {
      // Autoplay non-muté bloqué : retombe sur muted + overlay "Activer le son"
      try {
        v.muted = true;
        await v.play();
        setIsMuted(true);
        setNeedsClickToPlay(true);
      } catch {
        // Même muted bloqué (rare) : on laisse les contrôles natifs
        setNeedsClickToPlay(true);
      }
    }
  };

  // Fin de la vidéo : on mémorise + on s'assure qu'elle reste en pause (pas de loop)
  const handleEnded = () => {
    markAsSeen();
    const v = videoRef.current;
    if (v) v.pause();
  };

  // Toggle son via bouton overlay (relance la lecture depuis le début si nécessaire)
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
    if (!v.muted) setNeedsClickToPlay(false);
    v.play().catch(() => undefined);
  };

  const openSniper = () => {
    window.open(SNIPERAUTO_URL, "_blank", "noopener,noreferrer");
  };

  return (
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
            <div className="text-left">
              <p className="text-sm font-black text-amber-600">+180 garages connectés</p>
              <p className="text-[10px] text-gray-400">Service partenaire DiscountCarteGrise</p>
            </div>
          </div>
        </div>

        {/* DROITE : vidéo */}
        <div className="lg:w-[420px] xl:w-[460px] flex-shrink-0 p-4 lg:p-5 order-1 lg:order-2">
          <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-md aspect-video">
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              playsInline
              controls
              preload="metadata"
              onLoadedMetadata={handleLoaded}
              onEnded={handleEnded}
              className="w-full h-full object-cover"
            />

            {/* Overlay "Activer le son" si l'autoplay non-muté a été bloqué */}
            {needsClickToPlay && (
              <button
                onClick={toggleMute}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 transition-colors group"
                aria-label="Activer le son"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-gray-900 font-bold text-sm shadow-xl group-hover:scale-105 transition-transform">
                  <Play className="h-4 w-4 fill-current" />
                  Activer le son
                </span>
              </button>
            )}

            {/* Bouton mute/unmute discret en haut-droite (toujours visible) */}
            {!needsClickToPlay && (
              <button
                onClick={toggleMute}
                aria-label={isMuted ? "Activer le son" : "Couper le son"}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Démo SniperAuto · 60 secondes
          </p>
        </div>
      </div>
    </div>
  );
}
