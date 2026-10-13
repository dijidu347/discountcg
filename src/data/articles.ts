// Les articles du blog.
//
// Le texte vit ici, et non dans du JSX, pour que `scripts/prerender.mjs` puisse
// l'écrire dans le HTML servi : un article que seul React affiche est invisible
// pour les robots qui n'exécutent pas le JavaScript, et c'est précisément eux
// qu'un blog cherche à atteindre.
//
// RÈGLE DE RÉDACTION, à ne pas contourner : chaque affirmation réglementaire
// est vérifiée sur une source primaire — Légifrance, service-public.gouv.fr,
// interieur.gouv.fr, douane.gouv.fr — et cette source figure dans `sources`.
// Les blogs du secteur se recopient entre eux et se trompent : la rumeur du
// « malus rétroactif sur toutes les occasions » en est l'exemple le plus net.
// Publier une erreur sous l'habilitation n° 285046 nous engage.

export type Bloc =
  | { type: "p"; texte: string }
  | { type: "h2"; texte: string }
  | { type: "liste"; items: string[] };

export interface Article {
  slug: string;
  titre: string;
  /** Deux phrases maximum : c'est ce qui s'affiche sur la carte et dans Google. */
  chapo: string;
  categorie: string;
  /** Date de publication, au format ISO. */
  date: string;
  image: string;
  imageCredit: string;
  corps: Bloc[];
  sources: { libelle: string; url: string }[];
}

/** Les couleurs des étiquettes, une par catégorie. */
export const COULEURS_CATEGORIE: Record<string, string> = {
  "Réglementation": "bg-primary/10 text-primary",
  "Professionnels": "bg-amber-100 text-amber-800",
  "Tarifs": "bg-emerald-100 text-emerald-800",
  "Idées reçues": "bg-rose-100 text-rose-800",
};

