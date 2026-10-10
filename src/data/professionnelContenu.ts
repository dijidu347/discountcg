// Le contenu de la page professionnelle, hors du JSX.
//
// Même raison que pour le non-gage : enfermé dans le composant, il restait
// invisible du prérendu — 419 mots servis aux robots pour une page qui en
// affiche bien plus. Les preuves chiffrées, les étapes et la FAQ sont ce que
// cherche un garage qui compare les services habilités.

export const PREUVES = [
  { valeur: "189", libelle: "garages vérifiés", detail: "dossier contrôlé, habilitation active" },
  { valeur: "4 047", libelle: "démarches sur 12 mois", detail: "traitées pour le compte de nos garages" },
  { valeur: "21 h", libelle: "délai médian", detail: "sur les 1 744 démarches finalisées du trimestre" },
];

export const ETAPES = [
  {
    titre: "Vous créez votre compte",
    texte:
      "Deux pièces suffisent : un extrait Kbis de moins de six mois — ou, si vous êtes artisan ou entrepreneur individuel, votre attestation d'immatriculation au RNE, gratuite sur data.inpi.fr — et la pièce d'identité du dirigeant. Pas de mandat à faire signer, pas de dossier à monter.",
    icone: "Building2" as const,
  },
  {
    titre: "Nous vérifions votre entreprise",
    texte:
      "La date du document est lue automatiquement et votre compte passe en vérifié. Vous êtes prévenu quinze jours avant son expiration, puis le jour où elle tombe.",
    icone: "ShieldCheck" as const,
  },
  {
    titre: "Vous créditez votre solde",
    texte:
      "Le solde est en euros : un euro crédité est un euro de frais de service. Vous rechargez quand vous voulez, sans abonnement ni engagement de volume.",
    icone: "Wallet" as const,
  },
  {
    titre: "Vous déposez vos démarches",
    texte:
      "Plaque, pièces, envoi. Le certificat provisoire part par e-mail dès la validation, et votre client peut rouler immédiatement.",
    icone: "FileCheck2" as const,
  },
];

export const FAQ = [
  {
    question: "Faut-il une habilitation pour faire les cartes grises de ses clients ?",
    answer:
      "Oui, mais pas forcément la vôtre. L'habilitation au Système d'Immatriculation des Véhicules est délivrée par le préfet du département où se trouve le siège social, aux professionnels de l'automobile et aux loueurs. Vous pouvez la demander pour votre entreprise, ou passer par un professionnel déjà habilité : c'est alors son habilitation qui couvre la démarche, et vous n'avez aucune formalité à accomplir auprès de la préfecture.",
  },
  {
    question: "Quelle différence entre l'habilitation et l'agrément ?",
    answer:
      "Ce sont deux autorisations distinctes. L'habilitation, délivrée par la préfecture, donne accès au SIV pour effectuer les démarches. L'agrément, délivré par le Trésor public, autorise à percevoir les taxes d'immatriculation pour le compte de l'État. Un professionnel qui n'a que l'habilitation ne peut pas encaisser la taxe régionale. Nous détenons les deux : habilitation n° 285046 et agrément n° 63198.",
  },
  {
    question: "Y a-t-il un abonnement ou un engagement de volume ?",
    answer:
      "Non. Vous créditez votre solde quand vous en avez besoin et vous payez à la démarche. Un garage qui fait trois immatriculations par an paie trois démarches. Il n'y a ni frais fixes, ni minimum mensuel, ni durée d'engagement.",
  },
  {
    question: "Quel délai pour mon client ?",
    answer:
      "Le certificat provisoire d'immatriculation est transmis par e-mail dès la validation du dossier : votre client repart avec son véhicule le jour même. Sur le dernier trimestre, le délai médian entre le dépôt et la finalisation a été de 21 heures sur 1 744 démarches.",
  },
  {
    question: "Que se passe-t-il si mon Kbis ou mon attestation RNE expire ?",
    answer:
      "Vous recevez un rappel quinze jours avant, puis le jour de l'expiration. Vous déposez le nouveau Kbis depuis votre espace : sa date est lue automatiquement et votre compte est revalidé sans intervention de notre part. L'ancien document est supprimé.",
  },
  {
    question: "Qui paie les taxes d'immatriculation ?",
    answer:
      "Elles sont incluses dans le montant débité et nous les reversons intégralement à l'État. Nos frais de service, eux, sont ceux de la grille ci-dessus. La facture distingue les deux, ce qui vous permet de refacturer votre client sans recalcul.",
  },
];
