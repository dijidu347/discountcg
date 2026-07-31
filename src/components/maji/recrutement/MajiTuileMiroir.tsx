import { ArrowRight } from "lucide-react";

/**
 * MODULE 01 — La tuile miroir.
 *
 * Le garage lit son propre compteur avant de lire l'argumentaire. Personne ne
 * discute ses propres chiffres.
 *
 * Le nombre affiché provient des démarches déjà chargées par le dashboard
 * (cf. calculerSignaux), donc il correspond exactement aux statistiques que le
 * garage voit juste au-dessus. Un écart, même d'une unité, ruinerait l'argument.
 */
interface Props {
  /** Cessions traitées depuis le 1er janvier. */
  cessions: number;
  onDecouvrir: () => void;
}

export function MajiTuileMiroir({ cessions, onDecouvrir }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="font-mono text-4xl font-semibold leading-none tracking-tight text-[#003399] tabular-nums">
        {cessions}
      </div>
      <div className="mt-1.5 text-sm text-gray-500">
        {cessions > 1 ? "cessions traitées" : "cession traitée"} depuis janvier
      </div>

      <p className="mt-3.5 max-w-[52ch] text-[15px] leading-relaxed text-gray-700">
        Vous maîtrisez déjà la partie difficile : la vente, la préparation,
        l'administratif. Il vous manque le flux de vendeurs. MaJi Auto détecte les
        particuliers qui veulent confier leur véhicule en dépôt-vente dans votre
        secteur.
      </p>

      <button
        onClick={onDecouvrir}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#003399] px-[18px] py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#002a7a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#003399]"
      >
        Découvrir le réseau
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
