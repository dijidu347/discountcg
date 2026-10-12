// Les questions-réponses de la page d'accueil, sorties du composant React.
//
// Elles y vivaient, donc le prérendu ne pouvait pas les atteindre : l'accueil
// ne servait que 345 mots aux robots, là où le visiteur en lit plus de sept
// cents. C'est la page la plus vue du site — 6 333 impressions sur seize mois,
// la première devant toutes les autres — et la plus maigre.
//
// Elle ne portait pas non plus de balisage FAQPage, alors que les dix-huit
// pages de démarches en ont un. Déplacées ici, ces réponses servent à la fois
// l'écran, le HTML prérendu et le schéma.
//
// Même règle que tarifsContenu.ts, nonGageContenu.ts et les repères : un seul
// endroit, lu par le composant et par le script de prérendu.

export interface Question {
  question: string;
  answer: string;
}

export const FAQ_ACCUEIL: Question[] = [
  {
    // Cette réponse réclamait « un Kbis de moins de 6 mois et une pièce
    // d'identité du gérant » à chaque dossier. Ce n'est plus vrai depuis le
    // 12 octobre 2026 : ces deux pièces sont vérifiées une fois à l'ouverture
    // du compte professionnel et ne sont plus redemandées ensuite. L'accueil
    // contredisait le tunnel.
    question: "Quels documents faut-il pour une carte grise professionnelle ?",
    answer:
      "Votre Kbis et la pièce d'identité du dirigeant sont vérifiés une seule fois, à l'ouverture de votre compte professionnel : ils ne vous sont plus redemandés à chaque dossier. Restent les pièces propres au véhicule — le certificat de cession, la carte grise barrée et signée par le vendeur, le contrôle technique quand il est exigé, et le mandat qui nous autorise à déposer. L'écran vous les demande une par une, selon la démarche.",
  },
  {
    question: "Quel est le délai de traitement d'un dossier ?",
    answer:
      "Moins de 24 heures ouvrées dès réception de l'ensemble des pièces. Vous recevez une notification à chaque étape, et le certificat provisoire d'immatriculation vous permet de circuler sans attendre le titre définitif.",
  },
  {
    question: "Combien coûte une carte grise, et qu'est-ce qui est à vous ?",
    answer:
      "L'essentiel du prix est de la taxe, identique partout : la taxe régionale (puissance fiscale × tarif de votre département, de 30 € à Mayotte à 68,95 € en Île-de-France), 11 € de taxe fixe et 2,76 € de redevance d'acheminement. Notre part, les frais de dossier, commence à 30 € pour un particulier et 20 € pour un professionnel. C'est la seule part qui se compare d'un prestataire à l'autre.",
  },
  {
    question: "Le paiement en ligne est-il sécurisé ?",
    answer:
      "Oui. Les paiements sont chiffrés en SSL et conformes aux normes PCI DSS. Les taxes que nous encaissons sont reversées à l'État : nous sommes agréés par le Trésor public pour cela, sous le n° 63198.",
  },
  {
    question: "Puis-je suivre l'avancement de mon dossier ?",
    answer:
      "Oui, vous recevez une notification automatique à chaque étape du traitement, et vous pouvez nous contacter à tout moment pour un point sur l'avancement.",
  },
  {
    question: "Que faire si je n'ai pas tous les documents ?",
    answer:
      "Contactez-nous. Beaucoup de blocages ont une sortie que peu de gens connaissent : une carte grise perdue se remplace par un duplicata, un certificat de conformité introuvable se contourne par une attestation de la Fédération française des véhicules d'époque au-delà de trente ans, et un véhicule importé peut rouler sous plaque WW avant même d'avoir son justificatif fiscal.",
  },
  {
    question: "Travaillez-vous avec les professionnels (garagistes, concessionnaires) ?",
    answer:
      "Oui, et c'est l'essentiel de notre activité. Les professionnels disposent d'un compte dédié, de tarifs spécifiques, du suivi de leurs dossiers en volume, et la première déclaration d'achat ou de cession est offerte.",
  },
  {
    question: "Puis-je annuler ma demande ?",
    answer:
      "Une fois votre dossier transmis à l'administration, la commande est définitive et ne peut plus être remboursée : les taxes ont déjà été reversées à l'État, qui ne les restitue pas. Si votre demande n'a pas encore été prise en charge, contactez-nous au plus vite et nous verrons ensemble ce qui est possible.",
  },
  {
    question: "Quelles régions couvrez-vous ?",
    answer:
      "Toute la France métropolitaine et les DOM-TOM. Le service est entièrement en ligne : c'est l'adresse figurant sur votre justificatif de domicile qui détermine le tarif du cheval fiscal appliqué, pas le lieu où vous faites la démarche.",
  },
];
