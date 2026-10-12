// Les repères factuels du parcours d'import : WW provisoire puis définitive.
//
// C'est la famille de requêtes qui convertit le mieux hors marque — 740
// impressions pour 25 clics, en position 17,8 de moyenne — et elle se coupe
// en deux moitiés très différentes :
//
//   · « immatriculation définitive après WW » et ses variantes sortent en
//     positions 3,6 à 8,3 pour environ 444 impressions… et dix clics. On est
//     vu, on n'est pas choisi ;
//   · « plaque WW provisoire prix », « obtenir des plaques WW » sortent en
//     positions 41 à 89, et la page du WW n'a JAMAIS eu une impression.
//
// Or les deux pages racontent la même histoire par les deux bouts, et il leur
// manquait à toutes les deux le fait qui décide : la taxe régionale réglée au
// moment du WW est DÉDUITE de celle de l'immatriculation définitive. On ne la
// paie pas deux fois. C'est la première inquiétude de quiconque importe un
// véhicule, et aucune des deux pages n'y répondait.
//
// Ce module sert les deux pages, pour qu'elles ne puissent pas diverger.

export interface EtapeImportation {
  etape: string;
  paye: string;
  obtient: string;
}

export const ETAPES_IMPORTATION: EtapeImportation[] = [
  {
    etape: "1. Demande du certificat provisoire WW",
    paye: "La taxe régionale entière, la taxe fixe de 11 € et la redevance de 2,76 €",
    obtient: "Le CPI WW, et le droit de circuler quatre mois",
  },
  {
    etape: "2. Pendant ces quatre mois",
    paye: "Rien",
    obtient: "Le temps de réunir le justificatif fiscal, le COC et le contrôle technique",
  },
  {
    etape: "3. Immatriculation définitive",
    paye: "La taxe régionale déjà réglée au WW vient en déduction",
    obtient: "La carte grise définitive et un numéro SIV",
  },
];

export const REPERES_IMPORT = [
  {
    titre: "La taxe régionale ne se paie pas deux fois",
    texte:
      "C'est la question que tout le monde se pose en voyant le montant du WW, et la réponse est rassurante : la taxe régionale acquittée lors de l'immatriculation provisoire est déduite de celle due à l'immatriculation définitive, à condition de la demander dans le délai du WW. Passer par un WW ne coûte donc pas une taxe de plus — il décale seulement le moment où vous la réglez, et vous permet de rouler pendant ce temps.",
  },
  {
    titre: "Le justificatif fiscal peut attendre, pas le reste",
    texte:
      "C'est le point qui débloque le plus de dossiers : le quitus fiscal n'a pas à être fourni au moment de la demande de WW, il suffit de prouver qu'il a été demandé. Le délai des impôts va de quelques jours à plusieurs semaines, et il n'immobilise pas le véhicule. En revanche le certificat de conformité et, pour un véhicule de plus de quatre ans, le contrôle technique français, devront être au dossier avant la définitive.",
  },
  {
    titre: "Le CPI WW est un document, les plaques sont à commander",
    texte:
      "Ce que nous obtenons pour vous est le certificat provisoire, qui porte votre numéro en WW. Les plaques elles-mêmes se font fabriquer à partir de ce numéro, comme pour n'importe quelle immatriculation. Et elles ne serviront que quelques mois : une fois la carte grise définitive éditée, le numéro change et il faut refaire les plaques au format SIV.",
  },
  {
    titre: "Si les quatre mois ne suffisent pas",
    texte:
      "Un CPI WW expiré n'autorise plus la circulation : le véhicule doit rester immobilisé tant qu'il n'est pas renouvelé ou que la carte grise définitive n'est pas éditée. Le renouvellement se demande avant l'échéance, pas après. C'est la raison pour laquelle nous suivons la date : c'est elle qui commande tout le calendrier.",
  },
  {
    titre: "On peut sauter l'étape du WW",
    texte:
      "Si le véhicule arrive avec son dossier complet — justificatif fiscal, certificat de conformité, contrôle technique —, l'immatriculation définitive se demande directement, sans passer par le provisoire. Le WW ne sert qu'à une chose : rouler pendant que le dossier se constitue.",
  },
  {
    titre: "Les plaques WW hors de France",
    texte:
      "Ce sont des immatriculations françaises provisoires, et leur reconnaissance dépend des accords entre pays. Plusieurs ne les acceptent pas. Il est donc déconseillé de quitter la France avec des plaques WW, même pour un trajet court, tant que la carte grise définitive n'est pas éditée.",
  },
];
