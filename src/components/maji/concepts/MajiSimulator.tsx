import { useState } from "react";
import { TrendingUp, ArrowRight, Sparkles, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  MAJI_MENSUEL,
  MAJI_PAR_MANDAT,
  estimateMonthlyNet,
  formatEuro,
  openMajiApply,
  MAJI_VIDEO_SRC,
  MAJI_VIDEO_POSTER,
} from "@/components/maji/maji-shared";

/**
 * CONCEPT 2 (v2) — Simulateur de revenus + vidéo de présentation à droite.
 * Slider "mandats/mois" => commissions estimées − coût réseau = marge nette.
 * Même pattern 2 colonnes que MajiZoneCheck pour garder une identité visuelle cohérente.
 */
export function MajiSimulator(_props: { ville?: string }) {
  const [mandats, setMandats] = useState(10);
  const [videoOpen, setVideoOpen] = useState(false);
  const { brut, coutReseau, net } = estimateMonthlyNet(mandats);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-slate-900 to-emerald-900 text-white shadow-lg">
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wide">
          <Sparkles className="h-2.5 w-2.5" /> Simulateur
        </span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* GAUCHE : simulateur */}
        <div className="flex-1 p-5 md:p-6">
          <p className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
            MaJi Auto · Réseau de dépôt-vente automobile
          </p>
          <h3 className="font-black text-xl md:text-2xl leading-tight mt-1">
            Combien gagneriez-vous en <span className="text-emerald-400">dépôt-vente auto</span> avec MaJi Auto&nbsp;?
          </h3>
          <p className="text-[12px] text-emerald-200/80 mt-1.5 leading-snug">
            Estimation prudente : <span className="font-bold text-emerald-300">1 200 € de marge moyenne</span> par véhicule vendu en dépôt-vente (packs garantie/financement inclus).
          </p>

          {/* Chiffre hero */}
          <div className="mt-4 flex items-end gap-3">
            <span className="text-5xl font-black text-emerald-400 leading-none">
              {formatEuro(net)}
            </span>
            <span className="text-sm text-emerald-200 mb-1">net / mois estimé</span>
          </div>

          {/* Slider */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-emerald-200 mb-2">
              <span>Mandats signés par mois</span>
              <span className="font-black text-white text-base">{mandats}</span>
            </div>
            <Slider
              value={[mandats]}
              onValueChange={(v) => setMandats(v[0])}
              min={1}
              max={25}
              step={1}
              className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-emerald-300/60 mt-1">
              <span>1</span>
              <span>25</span>
            </div>
          </div>

          {/* Détail */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 p-2.5">
              <p className="text-[10px] text-emerald-200/70 uppercase">Commissions</p>
              <p className="font-black text-emerald-300">{formatEuro(brut)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5">
              <p className="text-[10px] text-emerald-200/70 uppercase">Coût réseau</p>
              <p className="font-black text-white/80">−{formatEuro(coutReseau)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 p-2.5 border border-emerald-400/30">
              <p className="text-[10px] text-emerald-200 uppercase">Net</p>
              <p className="font-black text-emerald-300">{formatEuro(net)}</p>
            </div>
          </div>

          <p className="text-[11px] text-emerald-200/60 mt-3">
            {MAJI_MENSUEL}€/mois + {MAJI_PAR_MANDAT}€/mandat · 5 premiers mandats offerts · 0€ d'entrée
          </p>

          <button
            onClick={openMajiApply}
            className="mt-4 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-95"
          >
            <TrendingUp className="h-4 w-4" />
            Je veux ces revenus
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* DROITE : vidéo — occupe toute la hauteur du bloc pour avoir une vraie présence */}
        <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0 p-4 lg:p-5 lg:pl-0 flex">
          <button
            onClick={() => setVideoOpen(true)}
            className="group relative w-full aspect-video lg:aspect-auto min-h-[220px] rounded-xl overflow-hidden bg-black shadow-2xl shadow-emerald-900/50 ring-2 ring-emerald-400/30 hover:ring-emerald-400/60 transition-all"
            aria-label="Voir la présentation MaJi Auto"
          >
            <img
              src={MAJI_VIDEO_POSTER}
              alt="Présentation MaJi Auto — réseau de dépôt-vente"
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {/* Voile dégradé pour fondre le poster dans le thème sombre */}
            <span className="absolute inset-0 bg-gradient-to-br from-transparent via-black/20 to-slate-900/40 group-hover:from-black/10 group-hover:to-slate-900/30 transition-colors" />
            {/* Halo lumineux émeraude derrière le bouton play */}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="absolute w-24 h-24 rounded-full bg-emerald-400/30 blur-2xl group-hover:bg-emerald-400/50 transition-colors" />
              <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-2xl group-hover:scale-110 transition-transform">
                <Play className="h-7 w-7 text-emerald-600 fill-current ml-1" />
              </span>
            </span>
            {/* Label en bas */}
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-emerald-500/90 text-white text-[11px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm uppercase tracking-wider shadow-lg">
              <Play className="h-2.5 w-2.5 fill-current" /> Voir la présentation · 1 min
            </span>
          </button>
        </div>
      </div>

      {/* Modale vidéo */}
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
