import { ArrowRight } from "lucide-react";

/**
 * MODULE 02 — Le bloc contextuel.
 *
 * Le plus puissant des cinq, parce qu'il arrive au bon moment : le garage vient
 * de clore une vente de véhicule, le sujet est déjà dans sa tête.
 *
 * Ne s'affiche donc QUE sous une déclaration de cession ou d'achat effectivement
 * engagée (payée ou offerte), et jamais sur un secteur déjà attribué — mentir sur
 * la rareté détruirait sa crédibilité sur tout le reste du réseau.
 */
interface Props {
  /** "DC" (cession) ou "DA" (achat) — conditionne la première phrase. */
  type: "DC" | "DA";
  onVerifier: () => void;
}

export function MajiBlocContextuel({ type, onVerifier }: Props) {
  const accroche = type === "DC" ? "Une cession de plus." : "Un véhicule de plus à revendre.";

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="max-w-[52ch] text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
        <strong className="font-semibold text-gray-900 dark:text-gray-100">{accroche}</strong>{" "}
        Vous faites déjà le plus difficile : préparer le véhicule, gérer la paperasse,
        conclure la vente. Le réseau MaJi Auto vous apporte des véhicules en
        dépôt-vente sur votre zone.
      </p>

      <button
        onClick={onVerifier}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#003399] px-[18px] py-2.5 text-[14.5px] font-semibold text-[#003399] transition-colors hover:bg-[#003399]/5 dark:border-[#6D94F5] dark:text-[#6D94F5] dark:hover:bg-[#6D94F5]/10"
      >
        Voir si mon secteur est libre
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
