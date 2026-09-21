import { Download } from "lucide-react";

// Formulaires officiels qui ne sont pas des Cerfa numérotés servis depuis
// /cerfas : le quitus fiscal (1993). Le lien pointe vers le PDF vierge publié
// par impots.gouv.fr, pour toujours donner la version officielle.
const FORMULAIRES: { motif: RegExp; nom: string; url: string }[] = [
  {
    motif: /1993-PRO-D-SD|1993-PRO/i,
    nom: "formulaire 1993-PRO-D-SD",
    url: "https://www.impots.gouv.fr/sites/default/files/formulaires/1993-pro-d-sd/2023/1993-pro-d-sd_4506.pdf",
  },
  {
    motif: /1993-PART-D-SD|1993-PART-D|1993-PART/i,
    nom: "formulaire 1993-PART-D-SD",
    url: "https://www.impots.gouv.fr/sites/default/files/formulaires/1993-part-d/2023/1993-part-d_4505.pdf",
  },
];

export function formulaireVierge(libelle: string | null | undefined) {
  return FORMULAIRES.find((f) => f.motif.test(libelle ?? "")) ?? null;
}

// Libellé de la pièce en lien vers le PDF vierge, présenté exactement comme
// les pièces Cerfa (ex. le mandat 13757) : tout le nom souligné, icône au bout.
export function LibelleFormulaire({ texte }: { texte: string | null | undefined }) {
  const libelle = texte ?? "";
  const f = formulaireVierge(libelle);
  if (!f) return <>{libelle}</>;
  return (
    <a
      href={f.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-primary hover:text-primary/80 underline font-medium"
    >
      {libelle}
      <Download className="inline h-3 w-3 ml-1 align-baseline" />
    </a>
  );
}
