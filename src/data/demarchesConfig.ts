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
    metaTitle: "Carte Grise en Ligne Pas Chere | Service Agree 24h",
    metaDescription: "Commandez votre carte grise en ligne au meilleur prix. Traitement sous 24h, service agree par l'Etat. Simulez le cout et lancez votre demarche.",
    icon: "CreditCard",
    description: "Changement de titulaire suite a l'achat d'un vehicule d'occasion",
    longDescription: "Le changement de titulaire de la carte grise (certificat d'immatriculation) est obligatoire lors de l'achat d'un vehicule d'occasion. Cette demarche doit etre effectuee dans les 30 jours suivant l'achat. Avec Discount Carte Grise, faites votre demande 100% en ligne et obtenez votre carte grise pas chere, avec un traitement sous 24h.",
    documents: [
      "Carte grise originale barree et signee par l'ancien proprietaire",
      "Cerfa 13750 (demande d'immatriculation)",
      "Cerfa 15776 (declaration de cession)",
      "Piece d'identite en cours de validite",
      "Justificatif de domicile de moins de 6 mois",
      "Controle technique de moins de 6 mois (vehicules de plus de 4 ans)",
      "Permis de conduire",
    ],
    delai: "24h maximum",
    steps: [
      "Simulez le prix de votre carte grise en renseignant votre immatriculation",
      "Envoyez vos documents en ligne de maniere securisee",
      "Recevez votre carte grise par courrier recommande",
    ],
    faqs: [
      {
        question: "Quel est le prix d'une carte grise en 2026 ?",
        answer: "Le prix de la carte grise depend de la puissance fiscale du vehicule et du tarif du cheval fiscal de votre region. En 2026, le tarif varie de 30 euros (Mayotte) a 68,95 euros (Ile-de-France) par cheval fiscal. A cela s'ajoutent la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros) et nos frais de dossier (30 euros). Chez Discount Carte Grise, nous vous proposons le meilleur prix pour votre carte grise en ligne.",
      },
      {
        question: "Combien de temps pour recevoir sa carte grise ?",
        answer: "Avec Discount Carte Grise, votre dossier est traite sous 24h maximum. Vous recevez un Certificat Provisoire d'Immatriculation (CPI) immediatement par email, puis votre carte grise definitive par courrier recommande sous 3 a 5 jours ouvrables.",
      },
      {
        question: "Peut-on rouler sans carte grise ?",
        answer: "Non, rouler sans carte grise est passible d'une amende de 135 euros. Cependant, le CPI (Certificat Provisoire d'Immatriculation) vous permet de circuler pendant 1 mois en attendant de recevoir votre carte grise definitive.",
      },
      {
        question: "La carte grise est-elle obligatoire ?",
        answer: "Oui, tout vehicule motorise circulant sur la voie publique doit posseder un certificat d'immatriculation (carte grise) au nom de son proprietaire. Le delai pour faire la demarche est de 30 jours apres l'achat.",
      },
      {
        question: "Comment faire ma carte grise en ligne ?",
        answer: "Faire sa carte grise en ligne est simple : utilisez notre simulateur gratuit pour connaitre le prix exact, envoyez vos documents via notre plateforme securisee, et recevez votre carte grise par courrier. Depuis 2017, il n'est plus possible de faire sa carte grise en prefecture — la demarche se fait exclusivement en ligne via l'ANTS ou un professionnel agree comme Discount Carte Grise.",
      },
      {
        question: "Quels documents faut-il pour faire une carte grise ?",
        answer: "Pour un changement de titulaire, il vous faut : la carte grise barree par l'ancien proprietaire, le Cerfa 13750, le Cerfa 15776, une piece d'identite, un justificatif de domicile, le controle technique (si vehicule de plus de 4 ans) et le permis de conduire.",
      },
    ],
    prixDescription: "Le tarif de votre carte grise depend de la puissance fiscale du vehicule et du prix du cheval fiscal dans votre departement de residence. A cela s'ajoutent la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros), la taxe CO2 pour les vehicules polluants et nos frais de dossier a partir de 30 euros. Discount Carte Grise vous garantit une carte grise pas chere avec le meilleur prix du marche. Utilisez notre simulateur pour obtenir le prix exact.",
    keywords: ["carte grise en ligne", "prix carte grise", "changement titulaire", "carte grise pas cher", "carte grise meilleur prix", "faire sa carte grise", "faire ma carte grise", "simulateur gratuit carte grise"],
  },
  {
    code: "DC",
    slug: "declaration-cession",
    title: "Declaration de Cession",
    shortTitle: "Cession",
    h1: "Declaration de Cession de Vehicule en Ligne",
    metaTitle: "Declaration de Cession Vehicule en Ligne | Cerfa 15776",
    metaDescription: "Effectuez votre declaration de cession en ligne en quelques minutes. Cerfa 15776 rempli automatiquement, code de cession immediat. Des 19,90 euros. Service rapide et pas cher.",
    icon: "FileText",
    description: "Declarez la vente de votre vehicule en toute simplicite",
    longDescription: "La declaration de cession est obligatoire lors de la vente ou du don d'un vehicule. Elle protege le vendeur en cas d'infraction commise par l'acheteur apres la vente. Avec Discount Carte Grise, effectuez votre declaration en quelques minutes.",
    documents: [
      "Carte grise du vehicule",
      "Piece d'identite du vendeur",
      "Coordonnees de l'acheteur",
    ],
    delai: "Immediat",
    steps: [
      "Renseignez les informations du vehicule et de l'acheteur",
      "Verifiez et validez votre declaration",
      "Recevez votre code de cession immediatement",
    ],
    faqs: [
      {
        question: "La declaration de cession est-elle obligatoire ?",
        answer: "Oui, le vendeur doit declarer la cession dans les 15 jours suivant la vente. Sans cette declaration, le vendeur reste responsable des infractions commises avec le vehicule.",
      },
      {
        question: "Qu'est-ce que le Cerfa 15776 ?",
        answer: "Le Cerfa 15776 est le formulaire officiel de declaration de cession d'un vehicule. Il doit etre rempli en 3 exemplaires : un pour le vendeur, un pour l'acheteur et un pour la prefecture.",
      },
      {
        question: "Comment remplir une declaration de cession ?",
        answer: "Avec Discount Carte Grise, vous n'avez qu'a renseigner les informations du vehicule et de l'acheteur. Nous remplissons automatiquement le Cerfa 15776 pour vous.",
      },
      {
        question: "Combien coute une declaration de cession ?",
        answer: "Notre service de declaration de cession est a partir de 19,90 euros. Le traitement est immediat et vous recevez votre code de cession par email.",
      },
    ],
    prixDescription: "La declaration de cession est proposee a un tarif forfaitaire a partir de 19,90 euros. Ce prix inclut le remplissage automatique du Cerfa 15776, la transmission a l'administration et l'envoi du code de cession. Aucun frais cache ni taxe supplementaire.",
    keywords: ["declaration de cession", "vente vehicule", "cerfa 15776", "declaration vente voiture", "declaration cession pas cher"],
  },
  {
    code: "DA",
    slug: "declaration-achat",
    title: "Declaration d'Achat",
    shortTitle: "Achat",
    h1: "Declaration d'Achat de Vehicule d'Occasion",
    metaTitle: "Declaration d'Achat Vehicule | Pro Auto en Ligne",
    metaDescription: "Declarez l'achat d'un vehicule d'occasion en ligne. Service dedie aux professionnels de l'automobile, traitement immediat. Faites votre demande des 19,90 euros.",
    icon: "ShoppingCart",
    description: "Declarez l'achat d'un vehicule d'occasion",
    longDescription: "La declaration d'achat est une demarche obligatoire pour les professionnels de l'automobile qui achetent un vehicule d'occasion. Elle permet de notifier l'administration du changement de detention du vehicule.",
    documents: [
      "Carte grise du vehicule",
      "Piece d'identite du professionnel",
      "Justificatif professionnel (Kbis, carte pro)",
    ],
    delai: "Immediat",
    steps: [
      "Renseignez les informations du vehicule",
      "Envoyez les documents requis",
      "Recevez votre accusé de reception",
    ],
    faqs: [
      {
        question: "Qui doit faire une declaration d'achat ?",
        answer: "La declaration d'achat est principalement destinee aux professionnels de l'automobile (garagistes, concessionnaires) qui achetent des vehicules d'occasion.",
      },
      {
        question: "Quel est le delai pour faire une declaration d'achat ?",
        answer: "La declaration d'achat doit etre effectuee dans les 15 jours suivant l'achat du vehicule.",
      },
    ],
    prixDescription: "La declaration d'achat est proposee a un tarif forfaitaire a partir de 19,90 euros. Ce prix inclut la gestion complete de la declaration aupres de l'administration et l'envoi de l'accuse de reception. Pas de taxe regionale ni de frais supplementaires.",
    keywords: ["declaration achat vehicule", "achat voiture occasion professionnel", "declaration achat pas cher"],
  },
  {
    code: "CHGT_ADRESSE",
    slug: "changement-adresse-carte-grise",
    title: "Changement d'Adresse",
    shortTitle: "Adresse",
    h1: "Changement d'Adresse sur la Carte Grise",
    metaTitle: "Changement d'Adresse Carte Grise | Demarche en Ligne",
    metaDescription: "Mettez a jour l'adresse de votre carte grise apres un demenagement. Demarche obligatoire sous 30 jours, traitement rapide et pas cher. Lancez votre demande en ligne.",
    icon: "MapPin",
    description: "Mettez a jour votre adresse sur votre carte grise apres un demenagement",
    longDescription: "Le changement d'adresse sur la carte grise est obligatoire dans le mois suivant un demenagement. Cette demarche est gratuite les 3 premieres fois sur le site de l'ANTS, mais peut s'averer complexe. Discount Carte Grise vous simplifie la procedure.",
    documents: [
      "Carte grise actuelle",
      "Justificatif de domicile de moins de 6 mois",
      "Piece d'identite",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez votre nouvelle adresse",
      "Envoyez votre justificatif de domicile",
      "Recevez votre nouvelle etiquette ou carte grise",
    ],
    faqs: [
      {
        question: "Le changement d'adresse carte grise est-il obligatoire ?",
        answer: "Oui, vous disposez d'un delai de 30 jours apres votre demenagement pour mettre a jour l'adresse de votre carte grise. Le non-respect de cette obligation est passible d'une amende de 135 euros.",
      },
      {
        question: "Le changement d'adresse est-il gratuit ?",
        answer: "Le changement d'adresse sur l'ANTS est gratuit les 3 premieres fois. Au-dela, ou si vous souhaitez un service simplifie et rapide, Discount Carte Grise peut s'en occuper pour vous.",
      },
      {
        question: "Recoit-on une nouvelle carte grise ?",
        answer: "Pour les 3 premiers changements, vous recevez une etiquette autocollante a apposer sur votre carte grise. Au-dela, une nouvelle carte grise est editee avec la nouvelle adresse.",
      },
    ],
    prixDescription: "Le changement d'adresse est gratuit les 3 premieres fois sur le site de l'ANTS. Au-dela, une nouvelle carte grise est editee avec la taxe fixe de 11 euros et la redevance d'acheminement de 2,76 euros. Nos frais de dossier s'ajoutent pour un traitement simplifie et rapide.",
    keywords: ["changement adresse carte grise", "demenagement carte grise", "modifier adresse certificat immatriculation", "changement adresse carte grise pas cher"],
  },
  {
    code: "DUPLICATA",
    slug: "duplicata-carte-grise",
    title: "Duplicata de Carte Grise",
    shortTitle: "Duplicata",
    h1: "Duplicata de Carte Grise - Perte, Vol ou Deterioration",
    metaTitle: "Duplicata Carte Grise | Perte, Vol ou Deterioration",
    metaDescription: "Obtenez un duplicata de carte grise en cas de perte, vol ou deterioration. Traitement sous 24h, service agree. Commandez votre duplicata en ligne.",
    icon: "Copy",
    description: "Obtenez un duplicata en cas de perte, vol ou deterioration",
    longDescription: "En cas de perte, vol ou deterioration de votre carte grise, vous devez demander un duplicata. Cette demarche vous permet d'obtenir un nouveau certificat d'immatriculation identique a l'original.",
    documents: [
      "Piece d'identite",
      "Justificatif de domicile",
      "Declaration de perte ou recepisse de depot de plainte (en cas de vol)",
    ],
    delai: "24h maximum",
    steps: [
      "Declarez la perte ou le vol de votre carte grise",
      "Envoyez les documents justificatifs",
      "Recevez votre duplicata par courrier recommande",
    ],
    faqs: [
      {
        question: "Combien coute un duplicata de carte grise ?",
        answer: "Le cout d'un duplicata correspond a la taxe fixe de 11 euros + la redevance d'acheminement de 2,76 euros + nos frais de dossier. Pas de taxe regionale a payer.",
      },
      {
        question: "Quel delai pour recevoir un duplicata ?",
        answer: "Avec Discount Carte Grise, votre demande est traitee sous 24h. Vous recevez un CPI par email immediatement et le duplicata par courrier sous 3 a 5 jours.",
      },
    ],
    prixDescription: "Le duplicata de carte grise est soumis a la taxe fixe de 11 euros et a la redevance d'acheminement de 2,76 euros. Aucune taxe regionale n'est due. Nos frais de dossier couvrent la gestion complete de votre demande. Pas de frais caches.",
    keywords: ["duplicata carte grise", "carte grise perdue", "refaire carte grise", "vol carte grise", "duplicata carte grise pas cher"],
  },
  {
    code: "CG_NEUF",
    slug: "carte-grise-vehicule-neuf",
    title: "Carte Grise Vehicule Neuf",
    shortTitle: "Vehicule neuf",
    h1: "Carte Grise pour Vehicule Neuf - Premiere Immatriculation",
    metaTitle: "Carte Grise Vehicule Neuf | Immatriculation en Ligne",
    metaDescription: "Faites la premiere immatriculation de votre vehicule neuf en ligne. Service agree, traitement sous 24h, CPI immediat. Lancez votre demarche maintenant.",
    icon: "Car",
    description: "Premiere immatriculation d'un vehicule neuf",
    longDescription: "L'immatriculation d'un vehicule neuf est la premiere etape obligatoire pour pouvoir circuler legalement sur la voie publique. Que vous ayez achete votre vehicule chez un concessionnaire ou en import direct, la demande de certificat d'immatriculation doit etre effectuee avant la mise en circulation.\n\nLe concessionnaire peut se charger de cette demarche, mais vous etes egalement libre de la realiser vous-meme ou de la confier a un professionnel agree comme Discount Carte Grise pour obtenir votre carte grise au meilleur prix. Le prix de la carte grise pour un vehicule neuf depend de la puissance fiscale, du taux de CO2 et de votre departement de residence.\n\nUn Certificat Provisoire d'Immatriculation (CPI) vous est delivre pour circuler en attendant la carte grise definitive. Ce document est valable un mois et doit etre conserve a bord du vehicule.",
    documents: [
      "Certificat de conformite europeen",
      "Facture d'achat du vehicule",
      "Piece d'identite",
      "Justificatif de domicile",
      "Permis de conduire",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez les informations de votre vehicule neuf",
      "Envoyez les documents requis",
      "Recevez votre carte grise et vos plaques",
    ],
    prixDescription: "Le prix de la carte grise d'un vehicule neuf depend de la puissance fiscale, du tarif du cheval fiscal dans votre departement et du taux d'emission de CO2. La taxe sur les emissions polluantes (malus ecologique) peut s'ajouter pour les vehicules depassant un certain seuil de CO2. Nos frais de dossier sont a partir de 30 euros.",
    faqs: [
      {
        question: "Peut-on immatriculer un vehicule neuf en ligne ?",
        answer: "Oui, l'immatriculation d'un vehicule neuf peut etre effectuee 100% en ligne via un service agree comme Discount Carte Grise. Le concessionnaire peut aussi s'en charger, mais notre service propose une carte grise pas chere avec des tarifs parmi les plus competitifs du marche.",
      },
      {
        question: "Qu'est-ce que le certificat de conformite europeen (COC) ?",
        answer: "Le certificat de conformite europeen (COC) est un document delivre par le constructeur attestant que le vehicule est conforme aux normes europeennes. Il est indispensable pour toute premiere immatriculation. Le concessionnaire vous le fournit avec le vehicule neuf.",
      },
      {
        question: "Quel est le prix d'une carte grise pour un vehicule neuf ?",
        answer: "Le prix depend de la puissance fiscale du vehicule, du tarif du cheval fiscal de votre region et du taux d'emission de CO2. Un malus ecologique peut s'appliquer pour les vehicules les plus polluants. Utilisez notre simulateur pour obtenir le tarif exact.",
      },
      {
        question: "Peut-on rouler avec un vehicule neuf sans carte grise ?",
        answer: "Non, vous ne pouvez pas circuler sans immatriculation. Cependant, un CPI (Certificat Provisoire d'Immatriculation) vous est delivre immediatement et vous autorise a rouler pendant un mois en attendant la carte grise definitive.",
      },
    ],
    keywords: ["carte grise vehicule neuf", "premiere immatriculation", "immatriculer voiture neuve", "carte grise neuf pas cher"],
  },
  {
    code: "SUCCESSION",
    slug: "succession-carte-grise",
    title: "Carte Grise Succession",
    shortTitle: "Succession",
    h1: "Carte Grise suite a un Deces - Succession et Heritage",
    metaTitle: "Carte Grise Succession | Transfert apres Deces",
    metaDescription: "Transferez la carte grise d'un vehicule herite apres un deces. Demarche simplifiee pour les heritiers, service agree. Faites votre demande en ligne.",
    icon: "Users",
    description: "Transfert de carte grise suite a un deces",
    longDescription: "Lorsqu'un proprietaire de vehicule decede, les heritiers doivent effectuer le changement de titulaire de la carte grise. Cette demarche necessite des documents specifiques lies a la succession.",
    documents: [
      "Carte grise du vehicule",
      "Acte de deces",
      "Attestation notariale ou certificat d'heredite",
      "Piece d'identite de l'heritier",
      "Justificatif de domicile",
    ],
    delai: "24 a 48h",
    steps: [
      "Rassemblez les documents de succession",
      "Envoyez votre dossier en ligne",
      "Recevez la nouvelle carte grise au nom de l'heritier",
    ],
    faqs: [
      {
        question: "Quels documents pour une carte grise suite a un deces ?",
        answer: "Il vous faut l'acte de deces, la carte grise du vehicule, une attestation notariale ou certificat d'heredite, votre piece d'identite et un justificatif de domicile.",
      },
      {
        question: "Combien de temps pour transferer une carte grise apres un deces ?",
        answer: "Il n'y a pas de delai legal strict, mais il est recommande d'effectuer la demarche rapidement pour pouvoir utiliser le vehicule legalement.",
      },
    ],
    prixDescription: "Le prix de la carte grise en cas de succession depend de la puissance fiscale du vehicule et du tarif du cheval fiscal de votre departement. Les memes taxes s'appliquent que pour un changement de titulaire classique : taxe regionale, taxe fixe (11 euros), redevance d'acheminement (2,76 euros) et nos frais de dossier.",
    keywords: ["carte grise succession", "carte grise deces", "heritage vehicule", "transfert carte grise heritier", "carte grise succession pas cher"],
  },
  {
    code: "QUITUS_FISCAL",
    slug: "quitus-fiscal",
    title: "Quitus Fiscal",
    shortTitle: "Quitus fiscal",
    h1: "Quitus Fiscal pour Vehicule Importe - Certificat Fiscal",
    metaTitle: "Quitus Fiscal Vehicule Importe | Certificat 846A",
    metaDescription: "Obtenez votre quitus fiscal (certificat 846A) pour immatriculer un vehicule importe. Demande geree de A a Z, traitement rapide. Faites votre demande en ligne.",
    icon: "FileCheck",
    description: "Certificat fiscal obligatoire pour les vehicules importes",
    longDescription: "Le quitus fiscal (certificat fiscal 846A) est un document obligatoire pour immatriculer en France un vehicule achete a l'etranger. Il atteste que la TVA a bien ete acquittee ou que le vehicule en est exonere.",
    documents: [
      "Facture d'achat du vehicule",
      "Carte grise etrangere",
      "Piece d'identite",
      "Justificatif de domicile",
      "Certificat de conformite",
    ],
    delai: "24 a 72h",
    steps: [
      "Envoyez la facture et la carte grise etrangere",
      "Nous effectuons la demande aupres des services fiscaux",
      "Recevez votre quitus fiscal par email",
    ],
    faqs: [
      {
        question: "Qu'est-ce qu'un quitus fiscal ?",
        answer: "Le quitus fiscal (formulaire 846A) est un certificat delivre par l'administration fiscale attestant que la TVA a ete payee ou que le vehicule en est exonere. Il est indispensable pour immatriculer un vehicule importe.",
      },
      {
        question: "Le quitus fiscal est-il payant ?",
        answer: "La demande de quitus fiscal aupres de l'administration est gratuite. Nos frais de dossier couvrent la gestion et l'envoi de votre demande.",
      },
    ],
    prixDescription: "La demande de quitus fiscal aupres de l'administration fiscale est gratuite. Nos frais de dossier couvrent la constitution du dossier, la transmission aux services fiscaux et le suivi de votre demande. Aucune taxe supplementaire ne s'applique pour l'obtention du quitus.",
    keywords: ["quitus fiscal", "certificat fiscal 846A", "vehicule importe France", "TVA vehicule occasion etranger", "quitus fiscal pas cher"],
  },
  {
    code: "CPI_WW",
    slug: "carte-grise-import",
    title: "Immatriculation Vehicule Importe",
    shortTitle: "Import",
    h1: "Carte Grise Vehicule Importe - Immatriculation en France",
    metaTitle: "Carte Grise Vehicule Importe | Immatriculation France",
    metaDescription: "Immatriculez votre vehicule importe en France : quitus fiscal, conformite et carte grise geres pour vous. Service agree, demarche 100% en ligne.",
    icon: "Globe",
    description: "Immatriculation d'un vehicule achete a l'etranger",
    longDescription: "Importer un vehicule de l'etranger necessite plusieurs demarches administratives : obtenir un quitus fiscal aupres des services fiscaux, un certificat de conformite europeen (COC) aupres du constructeur et faire la demande de carte grise francaise. Discount Carte Grise gere l'ensemble du processus pour vous au meilleur prix.\n\nLe vehicule importe doit egalement passer un controle technique dans un centre agree en France. Si le vehicule provient d'un pays hors Union Europeenne, des formalites douanieres supplementaires peuvent etre necessaires.\n\nUne fois tous les documents reunis, la carte grise francaise est editee avec un numero d'immatriculation au format SIV (AA-123-BB). Vous recevez un CPI vous permettant de circuler immediatement en attendant le document definitif.",
    documents: [
      "Carte grise etrangere",
      "Facture d'achat",
      "Certificat de conformite europeen (COC)",
      "Quitus fiscal",
      "Piece d'identite",
      "Justificatif de domicile",
      "Controle technique francais",
    ],
    delai: "48 a 72h",
    steps: [
      "Envoyez les documents du vehicule importe",
      "Nous obtenons le quitus fiscal si necessaire",
      "Recevez votre carte grise francaise",
    ],
    prixDescription: "Le prix de la carte grise d'un vehicule importe depend de la puissance fiscale, du tarif du cheval fiscal de votre departement et du taux de CO2 du vehicule. La taxe regionale, la taxe fixe, la redevance d'acheminement et un eventuel malus ecologique s'appliquent. Nos frais de dossier incluent la gestion complete de l'import.",
    faqs: [
      {
        question: "Comment immatriculer un vehicule etranger en France ?",
        answer: "Il faut obtenir un quitus fiscal, faire passer un controle technique francais, obtenir un certificat de conformite europeen et enfin demander la carte grise francaise. Discount Carte Grise gere toutes ces etapes pour vous.",
      },
      {
        question: "Qu'est-ce que le quitus fiscal et comment l'obtenir ?",
        answer: "Le quitus fiscal (formulaire 846A) est un document des services fiscaux attestant que la TVA a ete payee ou que le vehicule en est exonere. Il est obligatoire pour tout vehicule importe. Discount Carte Grise peut s'occuper de cette demarche pour vous.",
      },
      {
        question: "Faut-il passer un controle technique pour un vehicule importe ?",
        answer: "Oui, tout vehicule importe de plus de 4 ans doit passer un controle technique dans un centre agree en France avant de pouvoir etre immatricule. Le controle technique etranger n'est pas valable en France.",
      },
      {
        question: "Combien de temps prend l'immatriculation d'un vehicule importe ?",
        answer: "Le delai depend de la disponibilite des documents (quitus fiscal, COC). Avec Discount Carte Grise, une fois tous les documents reunis, le traitement est effectue sous 48 a 72h. Vous recevez un CPI pour circuler immediatement.",
      },
    ],
    keywords: ["immatriculation vehicule importe", "carte grise import", "voiture etrangere France", "carte grise import pas cher"],
  },
  {
    code: "COTITULAIRE",
    slug: "cotitulaire-carte-grise",
    title: "Ajout/Retrait Cotitulaire",
    shortTitle: "Cotitulaire",
    h1: "Ajout ou Retrait de Cotitulaire sur la Carte Grise",
    metaTitle: "Cotitulaire Carte Grise | Ajout ou Retrait en Ligne",
    metaDescription: "Ajoutez ou retirez un cotitulaire sur votre carte grise en quelques clics. Traitement rapide, service agree par l'Etat. Lancez votre demarche en ligne.",
    icon: "UserPlus",
    description: "Ajoutez ou retirez un cotitulaire sur votre certificat d'immatriculation",
    longDescription: "Le cotitulaire est une personne qui partage la propriete du vehicule avec le titulaire principal. Son nom apparait sur la carte grise a la rubrique C.4.1. Vous pouvez ajouter ou retirer un cotitulaire suite a un mariage, un divorce, un PACS ou tout autre changement de situation.\n\nL'ajout d'un cotitulaire est souvent demande par les couples souhaitant partager officiellement la propriete d'un vehicule. En cas de separation, le retrait du cotitulaire permet de clarifier la situation juridique du vehicule.\n\nCette demarche entraine l'edition d'une nouvelle carte grise avec un nouveau numero de formule. L'ancienne carte grise doit etre restituee ou barree.",
    documents: [
      "Carte grise actuelle",
      "Pieces d'identite des deux titulaires",
      "Justificatif de domicile",
    ],
    delai: "24h maximum",
    steps: [
      "Indiquez le cotitulaire a ajouter ou retirer",
      "Envoyez les documents requis",
      "Recevez la nouvelle carte grise",
    ],
    prixDescription: "L'ajout ou le retrait d'un cotitulaire entraine l'edition d'une nouvelle carte grise. Le prix comprend la taxe fixe de 11 euros, la redevance d'acheminement de 2,76 euros et nos frais de dossier. Aucune taxe regionale n'est due pour cette demarche.",
    faqs: [
      {
        question: "Qu'est-ce qu'un cotitulaire sur la carte grise ?",
        answer: "Le cotitulaire est une personne inscrite sur la carte grise en plus du titulaire principal, a la rubrique C.4.1. Les deux partagent la propriete legale du vehicule. Cette mention est souvent utilisee par les couples maries ou pacses.",
      },
      {
        question: "Quels documents faut-il pour ajouter un cotitulaire ?",
        answer: "Il vous faut la carte grise actuelle du vehicule, les pieces d'identite des deux titulaires (titulaire principal et cotitulaire), un justificatif de domicile et le formulaire Cerfa 13750 de demande d'immatriculation.",
      },
      {
        question: "Peut-on retirer un cotitulaire apres un divorce ?",
        answer: "Oui, le retrait d'un cotitulaire est possible a tout moment. En cas de divorce, il est recommande de mettre a jour la carte grise pour refleter la nouvelle situation. Le titulaire principal peut effectuer cette demarche en ligne.",
      },
      {
        question: "Le cotitulaire peut-il vendre le vehicule seul ?",
        answer: "Non, la vente du vehicule necessite l'accord des deux titulaires. Le titulaire principal et le cotitulaire doivent tous les deux signer la declaration de cession et barrer la carte grise.",
      },
    ],
    keywords: ["cotitulaire carte grise", "ajout nom carte grise", "deux noms carte grise", "cotitulaire carte grise pas cher"],
  },
  {
    code: "MODIF_CG",
    slug: "modification-carte-grise",
    title: "Modification de Carte Grise",
    shortTitle: "Modification",
    h1: "Modification de Carte Grise - Changement de Caracteristiques",
    metaTitle: "Modification Carte Grise | Caracteristiques en Ligne",
    metaDescription: "Modifiez votre carte grise suite a une transformation du vehicule : ethanol E85, attelage, collection. Service agree, traitement sous 48h. Commandez en ligne.",
    icon: "Settings",
    description: "Modification des caracteristiques techniques du vehicule",
    longDescription: "Certaines modifications apportees a votre vehicule necessitent une mise a jour de la carte grise : transformation en vehicule de collection, ajout d'un attelage, changement de carburant (ethanol E85), modification de la carrosserie ou du genre du vehicule.\n\nToute modification technique doit au prealable etre validee par la DREAL (Direction Regionale de l'Environnement, de l'Amenagement et du Logement) ou un organisme agree qui delivre un proces-verbal de reception a titre isole (RTI). Ce document est indispensable pour mettre a jour la carte grise.\n\nAvec Discount Carte Grise, envoyez votre PV de reception et nous nous chargeons de la mise a jour de votre certificat d'immatriculation. Une nouvelle carte grise est editee avec les nouvelles caracteristiques techniques.",
    documents: [
      "Carte grise actuelle",
      "Proces-verbal de la DREAL (si modification technique)",
      "Piece d'identite",
      "Justificatif de domicile",
    ],
    delai: "24 a 48h",
    steps: [
      "Decrivez la modification effectuee",
      "Envoyez le PV de la DREAL si necessaire",
      "Recevez votre carte grise mise a jour",
    ],
    prixDescription: "Le prix de la modification de carte grise depend du type de changement. Certaines modifications entrainent une taxe regionale (changement de genre du vehicule), d'autres sont soumises uniquement a la taxe fixe de 11 euros et a la redevance d'acheminement de 2,76 euros. Nos frais de dossier couvrent la gestion complete de votre demande.",
    faqs: [
      {
        question: "Quelles modifications necessitent un changement de carte grise ?",
        answer: "Tout changement de caracteristiques techniques (puissance, carburant, carrosserie), changement d'usage (personnel/professionnel) ou ajout d'equipements homologues (attelage) necessite une mise a jour de la carte grise.",
      },
      {
        question: "Faut-il un PV de la DREAL pour modifier sa carte grise ?",
        answer: "Oui, pour toute modification technique du vehicule, un proces-verbal de reception a titre isole (RTI) delivre par la DREAL ou un organisme agree est obligatoire. Ce document certifie que la modification est conforme aux normes en vigueur.",
      },
      {
        question: "Peut-on passer sa voiture a l'ethanol E85 et modifier la carte grise ?",
        answer: "Oui, apres l'installation d'un boitier E85 homologue par un installateur agree, vous recevez un certificat de conformite. Ce document permet de mettre a jour la carte grise avec le nouveau type de carburant. Cette modification peut ouvrir droit a une exoneration de taxe regionale dans certains departements.",
      },
      {
        question: "Comment faire passer un vehicule en carte grise collection ?",
        answer: "Le vehicule doit avoir plus de 30 ans et obtenir une attestation de la FFVE (Federation Francaise des Vehicules d'Epoque). Avec cette attestation, la carte grise peut etre modifiee pour passer en usage collection, ce qui dispense de controle technique periodique.",
      },
    ],
    keywords: ["modification carte grise", "changement caracteristiques vehicule", "carte grise collection", "modification carte grise pas cher"],
  },
  {
    code: "IMMAT_CYCLO",
    slug: "immatriculation-cyclomoteur",
    title: "Immatriculation Cyclomoteur",
    shortTitle: "Cyclomoteur",
    h1: "Immatriculation de Cyclomoteur et Scooter 50cc",
    metaTitle: "Immatriculation Cyclomoteur 50cc | Carte Grise Scooter",
    metaDescription: "Immatriculez votre cyclomoteur ou scooter 50cc en ligne. Obligatoire depuis 2011, service agree, traitement sous 24h. Faites votre demande maintenant.",
    icon: "Bike",
    description: "Immatriculation des cyclomoteurs et scooters de moins de 50cc",
    longDescription: "Depuis 2011, tous les cyclomoteurs (scooters 50cc, mobylettes) doivent etre immatricules avec une plaque au format SIV (AA-123-BB). Si votre vehicule possede encore une ancienne plaque departementale ou n'a jamais ete immatricule, cette demarche est obligatoire pour circuler legalement.\n\nL'immatriculation des cyclomoteurs concerne les vehicules a deux ou trois roues dont la cylindree ne depasse pas 50 cm3 (ou dont la puissance n'excede pas 4 kW pour les modeles electriques). Cette obligation s'applique aussi bien aux vehicules neufs qu'aux vehicules d'occasion.\n\nAvec Discount Carte Grise, la demarche est 100% en ligne. Vous recevez votre CPI par email et votre carte grise definitive par courrier. Il ne vous reste plus qu'a commander votre plaque d'immatriculation aupres d'un fabricant agree.",
    documents: [
      "Certificat de conformite ou ancien recepisse",
      "Piece d'identite",
      "Justificatif de domicile",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez les informations de votre cyclomoteur",
      "Envoyez les documents",
      "Recevez votre carte grise cyclomoteur",
    ],
    prixDescription: "L'immatriculation d'un cyclomoteur est soumise a la taxe fixe de 11 euros et a la redevance d'acheminement de 2,76 euros. Les cyclomoteurs sont exoneres de taxe regionale. Nos frais de dossier s'ajoutent pour la gestion de votre demande. Pas de frais supplementaires ni de couts caches.",
    faqs: [
      {
        question: "Est-ce obligatoire d'immatriculer un scooter 50cc ?",
        answer: "Oui, depuis le 1er juillet 2004 pour les neufs et depuis 2011 pour tous les cyclomoteurs. L'absence d'immatriculation est passible d'une amende de 135 euros. Tous les cyclomoteurs doivent avoir une plaque au format SIV.",
      },
      {
        question: "Quels documents faut-il pour immatriculer un cyclomoteur ?",
        answer: "Il vous faut le certificat de conformite du constructeur ou l'ancien recepisse, une piece d'identite en cours de validite et un justificatif de domicile de moins de 6 mois. Pour un cyclomoteur d'occasion, la carte grise barree par l'ancien proprietaire est egalement necessaire.",
      },
      {
        question: "Faut-il un permis pour conduire un cyclomoteur 50cc ?",
        answer: "Oui, depuis 2013, le permis AM (ancien BSR) est obligatoire pour conduire un cyclomoteur 50cc si vous etes ne apres le 1er janvier 1988. Les personnes nees avant cette date peuvent conduire sans permis specifique.",
      },
      {
        question: "Combien coute l'immatriculation d'un cyclomoteur ?",
        answer: "Le cout comprend la taxe fixe de 11 euros et la redevance d'acheminement de 2,76 euros. Les cyclomoteurs sont exoneres de taxe regionale. A cela s'ajoutent nos frais de dossier pour un traitement rapide de votre demande.",
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
