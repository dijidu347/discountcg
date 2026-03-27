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
  seoContent: string;
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
    longDescription: "Le changement de titulaire de la carte grise (certificat d'immatriculation) est obligatoire lors de l'achat d'un véhicule d'occasion. Cette démarche doit être effectuée dans les 30 jours suivant la date de cession indiquée sur le Cerfa 15776. Le non-respect de ce délai peut entraîner une amende forfaitaire de 135 euros.\n\nDepuis la réforme du Plan Préfectures Nouvelle Génération (PPNG) de 2017, il n'est plus possible de réaliser cette démarche au guichet d'une préfecture ou sous-préfecture. Le changement de titulaire se fait exclusivement en ligne, soit via le site officiel de l'ANTS (Agence Nationale des Titres Sécurisés), soit par l'intermédiaire d'un professionnel habilité comme Discount Carte Grise.\n\nEn tant que service agréé par le Ministère de l'Intérieur (habilitation N° 285046), nous traitons votre dossier sous 24h maximum. Vous recevez immédiatement un Certificat Provisoire d'Immatriculation (CPI) par email, valable un mois pour circuler en toute légalité. La carte grise définitive vous est ensuite envoyée par courrier recommandé.\n\nNotre service simplifie la procédure : téléchargez vos documents, nous vérifions leur conformité, et nous effectuons toutes les démarches auprès de l'administration. Pas de file d'attente, pas de rendez-vous, pas de stress.",
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
      {
        question: "Que risque-t-on si on ne fait pas sa carte grise dans les 30 jours ?",
        answer: "Le non-respect du délai de 30 jours pour effectuer le changement de titulaire est passible d'une amende forfaitaire de 135 euros (contravention de 4e classe). De plus, en cas de contrôle routier, votre véhicule peut être immobilisé si la carte grise n'est pas à votre nom.",
      },
      {
        question: "Faut-il un contrôle technique pour faire sa carte grise ?",
        answer: "Le contrôle technique est obligatoire pour les véhicules de plus de 4 ans lors d'un changement de titulaire. Il doit dater de moins de 6 mois au moment de la vente (ou de moins de 2 mois en cas de contre-visite). Les véhicules de collection, les deux-roues et les véhicules de moins de 4 ans en sont dispensés.",
      },
    ],
    prixDescription: "Le tarif de votre carte grise dépend de la puissance fiscale du véhicule et du prix du cheval fiscal dans votre département de résidence. En 2026, le cheval fiscal varie de 30 euros (Mayotte) à 68,95 euros (Île-de-France). À cela s'ajoutent la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros), la taxe CO2 pour les véhicules polluants et nos frais de dossier à partir de 30 euros. Pour les véhicules de plus de 10 ans, une réduction de 50% sur la taxe régionale s'applique dans la plupart des départements. Discount Carte Grise vous garantit une carte grise pas chère avec le meilleur prix du marché. Utilisez notre simulateur pour obtenir le prix exact en quelques secondes.",
    seoContent: "Le changement de titulaire d'un certificat d'immatriculation est l'une des démarches les plus fréquentes auprès de l'administration française. Chaque année, plus de 5 millions de mutations de carte grise sont effectuées en France. Que vous achetiez une voiture d'occasion auprès d'un particulier ou d'un professionnel, la mise à jour de la carte grise à votre nom est indispensable.\n\nLe vendeur doit barrer la carte grise, inscrire la mention \"vendu le\" suivie de la date et de l'heure, et signer le document. Il dispose ensuite de 15 jours pour effectuer sa déclaration de cession en ligne. De son côté, l'acheteur a 30 jours pour demander la nouvelle carte grise à son nom. Passé ce délai, une amende de 135 euros peut être infligée.\n\nAvec Discount Carte Grise, bénéficiez d'un service rapide, fiable et au meilleur tarif. Notre plateforme en ligne vous guide étape par étape et nos experts vérifient chaque document pour éviter tout rejet de dossier. Commandez votre carte grise en ligne en toute sérénité.",
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
    longDescription: "La déclaration de cession (Cerfa 15776) est une démarche administrative obligatoire lors de la vente ou du don d'un véhicule. Elle officialise le transfert de propriété et protège le vendeur contre toute responsabilité en cas d'infraction commise par l'acheteur après la transaction.\n\nLe vendeur dispose d'un délai de 15 jours suivant la date de la vente pour effectuer cette déclaration auprès de l'administration. Sans cette formalité, il reste juridiquement responsable du véhicule : contraventions, amendes de stationnement et même accidents pourraient lui être imputés.\n\nLa déclaration de cession génère un code de cession à 5 caractères, indispensable pour que l'acheteur puisse réaliser sa demande de carte grise. Ce code prouve que la vente a bien été déclarée officiellement. Avec Discount Carte Grise, le formulaire Cerfa 15776 est rempli automatiquement et vous recevez votre code de cession immédiatement par email.\n\nCette démarche concerne aussi bien les véhicules automobiles que les deux-roues, camping-cars, utilitaires et remorques. Elle s'applique que la cession soit à titre onéreux (vente) ou à titre gratuit (don).",
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
      {
        question: "Quel est le délai pour faire une déclaration de cession ?",
        answer: "Le vendeur dispose de 15 jours après la date de vente pour effectuer la déclaration de cession. Passé ce délai, il reste responsable du véhicule et des éventuelles infractions commises par le nouveau détenteur. Il est donc recommandé de faire cette démarche le jour même de la vente.",
      },
      {
        question: "Que faire si l'acheteur ne fait pas sa carte grise après la cession ?",
        answer: "Si l'acheteur ne fait pas sa carte grise dans les 30 jours, vous pouvez signaler la situation à la préfecture. Grâce à votre déclaration de cession, vous serez protégé en cas d'infraction. Vous pouvez également contacter l'acheteur pour lui rappeler son obligation légale.",
      },
      {
        question: "Peut-on faire une déclaration de cession pour un véhicule hors d'usage (VHU) ?",
        answer: "Non, pour un véhicule destiné à la destruction, vous devez effectuer une déclaration de destruction auprès d'un centre VHU (Véhicules Hors d'Usage) agréé. Ce centre vous remettra un certificat de destruction qui officialise la fin de vie du véhicule.",
      },
      {
        question: "Faut-il barrer la carte grise lors de la vente ?",
        answer: "Oui, le vendeur doit obligatoirement barrer la carte grise en diagonale, inscrire la mention \"vendu le\" ou \"cédé le\" suivie de la date et de l'heure exacte, et signer le document. Cette formalité est indispensable pour que l'acheteur puisse faire sa carte grise.",
      },
    ],
    prixDescription: "La déclaration de cession est proposée à un tarif forfaitaire à partir de 19,90 euros. Ce prix inclut le remplissage automatique du Cerfa 15776, la transmission à l'administration et l'envoi du code de cession par email. Sur le site de l'ANTS, la démarche est gratuite mais souvent complexe et sujette à des bugs. Avec Discount Carte Grise, aucun frais caché ni taxe supplémentaire : tout est compris dans le tarif annoncé.",
    seoContent: "La déclaration de cession est une formalité souvent négligée par les vendeurs de véhicules, pourtant elle est essentielle pour se dégager de toute responsabilité après la vente. En France, de nombreux automobilistes reçoivent encore des amendes pour des infractions commises par l'acheteur faute d'avoir déclaré la cession à temps.\n\nLe processus est simple : le vendeur et l'acheteur remplissent ensemble le Cerfa 15776 en trois exemplaires. Chacun conserve un exemplaire et le troisième est transmis à l'administration. Chez Discount Carte Grise, nous simplifions cette étape en générant automatiquement le formulaire et en le transmettant directement au SIV.\n\nQue vous vendiez une voiture, un scooter, un utilitaire ou une remorque, la déclaration de cession est obligatoire. N'attendez pas : déclarez votre vente dès aujourd'hui pour éviter les mauvaises surprises.",
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
    longDescription: "La déclaration d'achat est une démarche obligatoire pour les professionnels de l'automobile qui achètent un véhicule d'occasion auprès d'un particulier ou d'un autre professionnel. Elle permet de notifier l'administration du changement de détention du véhicule et de le placer sous le régime de la détention professionnelle.\n\nContrairement au changement de titulaire classique, la déclaration d'achat n'entraîne pas l'édition d'une nouvelle carte grise immédiate. Le véhicule reste sous l'identité administrative de l'ancien propriétaire jusqu'à sa revente, moment où le nouveau titulaire effectuera le changement de carte grise à son nom.\n\nCette démarche doit être effectuée dans les 15 jours suivant l'acquisition du véhicule. Elle est principalement utilisée par les garagistes, les concessionnaires, les marchands automobiles et les sociétés de négoce de véhicules. Le professionnel doit justifier de son activité via un extrait Kbis ou une carte professionnelle.\n\nAvec Discount Carte Grise, la déclaration d'achat est traitée immédiatement. Vous recevez votre accusé de réception par email, vous permettant de justifier la détention légale du véhicule en cas de contrôle.",
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
      {
        question: "Quelle est la différence entre déclaration d'achat et changement de titulaire ?",
        answer: "La déclaration d'achat est réservée aux professionnels et ne génère pas de nouvelle carte grise. Le véhicule est placé en détention professionnelle. Le changement de titulaire, lui, concerne la revente au client final et entraîne l'édition d'une nouvelle carte grise au nom de l'acheteur.",
      },
      {
        question: "Un particulier peut-il faire une déclaration d'achat ?",
        answer: "Non, la déclaration d'achat est exclusivement réservée aux professionnels de l'automobile disposant d'un statut commercial dans le secteur. Un particulier qui achète un véhicule doit effectuer un changement de titulaire classique.",
      },
      {
        question: "Que se passe-t-il si le professionnel ne fait pas la déclaration d'achat ?",
        answer: "Le défaut de déclaration d'achat dans les 15 jours est une infraction passible d'une amende. De plus, le véhicule reste associé à l'ancien propriétaire qui pourrait recevoir des contraventions. Le professionnel s'expose également à des sanctions lors de contrôles administratifs.",
      },
      {
        question: "Un garagiste peut-il rouler avec un véhicule sous déclaration d'achat ?",
        answer: "Un véhicule sous déclaration d'achat peut circuler dans le cadre de l'activité professionnelle (essai, convoyage, réparation) à condition que le professionnel dispose de plaques W garage. Pour un usage sur la voie publique au-delà de ces situations, une immatriculation est nécessaire.",
      },
      {
        question: "Combien de temps un véhicule peut-il rester sous déclaration d'achat ?",
        answer: "Il n'y a pas de durée maximale légale pour la détention professionnelle. Toutefois, un véhicule qui reste trop longtemps sans être revendu peut attirer l'attention de l'administration. En pratique, la plupart des professionnels revendent le véhicule dans les quelques mois suivant l'achat.",
      },
    ],
    prixDescription: "La déclaration d'achat est proposée à un tarif forfaitaire à partir de 19,90 euros. Ce prix inclut la gestion complète de la déclaration auprès de l'administration et l'envoi de l'accusé de réception par email. Contrairement au changement de titulaire, aucune taxe régionale n'est due car il n'y a pas d'édition de nouvelle carte grise. Pas de frais supplémentaires ni de mauvaise surprise.",
    seoContent: "La déclaration d'achat par un professionnel de l'automobile est une étape clé dans le circuit de revente de véhicules d'occasion. Elle permet aux garagistes, concessionnaires et négociants de détenir légalement un véhicule sans avoir à l'immatriculer à leur nom, ce qui évite des frais de carte grise inutiles.\n\nEn France, des milliers de transactions professionnelles nécessitent chaque jour cette déclaration. Le professionnel doit impérativement disposer d'un numéro SIREN valide et exercer une activité dans le secteur automobile pour pouvoir effectuer cette démarche.\n\nDiscount Carte Grise accompagne les professionnels de l'automobile dans toutes leurs démarches administratives. Notre service en ligne permet de gagner un temps précieux et d'éviter les erreurs qui pourraient retarder la revente du véhicule. Simplifiez votre gestion administrative avec notre plateforme dédiée aux professionnels.",
    keywords: ["déclaration achat véhicule", "achat voiture occasion professionnel", "déclaration achat pas cher"],
  },
  {
    code: "CHGT_ADRESSE",
    slug: "changement-adresse-carte-grise",
    title: "Changement d'Adresse",
    shortTitle: "demande de changement d'adresse",
    h1: "Changement d'Adresse sur la Carte Grise",
    metaTitle: "Changement d'Adresse Carte Grise | Démarche en Ligne",
    metaDescription: "Mettez à jour l'adresse de votre carte grise après un déménagement. Démarche obligatoire sous 30 jours, traitement rapide et pas cher. Lancez votre demande en ligne.",
    icon: "MapPin",
    description: "Mettez à jour votre adresse sur votre carte grise après un déménagement",
    longDescription: "Le changement d'adresse sur la carte grise est une obligation légale à effectuer dans les 30 jours suivant un déménagement, conformément à l'article R322-7 du Code de la route. Le non-respect de cette obligation est passible d'une amende forfaitaire de 135 euros.\n\nCette démarche concerne tous les véhicules immatriculés au nom du titulaire : voitures, motos, scooters, utilitaires, camping-cars et remorques. Chaque véhicule doit faire l'objet d'une demande distincte. Si vous possédez plusieurs véhicules, chaque carte grise doit être mise à jour individuellement.\n\nLes trois premiers changements d'adresse donnent lieu à l'envoi d'une étiquette autocollante à coller sur la carte grise dans l'espace prévu (rubrique C.3). À partir du quatrième changement, une nouvelle carte grise est automatiquement éditée avec la nouvelle adresse. Le numéro d'immatriculation du véhicule ne change pas.\n\nBien que gratuite sur le site de l'ANTS, cette démarche peut s'avérer complexe en raison de la plateforme parfois instable. Discount Carte Grise vous simplifie la procédure avec un traitement rapide et fiable.",
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
      {
        question: "Que risque-t-on si on ne change pas l'adresse sur la carte grise ?",
        answer: "Le défaut de mise à jour de l'adresse dans les 30 jours est passible d'une amende forfaitaire de 135 euros (contravention de 4e classe). De plus, vous ne recevrez pas les courriers liés à votre véhicule (contraventions, rappels de contrôle technique) à votre nouvelle adresse.",
      },
      {
        question: "Peut-on changer l'adresse de plusieurs véhicules en même temps ?",
        answer: "Chaque véhicule nécessite une demande séparée. Si vous possédez plusieurs véhicules, vous devez effectuer autant de changements d'adresse que de cartes grises à mettre à jour. Discount Carte Grise peut gérer l'ensemble de vos véhicules en parallèle.",
      },
      {
        question: "Où coller l'étiquette de changement d'adresse sur la carte grise ?",
        answer: "L'étiquette de changement d'adresse doit être collée dans la rubrique C.3 de votre carte grise, dans l'espace prévu à cet effet en bas du document. Veillez à ne pas recouvrir d'autres informations importantes.",
      },
      {
        question: "Le changement d'adresse modifie-t-il le numéro d'immatriculation ?",
        answer: "Non, avec le système SIV (AA-123-BB), le numéro d'immatriculation est attribué à vie au véhicule et ne change jamais, quel que soit le nombre de déménagements ou de changements de propriétaire.",
      },
    ],
    prixDescription: "Le changement d'adresse est gratuit les 3 premières fois sur le site de l'ANTS. Au-delà, une nouvelle carte grise est éditée avec la taxe fixe de 11 euros et la redevance d'acheminement de 2,76 euros. Nos frais de dossier s'ajoutent pour un traitement simplifié et rapide. Comparé aux tracas de la plateforme ANTS souvent en maintenance, notre service vous fait gagner un temps précieux pour quelques euros seulement.",
    seoContent: "Chaque année en France, des millions de personnes déménagent et doivent mettre à jour l'adresse de leur carte grise. Cette formalité administrative, bien que simple en apparence, est souvent oubliée ou reportée par les automobilistes. Pourtant, une carte grise avec une adresse obsolète peut entraîner des complications lors d'un contrôle routier ou pour recevoir vos courriers administratifs.\n\nLe changement d'adresse sur le certificat d'immatriculation est à effectuer auprès de l'ANTS ou d'un professionnel habilité. Il n'est plus possible de le faire en préfecture depuis 2017. L'adresse figurant sur la carte grise détermine le département de rattachement fiscal du véhicule, ce qui peut impacter le montant de la taxe régionale lors d'un futur changement de titulaire.\n\nDiscount Carte Grise vous accompagne dans cette démarche obligatoire. Notre service en ligne est rapide, fiable et vous évite les difficultés techniques fréquentes sur le portail officiel de l'ANTS.",
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
    longDescription: "En cas de perte, vol ou détérioration de votre carte grise, la demande de duplicata est une démarche obligatoire pour continuer à circuler en toute légalité. Le duplicata est un nouveau certificat d'immatriculation portant les mêmes informations que l'original, mais avec un nouveau numéro de formule.\n\nEn cas de vol, il est impératif de déposer une plainte auprès de la police ou de la gendarmerie avant de demander le duplicata. Le récépissé de dépôt de plainte fait partie des documents obligatoires du dossier. Pour une perte, une simple déclaration sur l'honneur suffit.\n\nLa démarche de duplicata annule automatiquement l'ancien certificat d'immatriculation, ce qui le rend inutilisable. C'est une mesure de sécurité importante, notamment en cas de vol, pour éviter toute utilisation frauduleuse du document original.\n\nAvec Discount Carte Grise, votre demande de duplicata est traitée sous 24h. Vous recevez un CPI par email vous permettant de circuler immédiatement, puis le duplicata définitif par courrier recommandé.",
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
      {
        question: "Peut-on rouler sans carte grise en attendant le duplicata ?",
        answer: "Oui, dès la validation de votre dossier, vous recevez un Certificat Provisoire d'Immatriculation (CPI) par email. Ce document vous autorise à circuler pendant un mois en attendant de recevoir votre duplicata définitif par courrier recommandé.",
      },
      {
        question: "Faut-il déposer plainte en cas de perte de carte grise ?",
        answer: "En cas de perte, une déclaration de perte sur l'honneur suffit. En revanche, en cas de vol, le dépôt de plainte auprès de la police ou de la gendarmerie est obligatoire. Le récépissé de dépôt de plainte doit être joint au dossier de demande de duplicata.",
      },
      {
        question: "Le duplicata a-t-il le même numéro d'immatriculation ?",
        answer: "Oui, le duplicata conserve le même numéro d'immatriculation que l'original. Seul le numéro de formule (en haut à droite de la carte grise) change. L'ancien document est automatiquement invalidé dans le système SIV.",
      },
      {
        question: "Peut-on vendre un véhicule avec un duplicata de carte grise ?",
        answer: "Oui, le duplicata a exactement la même valeur juridique que l'original. Vous pouvez tout à fait vendre votre véhicule en fournissant le duplicata comme carte grise. L'acheteur pourra effectuer son changement de titulaire normalement.",
      },
      {
        question: "Que faire si on retrouve l'ancienne carte grise après avoir demandé un duplicata ?",
        answer: "L'ancien certificat d'immatriculation est automatiquement annulé dès l'émission du duplicata. Si vous retrouvez l'original, il est désormais invalide et doit être détruit. Seul le duplicata fait foi.",
      },
    ],
    prixDescription: "Le duplicata de carte grise est soumis à la taxe fixe de 11 euros et à la redevance d'acheminement de 2,76 euros. Aucune taxe régionale n'est due, ce qui en fait une démarche peu coûteuse. Nos frais de dossier couvrent la gestion complète de votre demande, de la vérification des documents à l'envoi du duplicata. Pas de frais cachés ni de mauvaise surprise sur la facture.",
    seoContent: "Perdre sa carte grise ou se la faire voler est une situation stressante qui touche des milliers d'automobilistes chaque année. Le duplicata de carte grise permet de retrouver rapidement un document officiel pour circuler en toute légalité.\n\nIl est important de réagir rapidement en cas de disparition de votre carte grise. Sans ce document, vous êtes en infraction et risquez une amende de 135 euros en cas de contrôle routier. La demande de duplicata est la seule solution pour régulariser votre situation.\n\nDiscount Carte Grise traite votre demande de duplicata en priorité. Notre service agréé garantit un traitement sous 24h avec envoi immédiat du CPI par email. Que votre carte grise soit perdue, volée ou illisible, nous prenons en charge l'intégralité de la démarche administrative pour vous.",
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
    prixDescription: "Le prix de la carte grise d'un véhicule neuf dépend de la puissance fiscale, du tarif du cheval fiscal dans votre département et du taux d'émission de CO2. La taxe sur les émissions polluantes (malus écologique) peut s'ajouter pour les véhicules dépassant 118 g de CO2/km en 2026. Les véhicules électriques et hybrides rechargeables bénéficient d'exonérations de taxe régionale dans la plupart des départements. Nos frais de dossier sont à partir de 30 euros, souvent moins chers que ceux facturés par les concessionnaires.",
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
      {
        question: "Le concessionnaire est-il obligé de faire la carte grise ?",
        answer: "Non, le concessionnaire n'est pas obligé de s'en charger, bien que la plupart proposent ce service moyennant des frais. Vous êtes libre de réaliser la démarche vous-même ou de la confier à un professionnel agréé comme Discount Carte Grise, souvent à un tarif plus avantageux.",
      },
      {
        question: "Qu'est-ce que le malus écologique pour un véhicule neuf ?",
        answer: "Le malus écologique est une taxe additionnelle appliquée aux véhicules neufs émettant plus de 118 g de CO2/km en 2026. Son montant peut atteindre plusieurs dizaines de milliers d'euros pour les véhicules les plus polluants. Les véhicules électriques et hybrides rechargeables en sont généralement exonérés.",
      },
      {
        question: "Un véhicule neuf a-t-il besoin d'un contrôle technique ?",
        answer: "Non, les véhicules neufs sont dispensés de contrôle technique pendant les 4 premières années suivant leur première immatriculation. Le premier contrôle technique doit être effectué dans les 6 mois précédant le 4e anniversaire de la mise en circulation.",
      },
    ],
    seoContent: "L'achat d'un véhicule neuf est un moment important qui s'accompagne de formalités administratives incontournables. La première immatriculation est l'acte officiel qui donne au véhicule son identité administrative et lui permet de circuler légalement sur les routes françaises.\n\nLe coût de la carte grise pour un véhicule neuf peut varier considérablement selon la puissance fiscale, le type de motorisation et votre département de résidence. Les véhicules électriques bénéficient d'une exonération totale de taxe régionale dans la majorité des départements, ce qui réduit significativement le prix de la carte grise.\n\nDiscount Carte Grise propose un service d'immatriculation pour véhicules neufs au meilleur tarif. Que vous ayez acheté votre véhicule chez un concessionnaire français ou en import, notre équipe d'experts s'occupe de toutes les formalités. Utilisez notre simulateur en ligne pour connaître le prix exact de votre carte grise véhicule neuf.",
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
    longDescription: "Lorsqu'un propriétaire de véhicule décède, les héritiers doivent effectuer le changement de titulaire de la carte grise pour pouvoir utiliser ou vendre le véhicule légalement. Cette démarche nécessite des documents spécifiques liés à la succession et peut s'avérer complexe sur le plan administratif.\n\nL'héritier désigné dans l'acte de succession doit fournir une attestation notariale ou un certificat d'hérédité prouvant ses droits sur le véhicule. Si plusieurs héritiers sont concernés, ils doivent se mettre d'accord sur l'attribution du véhicule et éventuellement désigner un bénéficiaire unique.\n\nIl n'existe pas de délai légal strict pour effectuer cette démarche, mais il est recommandé de la réaliser rapidement. Un véhicule dont la carte grise est au nom d'une personne décédée ne peut pas être vendu, assuré correctement, ni soumis au contrôle technique.\n\nDiscount Carte Grise vous accompagne dans cette démarche délicate en vérifiant la conformité de vos documents et en gérant l'intégralité des formalités administratives. Notre équipe traite les dossiers de succession avec discrétion et rapidité.",
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
      {
        question: "Peut-on vendre directement un véhicule hérité sans faire la carte grise ?",
        answer: "Non, vous ne pouvez pas vendre un véhicule dont la carte grise est au nom d'une personne décédée sans effectuer au préalable le changement de titulaire. La carte grise doit d'abord être mise à votre nom avant de pouvoir procéder à la vente.",
      },
      {
        question: "Que faire si plusieurs héritiers veulent le véhicule ?",
        answer: "En cas de plusieurs héritiers, un accord doit être trouvé pour désigner le bénéficiaire du véhicule. Le notaire en charge de la succession peut arbitrer. Une attestation signée par tous les héritiers désignant le nouveau titulaire peut être demandée par l'administration.",
      },
      {
        question: "Le contrôle technique est-il nécessaire pour une carte grise succession ?",
        answer: "Oui, si le véhicule a plus de 4 ans, un contrôle technique de moins de 6 mois est nécessaire pour effectuer le changement de titulaire, même dans le cadre d'une succession. Cette obligation est identique à celle d'un changement de titulaire classique.",
      },
      {
        question: "Peut-on assurer un véhicule en attendant la carte grise succession ?",
        answer: "Oui, la plupart des assureurs acceptent de couvrir un véhicule hérité à titre provisoire, sous réserve de présenter l'acte de décès et le certificat d'hérédité. Il est cependant recommandé de régulariser la carte grise rapidement pour bénéficier d'une couverture complète.",
      },
      {
        question: "Faut-il payer des droits de succession sur le véhicule ?",
        answer: "Le véhicule fait partie de l'actif successoral et est soumis aux droits de succession selon les règles fiscales en vigueur. Le paiement de la carte grise (taxe régionale, frais de dossier) est distinct des droits de succession et doit être réglé par le nouveau titulaire.",
      },
    ],
    prixDescription: "Le prix de la carte grise en cas de succession dépend de la puissance fiscale du véhicule et du tarif du cheval fiscal de votre département. Les mêmes taxes s'appliquent que pour un changement de titulaire classique : taxe régionale, taxe fixe (11 euros), redevance d'acheminement (2,76 euros) et nos frais de dossier. Pour les véhicules de plus de 10 ans, la réduction de 50% sur la taxe régionale s'applique également dans ce cadre.",
    seoContent: "Le transfert de carte grise suite à un décès est une démarche souvent méconnue qui survient dans un contexte émotionnel difficile. En tant que service agréé, Discount Carte Grise prend en charge cette procédure administrative avec professionnalisme et discrétion.\n\nLe certificat d'hérédité ou l'attestation notariale est la pièce maîtresse du dossier. Ce document officiel atteste de vos droits en tant qu'héritier et vous autorise à demander le transfert du certificat d'immatriculation. Pour les successions simples (conjoint survivant, enfant unique), un certificat d'hérédité délivré par la mairie peut suffire.\n\nNotre équipe connaît parfaitement les spécificités de cette démarche et vérifie chaque document pour garantir l'acceptation de votre dossier du premier coup. Confiez-nous votre demande de carte grise succession pour un traitement rapide et sans stress.",
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
    longDescription: "Le quitus fiscal (certificat fiscal 846A) est un document obligatoire pour immatriculer en France un véhicule acheté à l'étranger. Il atteste que la TVA a bien été acquittée ou que le véhicule en est exonéré. Sans ce document, il est impossible d'obtenir une carte grise française.\n\nLe quitus fiscal doit être demandé auprès du service des impôts des entreprises (SIE) dont dépend le domicile de l'acquéreur. Pour un véhicule d'occasion acheté dans l'Union Européenne, la TVA n'est généralement pas due si elle a déjà été payée dans le pays d'origine. Pour un véhicule neuf (moins de 6 mois ou moins de 6 000 km), la TVA française de 20% est exigible.\n\nLa demande nécessite la facture d'achat originale, la carte grise étrangère et un justificatif d'identité. Le délai de traitement varie selon les services fiscaux, de quelques jours à plusieurs semaines. Discount Carte Grise accélère ce processus en constituant un dossier complet et conforme dès le départ.\n\nNotre service gère l'intégralité de la procédure : vérification de la situation fiscale du véhicule, constitution du dossier, transmission aux services compétents et suivi jusqu'à l'obtention du quitus.",
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
      {
        question: "Doit-on payer la TVA sur un véhicule importé d'occasion ?",
        answer: "Pour un véhicule d'occasion acheté dans l'Union Européenne (plus de 6 mois et plus de 6 000 km), la TVA n'est généralement pas due en France si elle a été acquittée dans le pays d'origine. Le quitus fiscal attestera de cette exonération. Pour un véhicule considéré comme neuf (moins de 6 mois ou moins de 6 000 km), la TVA française de 20% est exigible.",
      },
      {
        question: "Quel est le délai pour obtenir un quitus fiscal ?",
        answer: "Le délai varie selon les services fiscaux : de quelques jours à plusieurs semaines selon la période et le volume de demandes. Avec Discount Carte Grise, nous constituons un dossier complet dès le départ pour éviter les allers-retours et accélérer le traitement.",
      },
      {
        question: "Peut-on immatriculer un véhicule importé sans quitus fiscal ?",
        answer: "Non, le quitus fiscal est un document obligatoire pour toute immatriculation d'un véhicule importé en France. Sans ce certificat, l'administration refusera la demande de carte grise. Il est donc essentiel de l'obtenir avant de lancer la procédure d'immatriculation.",
      },
      {
        question: "Le quitus fiscal est-il nécessaire pour un véhicule importé du Royaume-Uni ?",
        answer: "Oui, depuis le Brexit, le Royaume-Uni n'est plus membre de l'Union Européenne. Les véhicules importés du Royaume-Uni sont soumis aux mêmes règles que ceux provenant de pays tiers : quitus fiscal obligatoire, et la TVA ainsi que les droits de douane peuvent s'appliquer.",
      },
    ],
    prixDescription: "La demande de quitus fiscal auprès de l'administration fiscale est gratuite. Nos frais de dossier couvrent la constitution du dossier, la transmission aux services fiscaux et le suivi de votre demande jusqu'à l'obtention du certificat 846A. En cas de TVA exigible sur un véhicule neuf importé, celle-ci devra être réglée directement auprès du Trésor Public. Aucune taxe supplémentaire de notre part.",
    seoContent: "Importer un véhicule de l'étranger est une démarche de plus en plus courante, que ce soit pour bénéficier de prix attractifs dans d'autres pays européens ou pour acquérir un modèle non disponible en France. Le quitus fiscal constitue la première étape administrative indispensable de ce processus.\n\nLe certificat fiscal 846A est délivré par le service des impôts des entreprises (SIE) et concerne tous les véhicules importés, qu'ils soient neufs ou d'occasion, provenant de l'Union Européenne ou de pays tiers. Ce document est exigé par l'administration lors de la demande d'immatriculation en France.\n\nDiscount Carte Grise maîtrise parfaitement les procédures d'importation automobile et vous accompagne de A à Z. De la demande de quitus fiscal à l'obtention de votre carte grise définitive, notre équipe d'experts gère chaque étape pour vous garantir une importation réussie et sans tracas.",
    keywords: ["quitus fiscal", "certificat fiscal 846A", "véhicule importé France", "TVA véhicule occasion étranger", "quitus fiscal pas cher"],
  },
  {
    code: "CPI_WW",
    slug: "immatriculation-ww-provisoire",
    title: "Immatriculation WW Provisoire",
    shortTitle: "immatriculation WW provisoire",
    h1: "Certificat Provisoire d'Immatriculation WW - CPI WW en Ligne",
    metaTitle: "CPI WW en Ligne Pas Cher",
    metaDescription: "Obtenez votre Certificat Provisoire d'Immatriculation WW (CPI WW) pour votre véhicule importé. Démarche 100% en ligne, service agréé, traitement rapide.",
    icon: "Globe",
    description: "Certificat Provisoire d'Immatriculation WW pour véhicule importé",
    longDescription: "Le Certificat Provisoire d'Immatriculation WW (CPI WW) est un document temporaire permettant de faire circuler un véhicule importé en France en attendant l'immatriculation définitive. Les plaques WW (doubles W) sont des plaques d'immatriculation provisoires attribuées aux véhicules en instance d'immatriculation.\n\nCette démarche s'adresse aux particuliers et professionnels qui ont importé un véhicule de l'étranger et qui souhaitent circuler légalement pendant la constitution du dossier d'immatriculation définitive. Le CPI WW est valable 1 mois et peut être renouvelé si nécessaire.\n\nAvec Discount Carte Grise, nous gérons l'ensemble du processus : dépôt de votre dossier, obtention du CPI WW et suivi jusqu'à l'immatriculation définitive. Une fois les documents réunis (quitus fiscal, COC), votre carte grise définitive est éditée.",
    documents: [
      "Carte grise étrangère",
      "Facture d'achat du véhicule",
      "Certificat de conformité européen (COC)",
      "Quitus fiscal (formulaire 846A)",
      "Pièce d'identité",
      "Justificatif de domicile",
      "Contrôle technique français (si véhicule de plus de 4 ans)",
    ],
    delai: "48 à 72h",
    steps: [
      "Envoyez les documents du véhicule importé",
      "Nous constituons le dossier et obtenons le quitus fiscal si nécessaire",
      "Recevez votre CPI WW par email pour circuler immédiatement",
      "La carte grise définitive est envoyée par courrier recommandé",
    ],
    prixDescription: "Le prix du CPI WW dépend de la puissance fiscale du véhicule et du tarif du cheval fiscal de votre département. La taxe régionale, la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros) et un éventuel malus écologique s'appliquent. Nos frais de dossier incluent la gestion complète de l'import et l'obtention du CPI WW.",
    faqs: [
      {
        question: "Qu'est-ce qu'un CPI WW ?",
        answer: "Le CPI WW (Certificat Provisoire d'Immatriculation avec plaques WW) est un document temporaire délivré aux véhicules importés en attente d'immatriculation définitive. Il permet de circuler légalement en France pendant 1 mois.",
      },
      {
        question: "Quand doit-on demander un CPI WW ?",
        answer: "Le CPI WW est nécessaire lorsque vous importez un véhicule de l'étranger et que vous souhaitez le faire circuler avant d'obtenir votre immatriculation définitive. Il est particulièrement utile pendant la constitution du dossier (quitus fiscal, contrôle technique, COC).",
      },
      {
        question: "Combien de temps est valable un CPI WW ?",
        answer: "Un CPI WW est valable 1 mois. Si l'immatriculation définitive n'est pas obtenue dans ce délai, il peut être renouvelé. Avec Discount Carte Grise, nous suivons votre dossier jusqu'à l'obtention de la carte grise définitive.",
      },
      {
        question: "Quelle est la différence entre CPI et CPI WW ?",
        answer: "Le CPI classique est délivré lors d'une immatriculation standard en France. Le CPI WW est spécifiquement délivré pour les véhicules importés en attente d'immatriculation définitive, avec des plaques provisoires en WW.",
      },
      {
        question: "Peut-on voyager à l'étranger avec des plaques WW ?",
        answer: "Les plaques WW sont des immatriculations provisoires françaises. Leur validité à l'étranger dépend des accords entre pays. En règle générale, il est déconseillé de voyager hors de France avec des plaques WW car certains pays ne les reconnaissent pas.",
      },
      {
        question: "Quels véhicules peuvent obtenir un CPI WW ?",
        answer: "Tous les véhicules importés peuvent bénéficier d'un CPI WW : voitures particulières, utilitaires, motos, camping-cars et remorques. Le véhicule doit être conforme aux normes européennes ou disposer d'une attestation de conformité.",
      },
      {
        question: "Que faire si le CPI WW expire et le dossier n'est pas complet ?",
        answer: "Si votre CPI WW expire avant d'avoir réuni tous les documents pour l'immatriculation définitive, vous devez demander un renouvellement. Le véhicule ne peut plus circuler avec un CPI WW expiré. Discount Carte Grise suit votre dossier pour anticiper cette situation.",
      },
    ],
    seoContent: "L'immatriculation provisoire WW est une étape incontournable pour les véhicules importés en France. Que vous ayez acheté votre véhicule en Allemagne, en Belgique, en Espagne ou dans tout autre pays, le CPI WW vous permet de circuler légalement sur le territoire français pendant la constitution de votre dossier d'immatriculation définitive.\n\nLes plaques WW (reconnaissables par leur format commençant par WW) sont attribuées temporairement et offrent une solution pratique pour les importateurs particuliers comme professionnels. Le processus d'importation nécessite plusieurs documents qui peuvent prendre du temps à obtenir : quitus fiscal, certificat de conformité, contrôle technique français.\n\nDiscount Carte Grise est spécialisé dans l'accompagnement des importations de véhicules. Notre connaissance approfondie des procédures administratives vous garantit un dossier traité efficacement, du CPI WW provisoire jusqu'à la carte grise définitive.",
    keywords: ["CPI WW", "immatriculation WW provisoire", "plaques WW", "certificat provisoire immatriculation import", "CPI WW pas cher", "immatriculation véhicule importé"],
  },
  {
    code: "COTITULAIRE",
    slug: "cotitulaire-carte-grise",
    title: "Ajout/Retrait Cotitulaire",
    shortTitle: "modification de cotitulaire",
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
      {
        question: "Le cotitulaire est-il responsable en cas d'infraction ?",
        answer: "Les infractions routières (excès de vitesse, stationnement) sont adressées au titulaire principal de la carte grise. Le cotitulaire n'est pas directement destinataire des contraventions, mais il partage la responsabilité civile liée à la propriété du véhicule.",
      },
      {
        question: "Peut-on ajouter un cotitulaire qui habite à une adresse différente ?",
        answer: "Oui, le cotitulaire peut avoir une adresse différente du titulaire principal. Cependant, l'adresse figurant sur la carte grise sera celle du titulaire principal. Le cotitulaire n'a pas besoin de résider au même domicile.",
      },
      {
        question: "Le cotitulaire peut-il assurer le véhicule à son nom ?",
        answer: "Oui, le cotitulaire figurant sur la carte grise peut souscrire une assurance au titre de copropriétaire du véhicule. Les deux titulaires peuvent être conducteurs principaux ou secondaires selon le contrat d'assurance choisi.",
      },
    ],
    seoContent: "L'ajout ou le retrait d'un cotitulaire sur la carte grise est une démarche fréquente, notamment lors d'événements de vie majeurs : mariage, PACS, divorce ou séparation. Le cotitulaire apparaît sur le certificat d'immatriculation à la rubrique C.4.1, officialisant le partage de propriété du véhicule.\n\nCette modification a des implications juridiques importantes. En cas de cotitularité, les deux personnes sont copropriétaires du véhicule au regard de la loi. Toute décision concernant le véhicule (vente, destruction, mise en fourrière) nécessite l'accord des deux parties.\n\nDiscount Carte Grise traite les demandes d'ajout et de retrait de cotitulaire avec rapidité. Notre service en ligne vous évite les complications administratives et vous garantit une carte grise mise à jour sous 24h. Que ce soit pour un mariage, un divorce ou tout autre changement de situation, faites votre démarche en quelques clics.",
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
      {
        question: "Combien de temps faut-il pour obtenir un PV de la DREAL ?",
        answer: "Le délai d'obtention d'un procès-verbal de réception à titre isolé (RTI) varie selon la DREAL et le type de modification. Comptez en moyenne 2 à 6 semaines. Ce délai est indépendant de la mise à jour de la carte grise, qui est traitée sous 48h par Discount Carte Grise une fois le PV obtenu.",
      },
      {
        question: "L'ajout d'un attelage nécessite-t-il une modification de carte grise ?",
        answer: "Oui, l'ajout d'un attelage de remorque doit être mentionné sur la carte grise à la rubrique correspondante. Un certificat d'installation délivré par un professionnel agréé est nécessaire. Cette mention est indispensable pour tracter une remorque en toute légalité.",
      },
      {
        question: "Peut-on modifier le genre d'un véhicule sur la carte grise ?",
        answer: "Oui, il est possible de changer le genre d'un véhicule (par exemple, de VP à VASP pour un aménagement camping-car). Cette modification nécessite un PV de la DREAL attestant la conformité des transformations et entraîne l'édition d'une nouvelle carte grise.",
      },
    ],
    seoContent: "La modification de carte grise concerne toute transformation technique apportée à un véhicule après sa première immatriculation. Qu'il s'agisse d'un passage au bioéthanol E85, de l'ajout d'un dispositif d'attelage, d'un changement de carrosserie ou d'une conversion en véhicule de collection, chaque modification doit être officiellement enregistrée.\n\nLa DREAL (Direction Régionale de l'Environnement, de l'Aménagement et du Logement) joue un rôle central dans ce processus en délivrant les procès-verbaux de réception nécessaires. Sans ce document, aucune modification technique ne peut être reportée sur la carte grise.\n\nDiscount Carte Grise facilite cette démarche en prenant en charge la mise à jour de votre certificat d'immatriculation dès réception de votre PV de la DREAL. Notre expertise dans les modifications de carte grise nous permet de traiter votre dossier efficacement et de vous livrer votre nouvelle carte grise dans les meilleurs délais.",
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
      {
        question: "Comment immatriculer un cyclomoteur sans carte grise ?",
        answer: "Pour un cyclomoteur qui n'a jamais été immatriculé (anciens modèles avant 2004), vous devez fournir le certificat de conformité du constructeur ou à défaut un récépissé de déclaration en préfecture. Discount Carte Grise vous aide à constituer votre dossier même dans les cas les plus complexes.",
      },
      {
        question: "Peut-on immatriculer un cyclomoteur électrique ?",
        answer: "Oui, les cyclomoteurs électriques dont la puissance n'excède pas 4 kW sont soumis aux mêmes obligations d'immatriculation que les modèles thermiques. Le processus est identique et les mêmes documents sont requis. Les véhicules électriques peuvent bénéficier d'aides à l'achat dans certaines régions.",
      },
      {
        question: "Faut-il une assurance pour un cyclomoteur 50cc ?",
        answer: "Oui, l'assurance responsabilité civile (au minimum au tiers) est obligatoire pour tout cyclomoteur, même s'il ne circule pas sur la voie publique. Rouler sans assurance est un délit passible d'une amende de 3 750 euros et d'autres sanctions (confiscation, suspension de permis).",
      },
    ],
    seoContent: "L'immatriculation des cyclomoteurs et scooters 50cc est une obligation légale depuis 2011. Tous les deux-roues motorisés de moins de 50 cm3 doivent désormais arborer une plaque d'immatriculation au format SIV (AA-123-BB), qu'ils soient neufs ou d'occasion.\n\nDe nombreuses mobylettes et anciens scooters circulent encore sans immatriculation conforme, exposant leurs propriétaires à une amende de 135 euros. Si votre cyclomoteur possède encore une ancienne plaque départementale ou n'a jamais été immatriculé, il est temps de régulariser votre situation.\n\nDiscount Carte Grise propose un service simple et rapide pour immatriculer votre cyclomoteur ou scooter 50cc. Notre équipe gère les cas classiques comme les situations plus complexes (véhicules anciens sans documents, cyclomoteurs sans carte grise). Faites votre demande en ligne et recevez votre carte grise cyclomoteur sous 24h.",
    keywords: ["immatriculation cyclomoteur", "carte grise scooter 50cc", "immatriculation mobylette", "immatriculation cyclomoteur pas cher"],
  },
  {
    code: "W_GARAGE",
    slug: "premiere-demande-w-garage",
    title: "Première Demande W Garage",
    shortTitle: "demande de plaques W garage",
    h1: "Première Demande de Plaques W Garage - Immatriculation Professionnelle",
    metaTitle: "Plaques W Garage en Ligne",
    metaDescription: "Obtenez vos plaques W garage pour votre activité professionnelle automobile. Première demande gérée en ligne, service agréé par l'État. Dossier traité sous 72h.",
    icon: "Wrench",
    description: "Plaques professionnelles W pour garages et professionnels de l'automobile",
    longDescription: "Les plaques W (ou plaques de garage) sont des immatriculations provisoires réservées aux professionnels de l'automobile (garagistes, concessionnaires, négociants en véhicules). Elles permettent de faire circuler des véhicules non immatriculés à titre définitif dans le cadre de l'activité professionnelle : essais, convoyage, présentation à la vente.\n\nLa première demande de plaques W garage nécessite de justifier de son statut de professionnel de l'automobile et de l'activité exercée. Une fois obtenues, ces plaques sont valables pour tous les véhicules de l'entreprise dans le cadre professionnel.\n\nAvec Discount Carte Grise, nous vous accompagnons dans la constitution de votre dossier de première demande et gérons l'ensemble de la procédure auprès de l'administration.",
    documents: [
      "Extrait Kbis de moins de 3 mois",
      "Justificatif d'activité professionnelle automobile",
      "Pièce d'identité du dirigeant",
      "Justificatif de domicile professionnel",
      "Attestation d'assurance professionnelle",
    ],
    delai: "48 à 72h",
    steps: [
      "Renseignez les informations de votre entreprise",
      "Envoyez les justificatifs professionnels requis",
      "Recevez vos plaques W garage et le certificat associé",
    ],
    prixDescription: "La première demande de plaques W garage est soumise à des frais administratifs fixes. Nos frais de dossier couvrent la constitution et le suivi de votre dossier auprès de l'administration. Des renouvellements annuels sont ensuite nécessaires.",
    faqs: [
      {
        question: "Qui peut obtenir des plaques W garage ?",
        answer: "Les plaques W garage sont réservées aux professionnels de l'automobile : garagistes, concessionnaires, marchands de véhicules, carrossiers, etc. Il faut justifier d'une activité professionnelle dans le secteur automobile et être inscrit au registre du commerce.",
      },
      {
        question: "À quoi servent les plaques W garage ?",
        answer: "Les plaques W permettent aux professionnels de faire circuler des véhicules non immatriculés définitivement : essais avant vente, convoyage, présentation à des clients, déplacement pour réparation. Elles sont valables pour toute la flotte de l'entreprise.",
      },
      {
        question: "Combien de plaques W peut-on obtenir ?",
        answer: "Le nombre de plaques W attribuées dépend du volume d'activité et de la nature de l'entreprise. Une demande initiale est instruite par la préfecture qui détermine le nombre de séries accordées.",
      },
      {
        question: "Quelle est la durée de validité des plaques W garage ?",
        answer: "Les plaques W garage sont valables un an et doivent être renouvelées chaque année. Le renouvellement nécessite de justifier de la continuité de l'activité professionnelle et de la validité de l'assurance professionnelle.",
      },
      {
        question: "Peut-on circuler avec des plaques W en dehors des horaires de travail ?",
        answer: "Les plaques W sont destinées à un usage strictement professionnel : essais, convoyage, présentation à la vente. L'utilisation à des fins personnelles en dehors du cadre professionnel constitue une infraction.",
      },
      {
        question: "Faut-il une assurance spécifique pour les plaques W ?",
        answer: "Oui, une assurance professionnelle couvrant les véhicules circulant sous plaques W est obligatoire. Cette assurance spécifique couvre les risques liés à l'activité professionnelle (essais, convoyage) et doit être souscrite auprès d'un assureur spécialisé.",
      },
      {
        question: "Un auto-entrepreneur peut-il obtenir des plaques W garage ?",
        answer: "Oui, un auto-entrepreneur exerçant une activité dans le secteur automobile peut demander des plaques W garage, à condition de justifier de son inscription au registre du commerce et de son activité professionnelle dans la filière automobile.",
      },
    ],
    seoContent: "Les plaques W garage sont un outil indispensable pour les professionnels de l'automobile en France. Elles permettent aux garagistes, concessionnaires et marchands de véhicules de faire circuler des véhicules non immatriculés dans le cadre de leur activité quotidienne.\n\nLa première demande de plaques W est une procédure administrative encadrée qui nécessite de justifier de son statut professionnel dans le secteur automobile. L'instruction du dossier est réalisée par la préfecture qui évalue le besoin en fonction de l'activité déclarée.\n\nDiscount Carte Grise accompagne les professionnels de l'automobile dans l'obtention de leurs plaques W garage. Notre connaissance des exigences administratives vous garantit un dossier complet accepté du premier coup. Gagnez du temps et concentrez-vous sur votre activité principale pendant que nous gérons vos formalités.",
    keywords: ["plaques W garage", "immatriculation professionnelle automobile", "première demande W garage", "plaques garage pas cher", "immatriculation pro véhicule", "W garage garagiste"],
  },
  {
    code: "ANNULATION_CPI_WW",
    slug: "annulation-cpi-ww",
    title: "Annulation d'un CPI WW",
    shortTitle: "annulation CPI WW",
    h1: "Annulation d'un CPI WW - Annuler une Immatriculation Provisoire",
    metaTitle: "Annuler CPI WW en Ligne",
    metaDescription: "Annulez votre CPI WW en ligne en cas d'erreur ou de changement de situation. Démarche rapide, service agréé par l'État. Lancez votre demande maintenant.",
    icon: "XCircle",
    description: "Annulation d'un Certificat Provisoire d'Immatriculation WW",
    longDescription: "L'annulation d'un CPI WW peut être nécessaire dans plusieurs situations : erreur dans le dossier d'immatriculation, renonciation à l'achat du véhicule importé, ou changement de situation personnelle. Cette démarche permet de clôturer officiellement le dossier d'immatriculation provisoire.\n\nIl est important d'annuler le CPI WW dans les meilleurs délais pour éviter tout problème administratif et fiscal. Une fois le CPI WW annulé, le véhicule ne peut plus circuler avec ces plaques provisoires.\n\nDiscount Carte Grise vous guide dans cette démarche souvent méconnue et gère l'ensemble des formalités auprès de l'administration pour vous.",
    documents: [
      "CPI WW original",
      "Pièce d'identité",
      "Justificatif du motif d'annulation",
      "Carte grise étrangère (si applicable)",
    ],
    delai: "24 à 48h",
    steps: [
      "Indiquez le numéro de votre CPI WW et le motif d'annulation",
      "Envoyez les documents justificatifs",
      "Recevez la confirmation d'annulation par email",
    ],
    prixDescription: "L'annulation d'un CPI WW est soumise à des frais de dossier forfaitaires. Aucune taxe régionale n'est due pour cette démarche administrative. Nos frais couvrent la gestion complète de l'annulation auprès de l'administration.",
    faqs: [
      {
        question: "Pourquoi annuler un CPI WW ?",
        answer: "L'annulation d'un CPI WW est nécessaire en cas d'erreur dans le dossier, de renonciation à l'achat du véhicule, de vente du véhicule avant immatriculation définitive ou de tout autre changement empêchant de finaliser l'immatriculation.",
      },
      {
        question: "Que se passe-t-il si on n'annule pas un CPI WW expiré ?",
        answer: "Un CPI WW non annulé et expiré peut créer des complications administratives. Il est recommandé d'annuler formellement le CPI WW pour clôturer le dossier et éviter toute confusion avec l'administration.",
      },
      {
        question: "Peut-on ré-immatriculer un véhicule après annulation d'un CPI WW ?",
        answer: "Oui, l'annulation d'un CPI WW ne signifie pas que le véhicule ne peut jamais être immatriculé. Si la situation change (nouveau propriétaire, nouveau dossier), une nouvelle demande d'immatriculation peut être effectuée.",
      },
      {
        question: "L'annulation d'un CPI WW donne-t-elle droit à un remboursement des taxes ?",
        answer: "L'annulation d'un CPI WW peut donner lieu à un remboursement partiel des taxes payées lors de la demande initiale, sous certaines conditions. Cette possibilité dépend de la situation et du motif d'annulation. Discount Carte Grise vous renseigne sur vos droits à remboursement.",
      },
      {
        question: "Quel est le délai pour annuler un CPI WW ?",
        answer: "Il n'y a pas de délai imposé pour demander l'annulation d'un CPI WW. Cependant, il est recommandé d'effectuer cette démarche dès que possible pour éviter toute complication administrative, notamment si le CPI WW est encore en cours de validité.",
      },
      {
        question: "Quels documents fournir pour annuler un CPI WW ?",
        answer: "Pour annuler un CPI WW, vous devez fournir le CPI WW original, votre pièce d'identité, un justificatif du motif d'annulation et, le cas échéant, la carte grise étrangère du véhicule. Si le véhicule a été revendu, un accord écrit entre les parties est également nécessaire.",
      },
    ],
    seoContent: "L'annulation d'un Certificat Provisoire d'Immatriculation WW est une démarche administrative moins connue mais parfois indispensable. Elle intervient lorsqu'un projet d'importation de véhicule ne peut aboutir ou lorsqu'une erreur a été commise dans le dossier initial.\n\nLes situations nécessitant une annulation sont variées : véhicule non conforme aux normes françaises, renonciation à l'achat après inspection, erreur dans les données du dossier, ou revente du véhicule avant l'immatriculation définitive. Dans tous les cas, il est essentiel de clôturer proprement le dossier administratif.\n\nDiscount Carte Grise prend en charge cette procédure souvent méconnue et gère les échanges avec l'administration pour vous. Notre équipe s'assure que votre dossier est correctement clôturé et que vous récupérez, si possible, les taxes indûment payées.",
    keywords: ["annulation CPI WW", "annuler immatriculation provisoire", "annulation plaque WW", "CPI WW annulation pas cher", "annuler dossier immatriculation"],
  },
  {
    code: "FIV",
    slug: "fiche-identification-vehicule",
    title: "Fiche d'Identification Véhicule",
    shortTitle: "fiche identification véhicule",
    h1: "Fiche d'Identification Véhicule (FIV) - Demande en Ligne",
    metaTitle: "FIV en Ligne Pas Cher",
    metaDescription: "Obtenez votre Fiche d'Identification Véhicule (FIV) en ligne. Document officiel identifiant les caractéristiques de votre véhicule. Service agréé, traitement sous 24h.",
    icon: "ClipboardList",
    description: "Document officiel recensant les caractéristiques techniques d'un véhicule",
    longDescription: "La Fiche d'Identification Véhicule (FIV) est un document officiel qui recense l'ensemble des caractéristiques techniques d'un véhicule immatriculé en France. Elle contient notamment le numéro d'immatriculation, le numéro de châssis (VIN), les caractéristiques techniques (puissance, carburant, PTAC) et les informations sur le titulaire.\n\nCe document est utile dans de nombreuses situations : cession d'un véhicule, demande d'assurance, contrôle technique, ou simplement pour vérifier les données enregistrées sur votre véhicule au SIV (Système d'Immatriculation des Véhicules).\n\nAvec Discount Carte Grise, obtenez votre FIV rapidement en ligne sans vous déplacer en préfecture.",
    documents: [
      "Pièce d'identité du titulaire",
      "Numéro d'immatriculation du véhicule",
      "Carte grise (si disponible)",
    ],
    delai: "24h maximum",
    steps: [
      "Renseignez le numéro d'immatriculation de votre véhicule",
      "Envoyez votre pièce d'identité",
      "Recevez votre Fiche d'Identification Véhicule par email",
    ],
    prixDescription: "La Fiche d'Identification Véhicule est disponible à un tarif forfaitaire incluant nos frais de dossier. Aucune taxe régionale ni taxe fixe n'est due pour ce document administratif. Tarif tout compris, sans frais cachés.",
    faqs: [
      {
        question: "À quoi sert la Fiche d'Identification Véhicule ?",
        answer: "La FIV permet de connaître ou de vérifier l'ensemble des caractéristiques techniques et administratives d'un véhicule immatriculé en France. Elle est utile pour les démarches de cession, d'assurance, ou en cas de litige sur les caractéristiques d'un véhicule.",
      },
      {
        question: "La FIV est-elle différente de la carte grise ?",
        answer: "Oui, la FIV est un document administratif interne qui contient davantage d'informations que la carte grise visible. Elle recense l'historique du véhicule au SIV et toutes ses caractéristiques techniques officielles.",
      },
      {
        question: "Qui peut demander une FIV ?",
        answer: "Le titulaire du certificat d'immatriculation peut demander la FIV de son propre véhicule. Des professionnels agréés comme les garagistes ou les notaires peuvent également y accéder dans le cadre de leur activité.",
      },
      {
        question: "La FIV contient-elle l'historique des propriétaires ?",
        answer: "La FIV contient des informations sur le titulaire actuel mais pas l'historique complet de tous les propriétaires successifs. Elle recense cependant les opérations administratives effectuées sur le véhicule au SIV (changements de titulaire, modifications techniques).",
      },
      {
        question: "La FIV permet-elle de vérifier si un véhicule est gagé ?",
        answer: "Non, la FIV ne mentionne pas le statut de gage d'un véhicule. Pour vérifier si un véhicule est gagé ou fait l'objet d'une opposition, vous devez consulter le service HistoVec du ministère de l'Intérieur qui fournit gratuitement ces informations.",
      },
      {
        question: "Combien de temps faut-il pour recevoir une FIV ?",
        answer: "Avec Discount Carte Grise, votre Fiche d'Identification Véhicule est traitée sous 24h et envoyée par email au format numérique. Vous n'avez pas besoin de vous déplacer en préfecture ni de prendre rendez-vous.",
      },
      {
        question: "La FIV est-elle nécessaire pour vendre un véhicule ?",
        answer: "La FIV n'est pas obligatoire pour vendre un véhicule, mais elle peut être utile pour fournir des informations détaillées à l'acheteur. Pour la vente, les documents obligatoires sont la carte grise barrée, le Cerfa 15776 et le rapport de contrôle technique.",
      },
    ],
    seoContent: "La Fiche d'Identification Véhicule (FIV) est un document administratif méconnu mais précieux pour les propriétaires de véhicules. Extraite directement du Système d'Immatriculation des Véhicules (SIV), elle constitue la fiche d'identité complète de votre véhicule.\n\nCe document est particulièrement utile dans le cadre d'une succession, d'un litige sur les caractéristiques d'un véhicule, ou simplement pour vérifier que les données enregistrées correspondent bien à la réalité. La FIV contient des informations plus détaillées que celles visibles sur la carte grise.\n\nDiscount Carte Grise vous permet d'obtenir votre FIV rapidement et sans vous déplacer. Notre service en ligne traite votre demande sous 24h et vous envoie le document directement par email. Un service simple et efficace pour un document souvent difficile à obtenir par les voies classiques.",
    keywords: ["fiche identification véhicule", "FIV carte grise", "caractéristiques techniques véhicule", "FIV pas cher", "fiche véhicule SIV", "document identification voiture"],
  },
  {
    code: "IMMAT_DEFINITIVE",
    slug: "immatriculation-definitive",
    title: "Immatriculation Définitive",
    shortTitle: "immatriculation définitive",
    h1: "Demande d'Immatriculation Définitive - Après Plaques WW",
    metaTitle: "Immatriculation Définitive",
    metaDescription: "Finalisez l'immatriculation définitive après une période WW provisoire. Carte grise définitive sous 48h, service agréé par l'État. Lancez votre demande en ligne.",
    icon: "CheckCircle",
    description: "Finalisation de l'immatriculation après une période d'immatriculation provisoire WW",
    longDescription: "L'immatriculation définitive est l'étape finale du processus d'immatriculation d'un véhicule qui a circulé sous plaques WW provisoires. Une fois tous les documents requis réunis (quitus fiscal, certificat de conformité, contrôle technique), il est possible de demander la carte grise définitive avec un numéro d'immatriculation permanent au format SIV (AA-123-BB).\n\nCette démarche met fin à la période d'immatriculation provisoire et attribue au véhicule son identité administrative définitive en France. La carte grise définitive remplace le CPI WW et est le document officiel à conserver à bord du véhicule.\n\nDiscount Carte Grise suit votre dossier de A à Z : de la vérification des documents à l'envoi de votre carte grise définitive par courrier recommandé.",
    documents: [
      "CPI WW en cours de validité",
      "Carte grise étrangère",
      "Certificat de conformité européen (COC)",
      "Quitus fiscal (formulaire 846A)",
      "Contrôle technique français",
      "Pièce d'identité",
      "Justificatif de domicile",
    ],
    delai: "48 à 72h",
    steps: [
      "Vérifiez que tous vos documents sont prêts",
      "Envoyez le dossier complet en ligne",
      "Recevez votre carte grise définitive par courrier recommandé",
    ],
    prixDescription: "Le prix de l'immatriculation définitive dépend de la puissance fiscale du véhicule et du tarif du cheval fiscal de votre département. La taxe régionale, la taxe fixe (11 euros), la redevance d'acheminement (2,76 euros) et un éventuel malus écologique s'appliquent. Nos frais de dossier couvrent la gestion complète.",
    faqs: [
      {
        question: "Quand passer de l'immatriculation WW à l'immatriculation définitive ?",
        answer: "Vous devez demander l'immatriculation définitive dès que vous avez réuni tous les documents nécessaires (quitus fiscal, COC, contrôle technique). Le CPI WW est valable 1 mois, il faut donc anticiper la démarche.",
      },
      {
        question: "Quels documents sont nécessaires pour l'immatriculation définitive ?",
        answer: "Il vous faut le CPI WW, la carte grise étrangère, le certificat de conformité européen (COC), le quitus fiscal, le contrôle technique français, une pièce d'identité et un justificatif de domicile.",
      },
      {
        question: "Que se passe-t-il si le CPI WW expire avant l'immatriculation définitive ?",
        answer: "Si le CPI WW expire avant l'obtention de l'immatriculation définitive, le véhicule ne peut plus circuler légalement. Il faut soit renouveler le CPI WW, soit accélérer la constitution du dossier. Discount Carte Grise vous aide à gérer ce délai.",
      },
      {
        question: "Les plaques provisoires WW doivent-elles être rendues après l'immatriculation définitive ?",
        answer: "Les plaques WW provisoires ne doivent pas être rendues mais elles ne peuvent plus être utilisées une fois l'immatriculation définitive obtenue. Vous devez commander de nouvelles plaques au format SIV (AA-123-BB) correspondant à votre nouveau numéro d'immatriculation définitif.",
      },
      {
        question: "Peut-on passer directement à l'immatriculation définitive sans CPI WW ?",
        answer: "Oui, si vous disposez de tous les documents nécessaires dès l'arrivée du véhicule en France (quitus fiscal, COC, contrôle technique), vous pouvez demander directement l'immatriculation définitive sans passer par l'étape du CPI WW.",
      },
      {
        question: "Le malus écologique s'applique-t-il à l'immatriculation définitive d'un véhicule importé ?",
        answer: "Oui, le malus écologique s'applique lors de la première immatriculation définitive en France d'un véhicule importé, en fonction de son taux d'émission de CO2. Pour les véhicules d'occasion, un coefficient de réduction s'applique selon l'âge du véhicule.",
      },
    ],
    seoContent: "L'immatriculation définitive marque la fin du parcours administratif pour les véhicules importés. Après avoir circulé sous plaques WW provisoires le temps de réunir tous les documents, le véhicule reçoit enfin son numéro d'immatriculation permanent au format SIV.\n\nCette étape finalise l'intégration du véhicule dans le parc automobile français. La carte grise définitive est le document officiel qui vous accompagnera tout au long de la vie du véhicule, pour le contrôle technique, l'assurance, la vente ou toute autre démarche administrative.\n\nDiscount Carte Grise assure un suivi complet de votre dossier d'importation, depuis le CPI WW provisoire jusqu'à l'obtention de la carte grise définitive. Notre expertise des procédures d'import vous garantit un traitement efficace et la réception de votre carte grise dans les meilleurs délais.",
    keywords: ["immatriculation définitive", "carte grise définitive après WW", "finaliser immatriculation import", "immatriculation définitive pas cher", "carte grise définitive véhicule importé"],
  },
  {
    code: "CHANGEMENT_ADRESSE_LOCATAIRE",
    slug: "changement-adresse-locataire-carte-grise",
    title: "Changement d'Adresse Locataire",
    shortTitle: "demande de changement d'adresse locataire",
    h1: "Changement d'Adresse du Locataire sur la Carte Grise",
    metaTitle: "Adresse Locataire Carte Grise",
    metaDescription: "Mettez à jour l'adresse du locataire sur votre carte grise après un déménagement. Spécifique aux véhicules en LLD, service agréé. Démarche rapide en ligne.",
    icon: "MapPin",
    description: "Mise à jour de l'adresse du locataire sur un véhicule en location longue durée",
    longDescription: "Pour les véhicules faisant l'objet d'un contrat de location longue durée (LLD) ou de crédit-bail, la carte grise mentionne à la fois l'organisme de financement (propriétaire) et le locataire. En cas de déménagement du locataire, l'adresse doit être mise à jour sur la carte grise.\n\nCette démarche est distincte du changement d'adresse classique car elle implique un véhicule dont le titulaire est un organisme financier. La mise à jour de l'adresse du locataire nécessite donc des documents spécifiques liés au contrat de location.\n\nDiscount Carte Grise gère cette démarche spécifique pour vous et s'assure que votre carte grise est mise à jour dans les meilleurs délais.",
    documents: [
      "Carte grise actuelle du véhicule",
      "Contrat de location ou de crédit-bail",
      "Justificatif de domicile du locataire (moins de 6 mois)",
      "Pièce d'identité du locataire",
      "Autorisation de l'organisme financier si requise",
    ],
    delai: "24 à 48h",
    steps: [
      "Renseignez vos nouvelles coordonnées et les informations du contrat",
      "Envoyez le justificatif de domicile et les documents du véhicule",
      "Recevez la mise à jour de votre carte grise",
    ],
    prixDescription: "Le changement d'adresse du locataire est soumis aux mêmes conditions que le changement d'adresse classique. Les 3 premières mises à jour sont gratuites sur l'ANTS. Au-delà, une nouvelle carte grise est éditée avec la taxe fixe de 11 euros et la redevance d'acheminement de 2,76 euros. Nos frais de dossier couvrent la gestion de votre demande.",
    faqs: [
      {
        question: "Faut-il l'accord du loueur pour changer l'adresse sur la carte grise ?",
        answer: "Pour un véhicule en LLD ou crédit-bail, il est recommandé d'informer l'organisme financier de votre déménagement. Certains loueurs gèrent eux-mêmes la mise à jour de la carte grise. Vérifiez votre contrat de location.",
      },
      {
        question: "Quelle est la différence avec un changement d'adresse classique ?",
        answer: "Pour un véhicule en location, le titulaire de la carte grise est l'organisme financier et non le locataire. La démarche est donc légèrement différente et nécessite des documents prouvant le lien entre le locataire et le véhicule (contrat de location).",
      },
      {
        question: "Le changement d'adresse locataire est-il obligatoire ?",
        answer: "Oui, comme pour tout véhicule, la mise à jour de l'adresse sur la carte grise est obligatoire dans les 30 jours suivant le déménagement, même pour un véhicule en location.",
      },
      {
        question: "Qui doit effectuer le changement d'adresse : le locataire ou le loueur ?",
        answer: "En général, c'est le locataire qui doit signaler son déménagement. Cependant, certains contrats de LLD prévoient que le loueur se charge des démarches administratives. Vérifiez les clauses de votre contrat ou contactez votre société de leasing pour connaître la procédure applicable.",
      },
      {
        question: "Le changement d'adresse du locataire modifie-t-il le contrat de location ?",
        answer: "Le changement d'adresse sur la carte grise ne modifie pas les termes du contrat de location. Cependant, vous devez informer votre assureur et votre société de leasing de votre nouvelle adresse, car cela peut impacter le montant de la prime d'assurance.",
      },
      {
        question: "Le changement de département du locataire entraîne-t-il des frais supplémentaires ?",
        answer: "Le changement d'adresse du locataire suit les mêmes règles que le changement d'adresse classique : gratuit les 3 premières fois, puis soumis à la taxe fixe et la redevance d'acheminement. Le changement de département n'entraîne pas de taxe régionale supplémentaire pour cette démarche.",
      },
    ],
    seoContent: "Le changement d'adresse du locataire sur la carte grise est une spécificité administrative propre aux véhicules en location longue durée (LLD) ou en crédit-bail. Contrairement à un véhicule dont vous êtes pleinement propriétaire, la carte grise d'un véhicule en location mentionne deux entités : l'organisme financier (propriétaire) et le locataire (utilisateur).\n\nCette particularité rend la démarche légèrement plus complexe car elle implique parfois l'accord de l'organisme de financement. Les contrats de LLD étant variés, les modalités de mise à jour de l'adresse peuvent différer d'un loueur à l'autre.\n\nDiscount Carte Grise maîtrise les spécificités de cette démarche et vous accompagne dans la mise à jour de votre carte grise en location. Que votre véhicule soit en LLD, en LOA ou en crédit-bail, notre service en ligne traite votre demande rapidement et vous évite les échanges fastidieux avec votre société de leasing.",
    keywords: ["changement adresse locataire carte grise", "adresse LLD carte grise", "déménagement véhicule location", "changement adresse locataire pas cher", "carte grise locataire déménagement"],
  },
  {
    code: "ANNULER_DC_DA",
    slug: "annuler-declaration-cession",
    title: "Annulation de DC ou DA",
    shortTitle: "annulation de DC ou DA",
    h1: "Annuler ou Corriger une Déclaration de Cession ou d'Achat",
    metaTitle: "Annuler une Déclaration de Cession ou d'Achat en Ligne",
    metaDescription: "Annulez ou corrigez une déclaration de cession (DC) ou une déclaration d'achat (DA) en cas d'erreur ou de vente annulée. Démarche rapide, service agréé.",
    icon: "RefreshCw",
    description: "Annulation ou correction d'une déclaration de cession ou d'achat",
    longDescription: "En cas d'erreur dans une déclaration de cession (DC) ou une déclaration d'achat (DA), ou si la vente du véhicule est annulée, il est possible de demander l'annulation ou la correction de ces déclarations auprès de l'administration.\n\nCette démarche est importante car une déclaration incorrecte peut avoir des conséquences juridiques et fiscales. Par exemple, si une vente est annulée mais que la déclaration de cession a déjà été effectuée, le vendeur peut continuer à être tenu responsable des infractions commises avec le véhicule.\n\nDiscount Carte Grise vous accompagne dans cette procédure administrative délicate et s'assure que votre situation est régularisée auprès du Système d'Immatriculation des Véhicules (SIV).",
    documents: [
      "Déclaration de cession ou d'achat originale",
      "Pièce d'identité",
      "Justificatif de l'annulation ou de l'erreur (accord des deux parties si applicable)",
      "Carte grise du véhicule",
    ],
    delai: "24 à 48h",
    steps: [
      "Indiquez la référence de la déclaration à annuler ou corriger",
      "Expliquez le motif d'annulation et envoyez les justificatifs",
      "Recevez la confirmation d'annulation ou de correction",
    ],
    prixDescription: "L'annulation ou la correction d'une déclaration de cession ou d'achat est soumise à des frais de dossier forfaitaires. Aucune taxe régionale n'est due pour cette démarche. Nos frais couvrent la gestion complète de la demande auprès du SIV.",
    faqs: [
      {
        question: "Peut-on annuler une déclaration de cession déjà envoyée ?",
        answer: "Oui, il est possible d'annuler une déclaration de cession si la vente n'a pas abouti ou si une erreur a été commise. La démarche doit être effectuée rapidement et nécessite l'accord des deux parties (vendeur et acheteur).",
      },
      {
        question: "Que faire en cas d'erreur dans une déclaration de cession ?",
        answer: "En cas d'erreur (mauvaise plaque d'immatriculation, date incorrecte, coordonnées erronées), vous devez effectuer une correction auprès de l'administration. Discount Carte Grise gère cette démarche pour vous.",
      },
      {
        question: "Quelles sont les conséquences d'une DC erronée non corrigée ?",
        answer: "Une déclaration de cession incorrecte peut entraîner des problèmes : le vendeur peut rester responsable d'infractions, le nouveau propriétaire peut avoir des difficultés à immatriculer le véhicule, ou des contraventions peuvent être envoyées au mauvais destinataire.",
      },
      {
        question: "Quel est le délai pour annuler une déclaration de cession ?",
        answer: "Il n'y a pas de délai légal imposé pour annuler une déclaration de cession, mais il est recommandé d'agir le plus rapidement possible. Si l'acheteur a déjà effectué son changement de titulaire, la procédure devient plus complexe et nécessite l'accord des deux parties.",
      },
      {
        question: "Peut-on corriger une erreur de plaque sur une déclaration de cession ?",
        answer: "Oui, une erreur de numéro d'immatriculation sur la déclaration de cession peut être corrigée. Cette situation est plus fréquente qu'on ne le pense et peut bloquer la démarche de carte grise de l'acheteur. Discount Carte Grise gère la correction auprès de l'administration.",
      },
      {
        question: "L'acheteur peut-il annuler une déclaration de cession ?",
        answer: "L'annulation d'une déclaration de cession nécessite en principe l'accord des deux parties (vendeur et acheteur). L'acheteur ne peut pas annuler unilatéralement la DC sans le consentement du vendeur, sauf en cas de vice caché avéré ou de décision de justice.",
      },
      {
        question: "Que faire si le vendeur refuse d'annuler la déclaration de cession ?",
        answer: "Si le vendeur refuse d'annuler la déclaration de cession alors que la vente est contestée, il est conseillé de saisir un médiateur ou d'engager une procédure judiciaire. En attendant, l'acheteur peut contester la vente auprès du tribunal compétent.",
      },
    ],
    seoContent: "L'annulation ou la correction d'une déclaration de cession (DC) ou d'achat (DA) est une démarche administrative qui peut s'avérer nécessaire dans de nombreuses situations : erreur de saisie, vente annulée d'un commun accord, vice caché découvert après la transaction, ou encore litige entre vendeur et acheteur.\n\nCette procédure est souvent source de stress car elle implique des échanges avec l'administration et parfois avec la partie adverse. Une déclaration de cession erronée peut avoir des conséquences importantes : le vendeur continue de recevoir les contraventions, l'acheteur ne peut pas faire sa carte grise, et les deux parties se retrouvent dans une impasse administrative.\n\nDiscount Carte Grise intervient comme intermédiaire agréé pour régulariser ces situations délicates. Notre équipe gère les échanges avec le SIV (Système d'Immatriculation des Véhicules) et s'assure que l'annulation ou la correction est bien enregistrée. Ne restez pas bloqué par une erreur administrative, confiez-nous votre dossier.",
    keywords: ["annuler déclaration cession", "corriger DC véhicule", "annuler vente voiture", "erreur déclaration cession pas cher", "annuler DA déclaration achat", "correction cession véhicule"],
  },
];

export function getDemarcheBySlug(slug: string): DemarcheConfig | undefined {
  return demarchesConfig.find((d) => d.slug === slug);
}

export function getDemarcheByCode(code: string): DemarcheConfig | undefined {
  return demarchesConfig.find((d) => d.code === code);
}
