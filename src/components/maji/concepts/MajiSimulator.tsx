import { useState } from "react";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  MAJI_MENSUEL,
  MAJI_PAR_MANDAT,
  estimateMonthlyNet,
  formatEuro,
  openMajiApply,
} from "@/components/maji/maji-shared";

/**
 * CONCEPT 2 — Le simulateur de revenus.
 * Slider "mandats/mois" => commissions estimées − coût réseau = marge nette.
 * Levier = intérêt personnel, le garage se projette lui-même.
 */
export function MajiSimulator(_props: { ville?: string }) {
  const [mandats, setMandats] = useState(10);
  const { brut, coutReseau, net } = estimateMonthlyNet(mandats);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-slate-900 to-emerald-900 text-white shadow-lg">
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wide">
          <Sparkles className="h-2.5 w-2.5" /> Simulateur
        </span>
      </div>

      <div className="p-6">
        <p className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
          MaJi Auto · Combien pourriez-vous gagner ?
        </p>
        <h3 className="font-black text-xl leading-tight mt-1">
          Votre dépôt-vente, en chiffres
        </h3>

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
          {MAJI_MENSUEL}€/mois + {MAJI_PAR_MANDAT}€/mandat · 5 premiers mandats offerts à vie · 0€ d'entrée
        </p>

        <button
          onClick={openMajiApply}
          className="mt-4 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-sm shadow-lg transition-all hover:scale-[1.02]"
        >
          <TrendingUp className="h-4 w-4" />
          Je veux ces revenus
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
