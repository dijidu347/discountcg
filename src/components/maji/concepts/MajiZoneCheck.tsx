import { useState } from "react";
import { CheckCircle2, ArrowRight, Sparkles, Play, Gift } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { isZoneFree, openMajiApply } from "@/components/maji/maji-shared";

const MAJI_VIDEO_SRC = "https://maji-auto.fr/presentation-promo.mp4";
const MAJI_VIDEO_POSTER = "/videos/maji-presentation-poster.jpg";

const BADGES = ["0 € d'entrée", "99 €/mois", "Sans engagement", "Zone exclusive"];

/**
 * Bloc de conversion MaJi Auto (version minimale).
 * Gauche : promesse + chiffres + CTA personnalisé par ville. Droite : vidéo (poster + play).
 */
const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

export function MajiZoneCheck({ ville }: { ville?: string }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const free = ville ? isZoneFree(ville) : null;
  const villeLabel = ville ? titleCase(ville) : "";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-lg shadow-emerald-100/50">
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wide">
          <Sparkles className="h-2.5 w-2.5" /> Exclusivité de zone
        </span>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* GAUCHE : promesse + chiffres + CTA */}
        <div className="flex-1 p-5 md:p-6">
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
            MaJi Auto · Réseau de dépôt-vente auto
          </p>
          <h3 className="font-black text-gray-900 text-xl leading-tight mt-1">
            Lancez votre dépôt-vente auto dans votre ville
          </h3>
          <p className="text-sm text-gray-500 mt-2 leading-snug">
            Un réseau clé en main pour vendre des véhicules
            <span className="font-semibold text-gray-700"> sans stock à financer</span> :
            cockpit, formation, contrats automatisés et accompagnement.
          </p>

          {/* Offre de lancement mise en avant : 5 mandats offerts */}
          <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-2.5">
            <Gift className="h-7 w-7 text-amber-500 flex-shrink-0" />
            <div className="leading-tight">
              <p className="font-black text-gray-900 text-base">
                5 mandats signés <span className="text-amber-600">OFFERTS</span> au démarrage
              </p>
              <p className="text-[11px] text-gray-500">
                Vos 5 premiers mandats à 0 € · RDV annulé ou rétractation : aucun frais.
              </p>
            </div>
            <span className="ml-auto self-start text-[9px] font-black text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0">
              Lancement
            </span>
          </div>

          {/* Chiffres forts */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {BADGES.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full"
              >
                <CheckCircle2 className="h-3 w-3" /> {b}
              </span>
            ))}
          </div>

          {/* Disponibilité personnalisée (sans recherche : ville du garage connue) */}
          {ville && free && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <p className="flex items-center gap-2 font-bold text-emerald-700 text-sm">
                <CheckCircle2 className="h-4 w-4" /> {villeLabel} est encore disponible — 1 place sur votre secteur
              </p>
            </div>
          )}

          {/* CTA principal */}
          <button
            onClick={openMajiApply}
            className="mt-4 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.03] active:scale-95"
          >
            {ville && free ? `Candidater pour ${villeLabel}` : "Devenir agent MaJi Auto"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            Réponse sous 72h · <span className="text-emerald-700 font-bold">Sans engagement</span> · 0 € de frais d'entrée
          </p>
        </div>

        {/* DROITE : vidéo (poster + play) */}
        <div className="lg:w-[420px] xl:w-[460px] flex-shrink-0 p-4 lg:p-5">
          <button
            onClick={() => setVideoOpen(true)}
            className="group relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-md"
            aria-label="Voir la présentation MaJi Auto"
          >
            <img
              src={MAJI_VIDEO_POSTER}
              alt="Présentation MaJi Auto — 5 mandats offerts"
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/95 shadow-xl group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-emerald-600 fill-current ml-0.5" />
              </span>
            </span>
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 text-white text-[11px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
              <Play className="h-2.5 w-2.5 fill-current" /> Présentation · 1 min
            </span>
          </button>
        </div>
      </div>

      {/* Modale vidéo (lecture à la demande, au clic) */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
          <video
            src={MAJI_VIDEO_SRC}
            poster={MAJI_VIDEO_POSTER}
            controls
            autoPlay
            playsInline
            className="w-full"
            style={{ maxHeight: "80vh" }}
          />
          <div className="p-4 bg-white flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">MaJi Auto — réseau de dépôt-vente · 1 agent par secteur</p>
            <button
              onClick={openMajiApply}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-colors flex-shrink-0"
            >
              Candidater <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
