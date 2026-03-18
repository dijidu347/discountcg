export interface DemarcheConfig {
  code: string;
  slug: string;
  title: string;
  shortTitle: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  icon: string;
  description: string;
  longDescription: string;
  documents: string[];
  delai: string;
  steps: string[];
  prixDescription: string;
  faqs: { question: string; answer: string }[];
  keywords: string[];
}

export const demarchesConfig: DemarcheConfig[] = [
  {
    code: "CG",
    slug: "carte-grise",
    title: "Carte Grise",
    shortTitle: "Carte grise",
    h1: "Carte Grise en Ligne - Changement de Titulaire",
    metaTitle: "Carte Grise en Ligne Pas Chère | Service Agréé 24h",
    metaDescription: "Commandez votre carte grise en ligne au meilleur prix. Traitement sous 24h, service agréé par l'État. Simulez le coût et lancez votre démarche.",
    icon: "CreditCard",
    description: "Changement de titulaire suite à l'achat d'un véhicule d'occasion",
    longDescription: "Le changement de titulaire de la carte grise (certificat d'immatriculation) est obligatoire lors de l'achat d'un véhicule d'occasion. Cette démarche doit être effectuée dans les 30 jours suivant l'achat. Avec Discount Carte Grise, faites votre demande 100% en ligne et obtenez votre carte grise pas chère, avec un traitement sous 24h.",
    documents: [
      "Carte grise originale barrée et signée par l'ancien propriétaire",
      "Cerfa 13750 (demande d'immatriculation)",
      "Cerfa 15776 (déclaration de cession)",
      "Pièce d'identité en cours de validité",
      "Justificatif de domicile de moins de 6 mois",
      "Contrôle technique de moins de 6 mois (véhicules de plus de 4 ans)",
      "Permis de conduire",
    ],
    delai: "24h maximum",
    steps: [
      "Simulez le prix de votre carte grise en renseignant votre immatriculation",
      "Envoyez vos documents en ligne de manière sécurisée",
      "Recevez votre carte grise par courrier recommandé",
    ],
    faqs: [
      {
        question: "Quel est le prix d'une carte grise en 2026 ?",
        answer: "Le prix de la carte grise dépend de la puissance fiscale du véhicule et du tarif du cheval fiscal de votre région. En 2026, le tarif varie de 30 euros (Mayotte) à 68,95 euros (Île-de-France) par cheval fiscal. À cela s'ajoutent la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros) et nos frais de dossier (30 euros). Chez Discount Carte Grise, nous vous proposons le meilleur prix pour votre carte grise en ligne.",
      },
      {
        question: "Combien de temps pour recevoir sa carte grise ?",
        answer: "Avec Discount Carte Grise, votre dossier est traité sous 24h maximum. Vous recevez un Certificat Provisoire d'Immatriculation (CPI) immédiatement par email, puis votre carte grise définitive par courrier recommandé sous 3 à 5 jours ouvrables.",
      },
      {
        question: "Peut-on rouler sans carte grise ?",
        answer: "Non, rouler sans carte grise est passible d'une amende de 135 euros. Cependant, le CPI (Certificat Provisoire d'Immatriculation) vous permet de circuler pendant 1 mois en attendant de recevoir votre carte grise définitive.",
      },
      {
        question: "La carte grise est-elle obligatoire ?",
        answer: "Oui, tout véhicule motorisé circulant sur la voie publique doit posséder un certificat d'immatriculation (carte grise) au nom de son propriétaire. Le délai pour faire la démarche est de 30 jours après l'achat.",
      },
      {
        question: "Comment faire ma carte grise en ligne ?",
        answer: "Faire sa carte grise en ligne est simple : utilisez notre simulateur gratuit pour connaître le prix exact, envoyez vos documents via notre plateforme sécurisée, et recevez votre carte grise par courrier. Depuis 2017, il n'est plus possible de faire sa carte grise en préfecture — la démarche se fait exclusivement en ligne via l'ANTS ou un professionnel agréé comme Discount Carte Grise.",
      },
      {
        question: "Quels documents faut-il pour faire une carte grise ?",
        answer: "Pour un changement de titulaire, il vous faut : la carte grise barrée par l'ancien propriétaire, le Cerfa 13750, le Cerfa 15776, une pièce d'identité, un justificatif de domicile, le contrôle technique (si véhicule de plus de 4 ans) et le permis de conduire.",
      },
    ],
    prixDescription: "Le tarif de votre carte grise dépend de la puissance fiscale du véhicule et du prix du cheval fiscal dans votre département de résidence. À cela s'ajoutent la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros), la taxe CO2 pour les véhicules polluants et nos frais de dossier à partir de 30 euros. Discount Carte Grise vous garantit une carte grise pas chère avec le meilleur prix du marché. Utilisez notre simulateur pour obtenir le prix exact.",
    keywords: ["carte grise en ligne", "prix carte grise", "changement titulaire", "carte grise pas cher", "carte grise meilleur prix", "faire sa carte grise", "faire ma carte grise", "simulateur gratuit carte grise"],
  },
  {
    code: "DC",
    slug: "declaration-cession",
    title: "Déclaration de Cession",
    shortTitle: "déclaration de cession",
    h1: "Déclaration de Cession de Véhicule en Ligne",
    metaTitle: "Déclaration de Cession Véhicule en Ligne | Cerfa 15776",
    metaDescription: "Effectuez votre déclaration de cession en ligne en quelques minutes. Cerfa 15776 rempli automatiquement, code de cession immédiat. Dès 19,90 euros. Service rapide et pas cher.",
    icon: "FileText",
    description: "Déclarez la vente de votre véhicule en toute simplicité",
    longDescription: "La déclaration de cession est obligatoire lors de la vente ou du don d'un véhicule. Elle protège le vendeur en cas d'infraction commise par l'acheteur après la vente. Avec Discount Carte Grise, effectuez votre déclaration en quelques minutes.",
    documents: [
      "Carte grise du véhicule",
      "Pièce d'identité du vendeur",
      "Coordonnées de l'acheteur",
    ],
    delai: "Immédiat",
    steps: [
      "Renseignez les informations du véhicule et de l'acheteur",
      "Vérifiez et validez votre déclaration",
      "Recevez votre code de cession immédiatement",
    ],
    faqs: [
      {
        question: "La déclaration de cession est-elle obligatoire ?",
        answer: "Oui, le vendeur doit déclarer la cession dans les 15 jours suivant la vente. Sans cette déclaration, le vendeur reste responsable des infractions commises avec le véhicule.",
      },
      {
        question: "Qu'est-ce que le Cerfa 15776 ?",
        answer: "Le Cerfa 15776 est le formulaire officiel de déclaration de cession d'un véhicule. Il doit être rempli en 3 exemplaires : un pour le vendeur, un pour l'acheteur et un pour la préfecture.",
      },
      {
        question: "Comment remplir une déclaration de cession ?",
        answer: "Avec Discount Carte Grise, vous n'avez qu'à renseigner les informations du véhicule et de l'acheteur. Nous remplissons automatiquement le Cerfa 15776 pour vous.",
      },
      {
        question: "Combien coûte une déclaration de cession ?",
        answer: "Notre service de déclaration de cession est à partir de 19,90 euros. Le traitement est immédiat et vous recevez votre code de cession par email.",
      },
    ],
    prixDescription: "La déclaration de cession est proposée à un tarif forfaitaire à partir de 19,90 euros. Ce prix inclut le remplissage automatique du Cerfa 15776, la transmission à l'administration et l'envoi du code de cession. Aucun frais caché ni taxe supplémentaire.",
    keywords: ["déclaration de cession", "vente véhicule", "cerfa 15776", "déclaration vente voiture", "déclaration cession pas cher"],
  },
  {
    code: "DA",
    slug: "declaration-achat",
    title: "Déclaration d'Achat",
    shortTitle: "déclaration d'achat",
    h1: "Déclaration d'Achat de Véhicule d'Occasion",
    metaTitle: "Déclaration d'Achat Véhicule | Pro Auto en Ligne",
    metaDescription: "Déclarez l'achat d'un véhicule d'occasion en ligne. Service dédié aux professionnels de l'automobile, traitement immédiat. Faites votre demande dès 19,90 euros.",
    icon: "ShoppingCart",
    description: "Déclarez l'achat d'un véhicule d'occasion",
    longDescription: "La déclaration d'achat est une démarche obligatoire pour les professionnels de l'automobile qui achètent un véhicule d'occasion. Elle permet de notifier l'administration du changement de détention du véhicule.",
    documents: [
      "Carte grise du véhicule",
      "Pièce d'identité du professionnel",
      "Justificatif professionnel (Kbis, carte pro)",
    ],
    delai: "Immédiat",
    steps: [
      "Renseignez les informations du véhicule",
      "Envoyez les documents requis",
      "Recevez votre accusé de réception",
    ],
    faqs: [
      {
        question: "Qui doit faire une déclaration d'achat ?",
        answer: "La déclaration d'achat est principalement destinée aux professionnels de l'automobile (garagistes, concessionnaires) qui achètent des véhicules d'occasion.",
      },
      {
        question: "Quel est le délai pour faire une déclaration d'achat ?",
        answer: "La déclaration d'achat doit être effectuée dans les 15 jours suivant l'achat du véhicule.",
      },
    ],
    prixDescription: "La déclaration d'achat est proposée à un tarif forfaitaire à partir de 19,90 euros. Ce prix inclut la gestion complète de la déclaration auprès de l'administration et l'envoi de l'accusé de réception. Pas de taxe régionale ni de frais supplémentaires.",
    keywords: ["déclaration achat véhicule", "achat voiture occasion professionnel", "déclaration achat pas cher"],
  },
  {
    code: "CHGT_ADRESSE",
    slug: "changement-adresse-carte-grise",
    title: "Changement d'Adresse",
    shortTitle: "changement d'adresse",
    h1: "Changement d'Adresse sur la Carte Grise",
    metaTitle: "Changement d'Adresse Carte Grise | Démarche en Ligne",
    metaDescription: "Mettez à jour l'adresse de votre carte grise après un déménagement. Démarche obligatoire sous 30 jours, traitement rapide et pas cher. Lancez votre demande en ligne.",
    icon: "MapPin",
    description: "Mettez à jour votre adresse sur votre carte grise après un déménagement",
    longDescription: "Le changement d'adresse sur la carte grise est obligatoire dans le mois suivant un déménagement. Cette démarche est gratuite les 3 premières fois sur le site de l'ANTS, mais peut s'avérer complexe. Discount Carte Grise vous simplifie la procédure.",
    documents: [
      "Carte grise actuelle",
      "Justificatif de domicile de moins de 6 mois",
      "Pièce d'identité",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez votre nouvelle adresse",
      "Envoyez votre justificatif de domicile",
      "Recevez votre nouvelle étiquette ou carte grise",
    ],
    faqs: [
      {
        question: "Le changement d'adresse carte grise est-il obligatoire ?",
        answer: "Oui, vous disposez d'un délai de 30 jours après votre déménagement pour mettre à jour l'adresse de votre carte grise. Le non-respect de cette obligation est passible d'une amende de 135 euros.",
      },
      {
        question: "Le changement d'adresse est-il gratuit ?",
        answer: "Le changement d'adresse sur l'ANTS est gratuit les 3 premières fois. Au-delà, ou si vous souhaitez un service simplifié et rapide, Discount Carte Grise peut s'en occuper pour vous.",
      },
      {
        question: "Reçoit-on une nouvelle carte grise ?",
        answer: "Pour les 3 premiers changements, vous recevez une étiquette autocollante à apposer sur votre carte grise. Au-delà, une nouvelle carte grise est éditée avec la nouvelle adresse.",
      },
    ],
    prixDescription: "Le changement d'adresse est gratuit les 3 premières fois sur le site de l'ANTS. Au-delà, une nouvelle carte grise est éditée avec la taxe fixe de 11 euros et la redevance d'acheminement de 2,76 euros. Nos frais de dossier s'ajoutent pour un traitement simplifié et rapide.",
    keywords: ["changement adresse carte grise", "déménagement carte grise", "modifier adresse certificat immatriculation", "changement adresse carte grise pas cher"],
  },
  {
    code: "DUPLICATA",
    slug: "duplicata-carte-grise",
    title: "Duplicata de Carte Grise",
    shortTitle: "demande de duplicata",
    h1: "Duplicata de Carte Grise - Perte, Vol ou Détérioration",
    metaTitle: "Duplicata Carte Grise | Perte, Vol ou Détérioration",
    metaDescription: "Obtenez un duplicata de carte grise en cas de perte, vol ou détérioration. Traitement sous 24h, service agréé. Commandez votre duplicata en ligne.",
    icon: "Copy",
    description: "Obtenez un duplicata en cas de perte, vol ou détérioration",
    longDescription: "En cas de perte, vol ou détérioration de votre carte grise, vous devez demander un duplicata. Cette démarche vous permet d'obtenir un nouveau certificat d'immatriculation identique à l'original.",
    documents: [
      "Pièce d'identité",
      "Justificatif de domicile",
      "Déclaration de perte ou récépissé de dépôt de plainte (en cas de vol)",
    ],
    delai: "24h maximum",
    steps: [
      "Déclarez la perte ou le vol de votre carte grise",
      "Envoyez les documents justificatifs",
      "Recevez votre duplicata par courrier recommandé",
    ],
    faqs: [
      {
        question: "Combien coûte un duplicata de carte grise ?",
        answer: "Le coût d'un duplicata correspond à la taxe fixe de 11 euros + la redevance d'acheminement de 2,76 euros + nos frais de dossier. Pas de taxe régionale à payer.",
      },
      {
        question: "Quel délai pour recevoir un duplicata ?",
        answer: "Avec Discount Carte Grise, votre demande est traitée sous 24h. Vous recevez un CPI par email immédiatement et le duplicata par courrier sous 3 à 5 jours.",
      },
    ],
    prixDescription: "Le duplicata de carte grise est soumis à la taxe fixe de 11 euros et à la redevance d'acheminement de 2,76 euros. Aucune taxe régionale n'est due. Nos frais de dossier couvrent la gestion complète de votre demande. Pas de frais cachés.",
    keywords: ["duplicata carte grise", "carte grise perdue", "refaire carte grise", "vol carte grise", "duplicata carte grise pas cher"],
  },
  {
    code: "CG_NEUF",
    slug: "carte-grise-vehicule-neuf",
    title: "Carte Grise Véhicule Neuf",
    shortTitle: "carte grise véhicule neuf",
    h1: "Carte Grise pour Véhicule Neuf - Première Immatriculation",
    metaTitle: "Carte Grise Véhicule Neuf | Immatriculation en Ligne",
    metaDescription: "Faites la première immatriculation de votre véhicule neuf en ligne. Service agréé, traitement sous 24h, CPI immédiat. Lancez votre démarche maintenant.",
    icon: "Car",
    description: "Première immatriculation d'un véhicule neuf",
    longDescription: "L'immatriculation d'un véhicule neuf est la première étape obligatoire pour pouvoir circuler légalement sur la voie publique. Que vous ayez acheté votre véhicule chez un concessionnaire ou en import direct, la demande de certificat d'immatriculation doit être effectuée avant la mise en circulation.\n\nLe concessionnaire peut se charger de cette démarche, mais vous êtes également libre de la réaliser vous-même ou de la confier à un professionnel agréé comme Discount Carte Grise pour obtenir votre carte grise au meilleur prix. Le prix de la carte grise pour un véhicule neuf dépend de la puissance fiscale, du taux de CO2 et de votre département de résidence.\n\nUn Certificat Provisoire d'Immatriculation (CPI) vous est délivré pour circuler en attendant la carte grise définitive. Ce document est valable un mois et doit être conservé à bord du véhicule.",
    documents: [
      "Certificat de conformité européen",
      "Facture d'achat du véhicule",
      "Pièce d'identité",
      "Justificatif de domicile",
      "Permis de conduire",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez les informations de votre véhicule neuf",
      "Envoyez les documents requis",
      "Recevez votre carte grise et vos plaques",
    ],
    prixDescription: "Le prix de la carte grise d'un véhicule neuf dépend de la puissance fiscale, du tarif du cheval fiscal dans votre département et du taux d'émission de CO2. La taxe sur les émissions polluantes (malus écologique) peut s'ajouter pour les véhicules dépassant un certain seuil de CO2. Nos frais de dossier sont à partir de 30 euros.",
    faqs: [
      {
        question: "Peut-on immatriculer un véhicule neuf en ligne ?",
        answer: "Oui, l'immatriculation d'un véhicule neuf peut être effectuée 100% en ligne via un service agréé comme Discount Carte Grise. Le concessionnaire peut aussi s'en charger, mais notre service propose une carte grise pas chère avec des tarifs parmi les plus compétitifs du marché.",
      },
      {
        question: "Qu'est-ce que le certificat de conformité européen (COC) ?",
        answer: "Le certificat de conformité européen (COC) est un document délivré par le constructeur attestant que le véhicule est conforme aux normes européennes. Il est indispensable pour toute première immatriculation. Le concessionnaire vous le fournit avec le véhicule neuf.",
      },
      {
        question: "Quel est le prix d'une carte grise pour un véhicule neuf ?",
        answer: "Le prix dépend de la puissance fiscale du véhicule, du tarif du cheval fiscal de votre région et du taux d'émission de CO2. Un malus écologique peut s'appliquer pour les véhicules les plus polluants. Utilisez notre simulateur pour obtenir le tarif exact.",
      },
      {
        question: "Peut-on rouler avec un véhicule neuf sans carte grise ?",
        answer: "Non, vous ne pouvez pas circuler sans immatriculation. Cependant, un CPI (Certificat Provisoire d'Immatriculation) vous est délivré immédiatement et vous autorise à rouler pendant un mois en attendant la carte grise définitive.",
      },
    ],
    keywords: ["carte grise véhicule neuf", "première immatriculation", "immatriculer voiture neuve", "carte grise neuf pas cher"],
  },
  {
    code: "SUCCESSION",
    slug: "succession-carte-grise",
    title: "Carte Grise Succession",
    shortTitle: "carte grise succession",
    h1: "Carte Grise suite à un Décès - Succession et Héritage",
    metaTitle: "Carte Grise Succession | Transfert après Décès",
    metaDescription: "Transférez la carte grise d'un véhicule hérité après un décès. Démarche simplifiée pour les héritiers, service agréé. Faites votre demande en ligne.",
    icon: "Users",
    description: "Transfert de carte grise suite à un décès",
    longDescription: "Lorsqu'un propriétaire de véhicule décède, les héritiers doivent effectuer le changement de titulaire de la carte grise. Cette démarche nécessite des documents spécifiques liés à la succession.",
    documents: [
      "Carte grise du véhicule",
      "Acte de décès",
      "Attestation notariale ou certificat d'hérédité",
      "Pièce d'identité de l'héritier",
      "Justificatif de domicile",
    ],
    delai: "24 à 48h",
    steps: [
      "Rassemblez les documents de succession",
      "Envoyez votre dossier en ligne",
      "Recevez la nouvelle carte grise au nom de l'héritier",
    ],
    faqs: [
      {
        question: "Quels documents pour une carte grise suite à un décès ?",
        answer: "Il vous faut l'acte de décès, la carte grise du véhicule, une attestation notariale ou certificat d'hérédité, votre pièce d'identité et un justificatif de domicile.",
      },
      {
        question: "Combien de temps pour transférer une carte grise après un décès ?",
        answer: "Il n'y a pas de délai légal strict, mais il est recommandé d'effectuer la démarche rapidement pour pouvoir utiliser le véhicule légalement.",
      },
    ],
    prixDescription: "Le prix de la carte grise en cas de succession dépend de la puissance fiscale du véhicule et du tarif du cheval fiscal de votre département. Les mêmes taxes s'appliquent que pour un changement de titulaire classique : taxe régionale, taxe fixe (11 euros), redevance d'acheminement (2,76 euros) et nos frais de dossier.",
    keywords: ["carte grise succession", "carte grise décès", "héritage véhicule", "transfert carte grise héritier", "carte grise succession pas cher"],
  },
  {
    code: "QUITUS_FISCAL",
    slug: "quitus-fiscal",
    title: "Quitus Fiscal",
    shortTitle: "demande de quitus fiscal",
    h1: "Quitus Fiscal pour Véhicule Importé - Certificat Fiscal",
    metaTitle: "Quitus Fiscal Véhicule Importé | Certificat 846A",
    metaDescription: "Obtenez votre quitus fiscal (certificat 846A) pour immatriculer un véhicule importé. Demande gérée de A à Z, traitement rapide. Faites votre demande en ligne.",
    icon: "FileCheck",
    description: "Certificat fiscal obligatoire pour les véhicules importés",
    longDescription: "Le quitus fiscal (certificat fiscal 846A) est un document obligatoire pour immatriculer en France un véhicule acheté à l'étranger. Il atteste que la TVA a bien été acquittée ou que le véhicule en est exonéré.",
    documents: [
      "Facture d'achat du véhicule",
      "Carte grise étrangère",
      "Pièce d'identité",
      "Justificatif de domicile",
      "Certificat de conformité",
    ],
    delai: "24 à 72h",
    steps: [
      "Envoyez la facture et la carte grise étrangère",
      "Nous effectuons la demande auprès des services fiscaux",
      "Recevez votre quitus fiscal par email",
    ],
    faqs: [
      {
        question: "Qu'est-ce qu'un quitus fiscal ?",
        answer: "Le quitus fiscal (formulaire 846A) est un certificat délivré par l'administration fiscale attestant que la TVA a été payée ou que le véhicule en est exonéré. Il est indispensable pour immatriculer un véhicule importé.",
      },
      {
        question: "Le quitus fiscal est-il payant ?",
        answer: "La demande de quitus fiscal auprès de l'administration est gratuite. Nos frais de dossier couvrent la gestion et l'envoi de votre demande.",
      },
    ],
    prixDescription: "La demande de quitus fiscal auprès de l'administration fiscale est gratuite. Nos frais de dossier couvrent la constitution du dossier, la transmission aux services fiscaux et le suivi de votre demande. Aucune taxe supplémentaire ne s'applique pour l'obtention du quitus.",
    keywords: ["quitus fiscal", "certificat fiscal 846A", "véhicule importé France", "TVA véhicule occasion étranger", "quitus fiscal pas cher"],
  },
  {
    code: "CPI_WW",
    slug: "carte-grise-import",
    title: "Immatriculation Véhicule Importé",
    shortTitle: "carte grise import",
    h1: "Carte Grise Véhicule Importé - Immatriculation en France",
    metaTitle: "Carte Grise Véhicule Importé | Immatriculation France",
    metaDescription: "Immatriculez votre véhicule importé en France : quitus fiscal, conformité et carte grise gérés pour vous. Service agréé, démarche 100% en ligne.",
    icon: "Globe",
    description: "Immatriculation d'un véhicule acheté à l'étranger",
    longDescription: "Importer un véhicule de l'étranger nécessite plusieurs démarches administratives : obtenir un quitus fiscal auprès des services fiscaux, un certificat de conformité européen (COC) auprès du constructeur et faire la demande de carte grise française. Discount Carte Grise gère l'ensemble du processus pour vous au meilleur prix.\n\nLe véhicule importé doit également passer un contrôle technique dans un centre agréé en France. Si le véhicule provient d'un pays hors Union Européenne, des formalités douanières supplémentaires peuvent être nécessaires.\n\nUne fois tous les documents réunis, la carte grise française est éditée avec un numéro d'immatriculation au format SIV (AA-123-BB). Vous recevez un CPI vous permettant de circuler immédiatement en attendant le document définitif.",
    documents: [
      "Carte grise étrangère",
      "Facture d'achat",
      "Certificat de conformité européen (COC)",
      "Quitus fiscal",
      "Pièce d'identité",
      "Justificatif de domicile",
      "Contrôle technique français",
    ],
    delai: "48 à 72h",
    steps: [
      "Envoyez les documents du véhicule importé",
      "Nous obtenons le quitus fiscal si nécessaire",
      "Recevez votre carte grise française",
    ],
    prixDescription: "Le prix de la carte grise d'un véhicule importé dépend de la puissance fiscale, du tarif du cheval fiscal de votre département et du taux de CO2 du véhicule. La taxe régionale, la taxe fixe, la redevance d'acheminement et un éventuel malus écologique s'appliquent. Nos frais de dossier incluent la gestion complète de l'import.",
    faqs: [
      {
        question: "Comment immatriculer un véhicule étranger en France ?",
        answer: "Il faut obtenir un quitus fiscal, faire passer un contrôle technique français, obtenir un certificat de conformité européen et enfin demander la carte grise française. Discount Carte Grise gère toutes ces étapes pour vous.",
      },
      {
        question: "Qu'est-ce que le quitus fiscal et comment l'obtenir ?",
        answer: "Le quitus fiscal (formulaire 846A) est un document des services fiscaux attestant que la TVA a été payée ou que le véhicule en est exonéré. Il est obligatoire pour tout véhicule importé. Discount Carte Grise peut s'occuper de cette démarche pour vous.",
      },
      {
        question: "Faut-il passer un contrôle technique pour un véhicule importé ?",
        answer: "Oui, tout véhicule importé de plus de 4 ans doit passer un contrôle technique dans un centre agréé en France avant de pouvoir être immatriculé. Le contrôle technique étranger n'est pas valable en France.",
      },
      {
        question: "Combien de temps prend l'immatriculation d'un véhicule importé ?",
        answer: "Le délai dépend de la disponibilité des documents (quitus fiscal, COC). Avec Discount Carte Grise, une fois tous les documents réunis, le traitement est effectué sous 48 à 72h. Vous recevez un CPI pour circuler immédiatement.",
      },
    ],
    keywords: ["immatriculation véhicule importé", "carte grise import", "voiture étrangère France", "carte grise import pas cher"],
  },
  {
    code: "COTITULAIRE",
    slug: "cotitulaire-carte-grise",
    title: "Ajout/Retrait Cotitulaire",
    shortTitle: "modification cotitulaire",
    h1: "Ajout ou Retrait de Cotitulaire sur la Carte Grise",
    metaTitle: "Cotitulaire Carte Grise | Ajout ou Retrait en Ligne",
    metaDescription: "Ajoutez ou retirez un cotitulaire sur votre carte grise en quelques clics. Traitement rapide, service agréé par l'État. Lancez votre démarche en ligne.",
    icon: "UserPlus",
    description: "Ajoutez ou retirez un cotitulaire sur votre certificat d'immatriculation",
    longDescription: "Le cotitulaire est une personne qui partage la propriété du véhicule avec le titulaire principal. Son nom apparaît sur la carte grise à la rubrique C.4.1. Vous pouvez ajouter ou retirer un cotitulaire suite à un mariage, un divorce, un PACS ou tout autre changement de situation.\n\nL'ajout d'un cotitulaire est souvent demandé par les couples souhaitant partager officiellement la propriété d'un véhicule. En cas de séparation, le retrait du cotitulaire permet de clarifier la situation juridique du véhicule.\n\nCette démarche entraîne l'édition d'une nouvelle carte grise avec un nouveau numéro de formule. L'ancienne carte grise doit être restituée ou barrée.",
    documents: [
      "Carte grise actuelle",
      "Pièces d'identité des deux titulaires",
      "Justificatif de domicile",
    ],
    delai: "24h maximum",
    steps: [
      "Indiquez le cotitulaire à ajouter ou retirer",
      "Envoyez les documents requis",
      "Recevez la nouvelle carte grise",
    ],
    prixDescription: "L'ajout ou le retrait d'un cotitulaire entraîne l'édition d'une nouvelle carte grise. Le prix comprend la taxe fixe de 11 euros, la redevance d'acheminement de 2,76 euros et nos frais de dossier. Aucune taxe régionale n'est due pour cette démarche.",
    faqs: [
      {
        question: "Qu'est-ce qu'un cotitulaire sur la carte grise ?",
        answer: "Le cotitulaire est une personne inscrite sur la carte grise en plus du titulaire principal, à la rubrique C.4.1. Les deux partagent la propriété légale du véhicule. Cette mention est souvent utilisée par les couples mariés ou pacsés.",
      },
      {
        question: "Quels documents faut-il pour ajouter un cotitulaire ?",
        answer: "Il vous faut la carte grise actuelle du véhicule, les pièces d'identité des deux titulaires (titulaire principal et cotitulaire), un justificatif de domicile et le formulaire Cerfa 13750 de demande d'immatriculation.",
      },
      {
        question: "Peut-on retirer un cotitulaire après un divorce ?",
        answer: "Oui, le retrait d'un cotitulaire est possible à tout moment. En cas de divorce, il est recommandé de mettre à jour la carte grise pour refléter la nouvelle situation. Le titulaire principal peut effectuer cette démarche en ligne.",
      },
      {
        question: "Le cotitulaire peut-il vendre le véhicule seul ?",
        answer: "Non, la vente du véhicule nécessite l'accord des deux titulaires. Le titulaire principal et le cotitulaire doivent tous les deux signer la déclaration de cession et barrer la carte grise.",
      },
    ],
    keywords: ["cotitulaire carte grise", "ajout nom carte grise", "deux noms carte grise", "cotitulaire carte grise pas cher"],
  },
  {
    code: "MODIF_CG",
    slug: "modification-carte-grise",
    title: "Modification de Carte Grise",
    shortTitle: "modification de carte grise",
    h1: "Modification de Carte Grise - Changement de Caractéristiques",
    metaTitle: "Modification Carte Grise | Caractéristiques en Ligne",
    metaDescription: "Modifiez votre carte grise suite à une transformation du véhicule : éthanol E85, attelage, collection. Service agréé, traitement sous 48h. Commandez en ligne.",
    icon: "Settings",
    description: "Modification des caractéristiques techniques du véhicule",
    longDescription: "Certaines modifications apportées à votre véhicule nécessitent une mise à jour de la carte grise : transformation en véhicule de collection, ajout d'un attelage, changement de carburant (éthanol E85), modification de la carrosserie ou du genre du véhicule.\n\nToute modification technique doit au préalable être validée par la DREAL (Direction Régionale de l'Environnement, de l'Aménagement et du Logement) ou un organisme agréé qui délivre un procès-verbal de réception à titre isolé (RTI). Ce document est indispensable pour mettre à jour la carte grise.\n\nAvec Discount Carte Grise, envoyez votre PV de réception et nous nous chargeons de la mise à jour de votre certificat d'immatriculation. Une nouvelle carte grise est éditée avec les nouvelles caractéristiques techniques.",
    documents: [
      "Carte grise actuelle",
      "Procès-verbal de la DREAL (si modification technique)",
      "Pièce d'identité",
      "Justificatif de domicile",
    ],
    delai: "24 à 48h",
    steps: [
      "Décrivez la modification effectuée",
      "Envoyez le PV de la DREAL si nécessaire",
      "Recevez votre carte grise mise à jour",
    ],
    prixDescription: "Le prix de la modification de carte grise dépend du type de changement. Certaines modifications entraînent une taxe régionale (changement de genre du véhicule), d'autres sont soumises uniquement à la taxe fixe de 11 euros et à la redevance d'acheminement de 2,76 euros. Nos frais de dossier couvrent la gestion complète de votre demande.",
    faqs: [
      {
        question: "Quelles modifications nécessitent un changement de carte grise ?",
        answer: "Tout changement de caractéristiques techniques (puissance, carburant, carrosserie), changement d'usage (personnel/professionnel) ou ajout d'équipements homologués (attelage) nécessite une mise à jour de la carte grise.",
      },
      {
        question: "Faut-il un PV de la DREAL pour modifier sa carte grise ?",
        answer: "Oui, pour toute modification technique du véhicule, un procès-verbal de réception à titre isolé (RTI) délivré par la DREAL ou un organisme agréé est obligatoire. Ce document certifie que la modification est conforme aux normes en vigueur.",
      },
      {
        question: "Peut-on passer sa voiture à l'éthanol E85 et modifier la carte grise ?",
        answer: "Oui, après l'installation d'un boîtier E85 homologué par un installateur agréé, vous recevez un certificat de conformité. Ce document permet de mettre à jour la carte grise avec le nouveau type de carburant. Cette modification peut ouvrir droit à une exonération de taxe régionale dans certains départements.",
      },
      {
        question: "Comment faire passer un véhicule en carte grise collection ?",
        answer: "Le véhicule doit avoir plus de 30 ans et obtenir une attestation de la FFVE (Fédération Française des Véhicules d'Époque). Avec cette attestation, la carte grise peut être modifiée pour passer en usage collection, ce qui dispense de contrôle technique périodique.",
      },
    ],
    keywords: ["modification carte grise", "changement caractéristiques véhicule", "carte grise collection", "modification carte grise pas cher"],
  },
  {
    code: "IMMAT_CYCLO",
    slug: "immatriculation-cyclomoteur",
    title: "Immatriculation Cyclomoteur",
    shortTitle: "carte grise cyclomoteur",
    h1: "Immatriculation de Cyclomoteur et Scooter 50cc",
    metaTitle: "Immatriculation Cyclomoteur 50cc | Carte Grise Scooter",
    metaDescription: "Immatriculez votre cyclomoteur ou scooter 50cc en ligne. Obligatoire depuis 2011, service agréé, traitement sous 24h. Faites votre demande maintenant.",
    icon: "Bike",
    description: "Immatriculation des cyclomoteurs et scooters de moins de 50cc",
    longDescription: "Depuis 2011, tous les cyclomoteurs (scooters 50cc, mobylettes) doivent être immatriculés avec une plaque au format SIV (AA-123-BB). Si votre véhicule possède encore une ancienne plaque départementale ou n'a jamais été immatriculé, cette démarche est obligatoire pour circuler légalement.\n\nL'immatriculation des cyclomoteurs concerne les véhicules à deux ou trois roues dont la cylindrée ne dépasse pas 50 cm3 (ou dont la puissance n'excède pas 4 kW pour les modèles électriques). Cette obligation s'applique aussi bien aux véhicules neufs qu'aux véhicules d'occasion.\n\nAvec Discount Carte Grise, la démarche est 100% en ligne. Vous recevez votre CPI par email et votre carte grise définitive par courrier. Il ne vous reste plus qu'à commander votre plaque d'immatriculation auprès d'un fabricant agréé.",
    documents: [
      "Certificat de conformité ou ancien récépissé",
      "Pièce d'identité",
      "Justificatif de domicile",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez les informations de votre cyclomoteur",
      "Envoyez les documents",
      "Recevez votre carte grise cyclomoteur",
    ],
    prixDescription: "L'immatriculation d'un cyclomoteur est soumise à la taxe fixe de 11 euros et à la redevance d'acheminement de 2,76 euros. Les cyclomoteurs sont exonérés de taxe régionale. Nos frais de dossier s'ajoutent pour la gestion de votre demande. Pas de frais supplémentaires ni de coûts cachés.",
    faqs: [
      {
        question: "Est-ce obligatoire d'immatriculer un scooter 50cc ?",
        answer: "Oui, depuis le 1er juillet 2004 pour les neufs et depuis 2011 pour tous les cyclomoteurs. L'absence d'immatriculation est passible d'une amende de 135 euros. Tous les cyclomoteurs doivent avoir une plaque au format SIV.",
      },
      {
        question: "Quels documents faut-il pour immatriculer un cyclomoteur ?",
        answer: "Il vous faut le certificat de conformité du constructeur ou l'ancien récépissé, une pièce d'identité en cours de validité et un justificatif de domicile de moins de 6 mois. Pour un cyclomoteur d'occasion, la carte grise barrée par l'ancien propriétaire est également nécessaire.",
      },
      {
        question: "Faut-il un permis pour conduire un cyclomoteur 50cc ?",
        answer: "Oui, depuis 2013, le permis AM (ancien BSR) est obligatoire pour conduire un cyclomoteur 50cc si vous êtes né après le 1er janvier 1988. Les personnes nées avant cette date peuvent conduire sans permis spécifique.",
      },
      {
        question: "Combien coûte l'immatriculation d'un cyclomoteur ?",
        answer: "Le coût comprend la taxe fixe de 11 euros et la redevance d'acheminement de 2,76 euros. Les cyclomoteurs sont exonérés de taxe régionale. À cela s'ajoutent nos frais de dossier pour un traitement rapide de votre demande.",
      },
    ],
    keywords: ["immatriculation cyclomoteur", "carte grise scooter 50cc", "immatriculation mobylette", "immatriculation cyclomoteur pas cher"],
  },
];

export function getDemarcheBySlug(slug: string): DemarcheConfig | undefined {
  return demarchesConfig.find((d) => d.slug === slug);
}

export function getDemarcheByCode(code: string): DemarcheConfig | undefined {
  return demarchesConfig.find((d) => d.code === code);
}
