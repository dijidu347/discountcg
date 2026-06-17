import { Car, Plus, CheckCircle2, ArrowRight } from "lucide-react";
import { openMajiApply } from "@/components/maji/maji-shared";

/**
 * CONCEPT 4 — La carte « seconde activité » native (anti-pub).
 * Présente MaJi comme une nouvelle brique du cockpit DCG, ton produit/feature,
 * pas une bannière sponsorisée. Effort minimal, se fond dans l'UI.
 */
export function MajiNativeCard(_props: { ville?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Header façon "module DCG" */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Car className="h-[18px] w-[18px] text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-none">
              Ajouter une activité dépôt-vente
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Nouvelle source de revenus pour votre garage
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          Partenaire MaJi
        </span>
      </div>

      <div className="p-5">
        <p className="text-sm text-gray-600 leading-snug mb-4">
          Vous gérez déjà les cartes grises de vos clients. Et si vous vendiez aussi
          leurs véhicules ? MaJi vous donne le cockpit, la formation et les contrats —
          vous gardez votre garage et ajoutez une activité rentable.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            ["0€", "frais d'entrée"],
            ["99€", "par mois"],
            ["5", "mandats offerts"],
          ].map(([big, small]) => (
            <div key={small} className="rounded-xl bg-gray-50 p-2.5 text-center">
              <p className="font-black text-emerald-600 text-lg leading-none">{big}</p>
              <p className="text-[10px] text-gray-400 mt-1">{small}</p>
            </div>
          ))}
        </div>

        <ul className="space-y-1.5 mb-4">
          {[
            "Cockpit numérique + formation incluse",
            "Contrats générés automatiquement",
            "Exclusivité de votre secteur",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              {t}
            </li>
          ))}
        </ul>

        <button
          onClick={openMajiApply}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Activer cette activité
          <ArrowRight className="h-4 w-4 opacity-80" />
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Sans engagement · réponse sous 72h
        </p>
      </div>
    </div>
  );
}