export const ARTICLES: Article[] = [
  {
    slug: "habilitation-siv-deux-conventions-2026",
    titre: "Habilitation SIV : les garages signent désormais deux conventions",
    chapo:
      "L'arrêté du 21 juillet 2026 a remplacé l'habilitation unique par une convention d'entreprise et une convention par établissement. Les délais de mise en conformité sont passés : le 1er août, puis le 1er octobre 2026.",
    categorie: "Professionnels",
    date: "2026-10-13",
    image: "/blog/habilitation-siv-2026.jpg",
    imageCredit: "Photo : Unsplash",
    corps: [
      {
        type: "p",
        texte:
          "L'arrêté du 21 juillet 2026, publié au Journal officiel du 26 juillet et entré en vigueur le lendemain, réécrit les règles d'accès au Système d'immatriculation des véhicules. Il modifie l'arrêté du 9 février 2009, le texte qui organise les immatriculations depuis la réforme du SIV.",
      },
      {
        type: "h2",
        texte: "Une habilitation, deux conventions",
      },
      {
        type: "p",
        texte:
          "L'habilitation ne s'obtient plus d'un bloc. Le professionnel signe d'abord une convention d'entreprise avec le préfet du département de son siège social, conclue pour trois ans et déposée sur le site de l'ANTS. Il signe ensuite une convention d'établissement pour chaque site qui accédera au fichier, avec le préfet du lieu où se trouve le local. L'habilitation prend effet à la signature de cette seconde convention, et celle-ci est précédée d'un entretien.",
      },
      {
        type: "p",
        texte:
          "L'objectif annoncé est de distinguer la responsabilité de l'entreprise de celle de chacun de ses établissements, et de rendre le contrôle des accès au SIV à la préfecture locale.",
      },
      {
        type: "h2",
        texte: "Ce qu'il faut justifier",
      },
      {
        type: "liste",
        items: [
          "Trois ans d'existence légale et d'activité professionnelle au jour de la demande (article 18-2).",
          "Une activité stable et régulière liée à l'immatriculation, soit au moins deux cents opérations sur une année (article 18-4).",
          "Un local dédié à l'activité professionnelle.",
          "Un bulletin n° 2 du casier judiciaire vierge.",
        ],
      },
      {
        type: "h2",
        texte: "Les délais sont passés",
      },
      {
        type: "p",
        texte:
          "L'article 11 de l'arrêté laissait aux professionnels déjà habilités jusqu'au 1er août 2026 pour se mettre en conformité, et jusqu'au 1er octobre 2026 pour le seul critère des trois ans d'ancienneté. Passé ces dates, l'habilitation tombe.",
      },
      {
        type: "p",
        texte:
          "Le seuil de deux cents opérations par an est celui qui écarte le plus de garages : un atelier qui immatricule quelques véhicules par mois ne l'atteint pas. Ces professionnels gardent la possibilité de passer par un mandataire habilité, ce qui ne demande ni convention, ni local dédié, ni volume minimum.",
      },
    ],
    sources: [
      {
        libelle: "Arrêté du 21 juillet 2026 — Légifrance",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054486788",
      },
      {
        libelle: "Article 5 de l'arrêté — Légifrance",
        url: "https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000054486805",
      },
    ],
  },
  {
    slug: "plaques-ww-w-garage-roses",
    titre: "Les plaques WW et W garage sont roses depuis janvier 2026",
    chapo:
      "Fond rose rétroréfléchissant, caractères noirs, et pour les WW la date de fin de validité inscrite sur la plaque. Les anciennes plaques blanches restent valables jusqu'à leur échéance.",
    categorie: "Réglementation",
    date: "2026-10-13",
    image: "/blog/plaques-ww-roses.jpg",
    imageCredit: "Photo : Unsplash",
    corps: [
      {
        type: "p",
        texte:
          "L'arrêté du 21 novembre 2025, publié au Journal officiel du 2 décembre 2025, donne une plaque propre aux véhicules immatriculés à titre provisoire. Depuis le 1er janvier 2026, les plaques WW et W garage ont un fond rose rétroréfléchissant et des caractères noirs, à la place du fond blanc à caractères rouges.",
      },
      {
        type: "h2",
        texte: "La date de validité est écrite sur la plaque",
      },
      {
        type: "p",
        texte:
          "C'est le vrai changement. Sur une plaque WW, la date de fin de validité du certificat provisoire figure désormais à droite, au format mois/année. Un contrôle sur le bord de la route n'exige plus de demander les papiers pour savoir si le provisoire est périmé : la plaque le dit.",
      },
      {
        type: "p",
        texte:
          "Le ministère de l'Intérieur chiffre à plus de 400 000 par an les véhicules concernés : véhicules neufs en attente d'immatriculation, véhicules importés, et véhicules utilisés en essai par les professionnels sous couvert d'un W garage.",
      },
      {
        type: "h2",
        texte: "Faut-il changer ses plaques ?",
      },
      {
        type: "p",
        texte:
          "Non. Une plaque blanche à caractères rouges déjà posée reste valable jusqu'à l'échéance du certificat provisoire. Il n'y a rien à faire avant cette date. Le fond rose s'applique aux plaques posées à partir du 1er janvier 2026.",
      },
    ],
    sources: [
      {
        libelle: "Plaques d'immatriculation roses — ministère de l'Intérieur",
        url: "https://www.interieur.gouv.fr/actualites/actualites-du-ministere/plaques-dimmatriculation-roses-zoom-sur-reglementation-en-vigueur",
      },
      {
        libelle: "Arrêté du 21 novembre 2025 — Légifrance",
        url: "https://www.legifrance.gouv.fr/eli/arrete/2025/11/21/INTS2532392A/jo/texte",
      },
    ],
  },
];

/** Du plus récent au plus ancien. */
export const ARTICLES_TRIES: Article[] = [...ARTICLES].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export function articleParSlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** « 13 octobre 2026 » */
export function dateEnFrancais(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
