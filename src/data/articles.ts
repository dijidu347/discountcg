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
    slug: "fourriere-tarifs-octobre-2026",
    titre: "Fourrière : l'enlèvement passe à 135 € depuis le 1er octobre 2026, et chaque jour d'attente se paie",
    chapo:
      "Un arrêté du 13 septembre 2026 relève les plafonds des frais de fourrière pour les voitures : 135 € l'enlèvement, 7,15 € la journée de garde. Le montant n'est pas le vrai risque : au-delà de dix ou quinze jours sans réaction, le véhicule est vendu ou détruit.",
    categorie: "Tarifs",
    date: "2026-10-18",
    image: "/blog/fourriere-tarifs-octobre-2026.jpg",
    imageCredit: "Photo : Kevin.B, Wikimedia Commons, licence CC BY-SA 4.0",
    corps: [
      {
        type: "p",
        texte:
          "Les frais de fourrière ne sont pas libres : l'État fixe des montants maximaux, que la fourrière ne peut pas dépasser. Un arrêté du 13 septembre 2026, publié au Journal officiel du 22 septembre, les a relevés pour les voitures particulières. Les nouveaux plafonds s'appliquent depuis le 1er octobre 2026.",
      },
      {
        type: "h2",
        texte: "Le nouveau barème, hors Paris, Lyon, Marseille et Toulouse",
      },
      {
        type: "liste",
        items: [
          "Enlèvement : 135 €, au lieu de 127,65 €.",
          "Garde journalière : 7,15 €, au lieu de 6,75 €.",
          "Immobilisation matérielle (pose d'un sabot) : 7,60 €.",
          "Opérations préalables (dépanneuse sur place, véhicule pas encore enlevé) : 15,20 €.",
          "Mise en vente : 100 €.",
        ],
      },
      {
        type: "p",
        texte:
          "Les quatre plus grandes villes ont un barème à part. À Lyon, Marseille et Toulouse, l'enlèvement passe lui aussi à 135 €, mais la garde est plafonnée à 10 € par jour et la mise en vente à 61 €. À Paris, rien ne change : 150 € l'enlèvement, 29 € la journée de garde, 100 € la mise en vente.",
      },
      {
        type: "h2",
        texte: "Ce que coûte une voiture récupérée le jour même",
      },
      {
        type: "p",
        texte:
          "Service-public.gouv.fr compte l'enlèvement et une journée de garde pour un véhicule récupéré le jour même. Sur ce calcul, la facture maximale est de 142,15 € dans la plupart des communes (contre 134,40 € avant le 1er octobre), de 145 € à Lyon, Marseille et Toulouse, et de 179 € à Paris. S'ajoutent 7,60 € si un sabot a été posé. Chaque jour supplémentaire ajoute une journée de garde : 7,15 €, 10 € ou 29 € selon la ville.",
      },
      {
        type: "p",
        texte:
          "Ces montants sont des plafonds. Une fourrière peut facturer moins, jamais plus. Si la note dépasse le barème de votre ville, demandez sur quel poste porte l'écart.",
      },
      {
        type: "h2",
        texte: "Le vrai danger, c'est le délai",
      },
      {
        type: "p",
        texte:
          "Au-delà de trois jours, le véhicule est classé dans l'une de deux catégories. S'il est à remettre au service des Domaines, il est considéré comme abandonné quinze jours après la notification de mise en fourrière. S'il est classé à détruire, après estimation de sa valeur marchande, le délai tombe à dix jours. Passé ce délai, il est vendu ou envoyé en centre VHU pour destruction.",
      },
      {
        type: "p",
        texte:
          "Si vous êtes absent plusieurs jours, la notification vous parvient par lettre recommandée avec accusé de réception, envoyée dans les cinq jours ouvrables qui suivent la mise en fourrière. Elle indique la fourrière, le motif, le classement du véhicule et le délai pour le retirer. Une lettre recommandée qui attend au bureau de poste fait donc courir un délai qui peut coûter la voiture.",
      },
      {
        type: "h2",
        texte: "Récupérer sa voiture : les bons réflexes",
      },
      {
        type: "liste",
        items: [
          "Si la dépanneuse est là mais que l'enlèvement n'a pas commencé, vous pouvez repartir avec la voiture en réglant les 15,20 € d'opérations préalables. L'enlèvement commence dès que deux roues ont quitté le sol ou que le véhicule a commencé à être déplacé : il faut alors payer l'enlèvement, ou s'engager par écrit à le payer, et libérer la voie.",
          "Le service en ligne de service-public.gouv.fr permet, avec le numéro d'immatriculation, de savoir si la voiture est en fourrière, de consulter le dossier et d'obtenir l'autorisation de sortie (la mainlevée) sans passer au commissariat. Toutes les fourrières n'y sont pas encore reliées, et l'enregistrement peut prendre du retard sur l'enlèvement : si la recherche échoue, recommencez plus tard ou adressez-vous au commissariat ou à la gendarmerie du lieu de stationnement.",
          "Sans le service en ligne, la mainlevée se demande aux forces de l'ordre qui ont prescrit la mise en fourrière, sur présentation de l'attestation d'assurance, d'un permis de conduire valide et du certificat d'immatriculation s'il ne vous a pas été retiré.",
          "Les frais se règlent ensuite au gardien de la fourrière, qui ne rend le véhicule qu'une fois payé.",
        ],
      },
      {
        type: "h2",
        texte: "Vérifiez l'état de la voiture avant de partir",
      },
      {
        type: "p",
        texte:
          "Avant l'enlèvement, une fiche descriptive du véhicule est établie, et vous pouvez en obtenir une copie. À la restitution, l'état de la voiture doit lui correspondre. Si elle a été abîmée pendant le chargement ou la garde, adressez une réclamation par lettre recommandée avec accusé de réception à l'autorité de fourrière — la commune ou la préfecture — avec la fiche descriptive et des photos. En cas de refus, le recours se porte devant le tribunal administratif du lieu de l'enlèvement.",
      },
      {
        type: "h2",
        texte: "Contester la mise en fourrière",
      },
      {
        type: "p",
        texte:
          "La notification indique à qui adresser le recours : le procureur de la République ou le préfet du lieu de l'enlèvement. L'autorité confirme la mise en fourrière ou ordonne la mainlevée dans les cinq jours ouvrables. Pour obtenir l'annulation, il faut saisir en parallèle le tribunal judiciaire du lieu de l'enlèvement ; si le juge annule la procédure, les frais peuvent être remboursés par l'autorité de fourrière.",
      },
      {
        type: "h2",
        texte: "Un contrôle technique dépassé peut aussi y mener",
      },
      {
        type: "p",
        texte:
          "La fourrière ne sanctionne pas que le stationnement gênant. Parmi les motifs recensés par service-public.gouv.fr figure le non-respect des obligations liées au contrôle technique. Une échéance oubliée ne se règle donc pas toujours par une amende : elle peut aussi finir sur un plateau.",
      },
      {
        type: "h2",
        texte: "Et l'an prochain ?",
      },
      {
        type: "p",
        texte:
          "À partir de 2027, les plafonds seront revus chaque année en fonction du tarif d'enlèvement et de l'évolution du coût des carburants, de la main-d'œuvre, des assurances et des véhicules.",
      },
    ],
    sources: [
      {
        libelle: "Fourrières : les nouveaux tarifs au 1er octobre 2026 — service-public.gouv.fr, 22 septembre 2026",
        url: "https://www.service-public.gouv.fr/particuliers/actualites/A14227",
      },
      {
        libelle: "Mise en fourrière du véhicule — service-public.gouv.fr, vérifié le 1er octobre 2026",
        url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F12918",
      },
      {
        libelle: "Arrêté du 13 septembre 2026 relatif aux tarifs maxima des frais de fourrière — Légifrance",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054877184",
      },
    ],
  },
  {
    slug: "malus-au-poids-2026-seuil-1500-kg",
    titre: "Malus au poids 2026 : le seuil descend à 1 500 kg, et non, les électriques n'y sont pas soumises",
    chapo:
      "Depuis le 1er janvier 2026, la taxe sur la masse en ordre de marche se déclenche dès 1 500 kg, contre 1 600 kg l'an dernier. Les véhicules 100 % électriques en restent exonérés, contrairement à ce qu'annoncent plusieurs sites.",
    categorie: "Tarifs",
    date: "2026-10-17",
    image: "/blog/malus-au-poids-2026.jpg",
    imageCredit: "Photo : Unsplash",
    corps: [
      {
        type: "p",
        texte:
          "La taxe sur la masse en ordre de marche — le « malus au poids » — se paie une fois, à l'immatriculation, et s'ajoute au prix de la carte grise. En 2024 et 2025, elle visait les véhicules de plus de 1,6 tonne. Depuis le 1er janvier 2026, le seuil est descendu de cent kilos : elle commence à 1 500 kg.",
      },
      {
        type: "p",
        texte:
          "Cent kilos, sur le papier, ce n'est pas grand-chose. Dans les faits, c'est la différence entre une berline familiale épargnée et une berline familiale taxée : beaucoup de modèles courants pèsent entre 1 500 et 1 600 kg à vide.",
      },
      {
        type: "h2",
        texte: "Le barème, tranche par tranche",
      },
      {
        type: "liste",
        items: [
          "Jusqu'à 1 499 kg : rien.",
          "De 1 500 à 1 699 kg : 10 € par kilo.",
          "De 1 700 à 1 799 kg : 15 € par kilo.",
          "De 1 800 à 1 899 kg : 20 € par kilo.",
          "De 1 900 à 1 999 kg : 25 € par kilo.",
          "À partir de 2 000 kg : 30 € par kilo.",
        ],
      },
      {
        type: "p",
        texte:
          "Le calcul se fait tranche par tranche, et non en appliquant un seul tarif à toute la masse. Pour un véhicule de 1 950 kg : 200 kg à 10 €, soit 2 000 €, puis 100 kg à 15 €, soit 1 500 €, puis 100 kg à 20 €, soit 2 000 €, puis 51 kg à 25 €, soit 1 275 €. Total : 6 775 €, à ajouter au prix du certificat d'immatriculation.",
      },
      {
        type: "h2",
        texte: "Non, les électriques ne sont pas concernées",
      },
      {
        type: "p",
        texte:
          "Plusieurs sites ont écrit cette année que le malus au poids s'étendait désormais aux véhicules électriques. C'est faux. La fiche de service-public.gouv.fr est explicite : un véhicule dont la source d'énergie est exclusivement l'électricité est exonéré de la taxe sur la masse en ordre de marche. L'exonération se détermine à la date de première immatriculation.",
      },
      {
        type: "p",
        texte:
          "C'est le genre d'erreur qui circule vite parce qu'elle est plausible : le seuil a bien baissé, et les véhicules électriques sont bien lourds. Les deux faits sont vrais, la conclusion ne l'est pas.",
      },
      {
        type: "h2",
        texte: "Les hybrides ont droit à un abattement",
      },
      {
        type: "liste",
        items: [
          "Hybride rechargeable dont l'autonomie électrique en ville dépasse 50 km : 200 kg retirés de la masse, dans la limite de 15 % de celle-ci.",
          "Hybride non rechargeable à moteur électrique de 30 kW ou plus : 100 kg retirés.",
          "Micro-hybride de moins de 30 kW : 100 kg retirés.",
        ],
      },
      {
        type: "p",
        texte:
          "L'abattement se soustrait avant d'appliquer le barème. Un hybride rechargeable de 1 650 kg redescend ainsi à 1 450 kg et sort de la taxe.",
      },
      {
        type: "h2",
        texte: "C'est l'année de première immatriculation qui compte",
      },
      {
        type: "p",
        texte:
          "Le barème retenu est celui de l'année de première immatriculation du véhicule, et non celui de l'année de la commande ou de l'achat. Un véhicule commandé en 2025 mais immatriculé en 2026 relève donc du seuil de 1 500 kg. C'est un point à vérifier avant de signer, quand la livraison est annoncée à cheval sur deux années.",
      },
      {
        type: "h2",
        texte: "Qui en est exonéré",
      },
      {
        type: "p",
        texte:
          "Au-delà des véhicules électriques : les véhicules accessibles en fauteuil roulant, et ceux acquis par une personne titulaire d'une carte mobilité inclusion portant la mention « invalidité » ou d'une carte d'invalidité militaire — dans la limite d'un véhicule par bénéficiaire. La règle vaut aussi lorsque c'est un enfant mineur ou à charge du foyer fiscal qui détient la carte. Les foyers ayant au moins trois enfants à charge bénéficient d'une réduction, qui se demande séparément.",
      },
      {
        type: "h2",
        texte: "Et le malus CO2 ?",
      },
      {
        type: "p",
        texte:
          "C'est une taxe distincte, qui se cumule avec celle-ci. Au 1er janvier 2026, son seuil de déclenchement est descendu de 5 g pour s'établir à 108 g de CO2 par kilomètre, et son montant maximal atteint 80 000 € à partir de 192 g. Un véhicule lourd et émetteur peut donc être frappé deux fois.",
      },
    ],
    sources: [
      {
        libelle: "Taxe sur la masse en ordre de marche — service-public.gouv.fr",
        url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F35950",
      },
      {
        libelle: "Fiscalité environnementale relative aux véhicules — ministère de la Transition écologique",
        url: "https://www.ecologie.gouv.fr/politiques-publiques/fiscalite-environnementale-relative-aux-vehicules",
      },
      {
        libelle: "Réduction pour famille nombreuse — service-public.gouv.fr",
        url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F35951",
      },
    ],
  },
  {
    slug: "zfe-toujours-en-vigueur-2026",
    titre: "Les ZFE n'ont pas été supprimées : ce que dit vraiment la décision du Conseil constitutionnel",
    chapo:
      "Le Parlement avait voté leur suppression. Le Conseil constitutionnel, saisi le 21 avril 2026, l'a annulée un mois plus tard — mais sur la forme, pas sur le fond. Les zones à faibles émissions continuent donc de s'appliquer, et votre vignette Crit'Air reste nécessaire.",
    categorie: "Idées reçues",
    date: "2026-10-16",
    image: "/blog/zfe-2026.jpg",
    imageCredit: "Photo : Unsplash",
    corps: [
      {
        type: "p",
        texte:
          "Beaucoup d'automobilistes ont retenu que les zones à faibles émissions étaient supprimées. C'est faux, et le malentendu est compréhensible : la suppression a bel et bien été votée, puis annulée un mois plus tard. Nous avons lu la décision.",
      },
      {
        type: "h2",
        texte: "Ce que le Conseil constitutionnel a jugé",
      },
      {
        type: "p",
        texte:
          "Dans sa décision n° 2026-903 DC du 21 mai 2026, le Conseil s'est prononcé sur la loi de simplification de la vie économique. Son article 37 abrogeait les articles L. 2213-4-1 et L. 2213-4-2 du code général des collectivités territoriales, c'est-à-dire la faculté ou l'obligation, pour certaines collectivités, de mettre en place une zone à faibles émissions.",
      },
      {
        type: "p",
        texte:
          "Le Conseil a relevé que ces dispositions, introduites par amendement en première lecture, n'avaient « pas de lien, même indirect » avec le projet de loi initial — lequel portait sur les frais de clôture de comptes bancaires professionnels et sur la résiliation de contrats d'assurance. Il en conclut que l'article 37 « a été adopté selon une procédure contraire à la Constitution ».",
      },
      {
        type: "h2",
        texte: "Le point que presque personne ne relève",
      },
      {
        type: "p",
        texte:
          "La décision précise, noir sur blanc, que le Conseil statue « sans préjuger de la conformité du contenu de ces dispositions aux autres exigences constitutionnelles ». Autrement dit : il n'a pas dit que supprimer les ZFE serait contraire à la Constitution. Il a dit que ce n'était pas la bonne loi pour le faire.",
      },
      {
        type: "p",
        texte:
          "La conséquence est double. Les ZFE restent en vigueur aujourd'hui. Et rien n'interdit qu'une suppression revienne dans un texte où elle aurait sa place. Il faut donc suivre le sujet, sans croire qu'il est clos dans un sens ou dans l'autre.",
      },
      {
        type: "h2",
        texte: "Ce que ça change pour vous",
      },
      {
        type: "liste",
        items: [
          "La vignette Crit'Air reste nécessaire pour circuler dans une ZFE, et les règles d'accès dépendent de chaque collectivité.",
          "Chaque ville fixe son propre calendrier et ses propres catégories autorisées : vérifiez celle qui vous concerne, pas une règle nationale qui n'existe pas.",
          "Commandez votre vignette uniquement sur le site officiel du gouvernement. Bison Futé met explicitement en garde contre les intermédiaires et les sites frauduleux.",
        ],
      },
      {
        type: "p",
        texte:
          "Ce dernier point mérite qu'on s'y arrête. Les faux sites de vignette Crit'Air fonctionnent exactement comme les faux sites de carte grise : une page qui ressemble à l'administration, un tarif gonflé, et un document qui n'arrive jamais ou qui ne vaut rien. La règle est la même dans les deux cas — vérifiez toujours à qui vous payez.",
      },
    ],
    sources: [
      {
        libelle: "Décision n° 2026-903 DC du 21 mai 2026 — Conseil constitutionnel",
        url: "https://www.conseil-constitutionnel.fr/decision/2026/2026903DC.htm",
      },
      {
        libelle: "Zones à faibles émissions mobilité — Bison Futé (ministère chargé des transports)",
        url: "https://www.bison-fute.gouv.fr/zones-a-faibles-emissions-mobilite.html",
      },
    ],
  },
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
          "L'article 11 de l'arrêté laissait aux professionnels déjà habilités jusqu'au 1er août 2026 pour se mettre en conformité. Son II repousse au 1er octobre 2026 le seul 4° du II des articles 18-2 et 18-4 : les trois ans d'ancienneté pour l'entreprise, et les deux cents opérations pour l'établissement. Passé ces dates, l'habilitation est retirée de plein droit — sans décision à notifier, sans recours à exercer.",
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
