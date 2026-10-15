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
    slug: "controle-technique-2026-rappels-constructeur",
    titre: "Contrôle technique : non, il ne passe pas tous les ans — mais un rappel non réparé cloue la voiture",
    chapo:
      "La périodicité n'a pas bougé : quatre ans, puis tous les deux ans. Ce qui a changé au 1er janvier 2026, c'est que le contrôleur regarde si votre véhicule fait l'objet d'un rappel grave — et un airbag Takata non remplacé vous interdit de rouler dès le lendemain.",
    categorie: "Idées reçues",
    date: "2026-10-15",
    image: "/blog/controle-technique-rappel.jpg",
    imageCredit: "Photo : Unsplash",
    corps: [
      {
        type: "p",
        texte:
          "Depuis l'automne, plusieurs sites annoncent un contrôle technique annuel pour les voitures de plus de dix ans. Nous sommes allés lire la fiche officielle, vérifiée au 1er janvier 2026 : elle ne dit rien de tel. Et elle décrit en revanche un changement bien réel, dont on parle beaucoup moins, alors qu'il peut immobiliser un véhicule du jour au lendemain.",
      },
      {
        type: "h2",
        texte: "La périodicité n'a pas changé",
      },
      {
        type: "p",
        texte:
          "Le premier contrôle se fait dans les six mois qui précèdent le quatrième anniversaire de la première mise en circulation. C'est à vous d'y penser : aucune convocation n'est envoyée. Ensuite, un contrôle favorable vaut deux ans. Une contre-visite favorable vaut elle aussi deux ans, comptés depuis le contrôle défavorable qui l'a provoquée.",
      },
      {
        type: "p",
        texte:
          "L'âge du véhicule n'entre pas dans cette règle. Une voiture de douze ans suit exactement le même rythme qu'une voiture de cinq ans.",
      },
      {
        type: "h2",
        texte: "Ce qui a vraiment changé : les campagnes de rappel",
      },
      {
        type: "p",
        texte:
          "Depuis le 1er janvier 2026, la campagne de rappel figure parmi les points vérifiés, au même titre que la plaque d'immatriculation ou le numéro de châssis. Le contrôleur consulte la base des constructeurs pour savoir si votre véhicule est concerné par un rappel que le constructeur a qualifié de grave.",
      },
      {
        type: "p",
        texte:
          "Le cas le plus sévère est celui des véhicules classés « stop drive ». La fiche officielle le définit comme une mesure de rappel urgent prise par le constructeur en raison d'un danger potentiellement mortel, qui demande au propriétaire de cesser de rouler — typiquement un airbag Takata non remplacé. Si le véhicule n'a pas été réparé, une défaillance critique est identifiée, une contre-visite doit être réalisée, et le véhicule ne peut plus circuler dès le lendemain.",
      },
      {
        type: "h2",
        texte: "Ce qu'il faut faire avant d'y aller",
      },
      {
        type: "liste",
        items: [
          "Vérifiez auprès de votre constructeur, avec votre numéro de châssis, si votre véhicule fait l'objet d'un rappel.",
          "S'il est concerné, faites faire la réparation avant le contrôle plutôt qu'après : vous éviterez la contre-visite et l'immobilisation.",
          "Ne découvrez pas un « stop drive » le jour du contrôle : vous repartiriez avec une interdiction de rouler dès le lendemain, et une contre-visite à passer.",
        ],
      },
      {
        type: "p",
        texte:
          "Pour la vente, rien ne change non plus : un véhicule de plus de quatre ans doit présenter un contrôle technique de moins de six mois au moment de la cession — ou de moins de deux mois s'il s'agit d'une contre-visite.",
      },
    ],
    sources: [
      {
        libelle:
          "Contrôle technique d'une voiture (catégorie M1) — service-public.gouv.fr, vérifié le 1er janvier 2026",
        url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2878",
      },
    ],
  },
  {
    slug: "malus-retroactif-occasion-nexiste-pas",
    titre: "Non, il n'y a pas de malus rétroactif sur les voitures d'occasion",
    chapo:
      "Plusieurs sites du secteur l'annoncent depuis l'automne. Le texte en vigueur dit l'inverse : acheter une occasion déjà immatriculée en France ne déclenche aucun malus, et l'article qui définit le fait générateur le dit noir sur blanc.",
    categorie: "Idées reçues",
    date: "2026-10-14",
    image: "/blog/malus-occasion.jpg",
    imageCredit: "Photo : Unsplash",
    corps: [
      {
        type: "p",
        texte:
          "Depuis l'automne, plusieurs sites d'immatriculation annoncent qu'à partir du 1er janvier 2026 un « malus rétroactif » frapperait la revente des véhicules qui n'avaient pas été taxés à leur première immatriculation. Nous sommes allés lire le texte qui fixe le moment où ces taxes sont dues, dans sa version applicable au 1er janvier 2026. Il ne contient rien de tel.",
      },
      {
        type: "h2",
        texte: "Ce que dit le texte en vigueur",
      },
      {
        type: "p",
        texte:
          "Les taxes à l'immatriculation — malus au CO2 et malus au poids — sont dues au moment que l'article L. 421-36 du code des impositions sur les biens et services appelle la « première immatriculation en France ». Cet article définit précisément ce que recouvre cette expression, et c'est là que tout se joue.",
      },
      {
        type: "p",
        texte:
          "Deux situations seulement sont visées. La première immatriculation en France d'un véhicule, d'abord. Ensuite, et à deux conditions qui doivent être réunies toutes les deux : que le véhicule n'ait pas été soumis à ces taxes lors de sa première immatriculation, ou l'ait été pour un montant nul, et que la nouvelle immatriculation résulte de la première modification qui le rend taxable pour un montant non nul.",
      },
      {
        type: "h2",
        texte: "Une modification du véhicule, pas un changement de propriétaire",
      },
      {
        type: "p",
        texte:
          "C'est le point que les articles alarmistes passent sous silence. Le second cas suppose une modification du véhicule lui-même — typiquement un utilitaire transformé en véhicule de tourisme, qui devient taxable alors qu'il ne l'était pas. Vendre sa voiture ne modifie rien au véhicule.",
      },
      {
        type: "p",
        texte:
          "Autrement dit : si vous achetez une occasion déjà immatriculée en France et que vous ne touchez pas à sa carrosserie ni à son genre, le changement de titulaire ne fait naître aucun malus. Vous payez la taxe régionale, la taxe fixe de 11 € et la redevance d'acheminement de 2,76 € — rien d'autre.",
      },
      {
        type: "h2",
        texte: "Les cas où un malus apparaît bien",
      },
      {
        type: "liste",
        items: [
          "Un véhicule importé, jamais immatriculé en France : sa première immatriculation française est le fait générateur, le malus est dû.",
          "Un véhicule transformé, qui devient taxable alors qu'il ne l'était pas : la taxe est due à l'immatriculation qui constate cette première modification.",
        ],
      },
      {
        type: "p",
        texte:
          "Dans tous les autres cas, et singulièrement pour la revente ordinaire d'une voiture française, il n'y a pas de malus. Si un prestataire vous en annonce un sur un changement de titulaire classique, demandez-lui sur quel texte il s'appuie.",
      },
    ],
    sources: [
      {
        libelle: "Article L. 421-36 du code des impositions sur les biens et services — Légifrance",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051202756/2026-01-01",
      },
      {
        libelle: "Code des impositions sur les biens et services — Légifrance",
        url: "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000044595989/",
      },
    ],
  },
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
