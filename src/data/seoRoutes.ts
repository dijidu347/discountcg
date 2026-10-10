// Le référencement des pages qui ne sont pas des démarches.
//
// Ce fichier existe pour une seule raison : le prérendu et les composants React
// doivent lire le même texte. Les 18 pages démarche tirent déjà tout de
// demarchesConfig ; les pages écrites à la main n'avaient, elles, leur titre et
// leur description qu'à l'intérieur du JSX, donc hors de portée d'un script de
// build. Les y laisser aurait garanti la dérive entre ce que voit le visiteur
// et ce que lit le robot — ce qui, au-delà du gâchis, s'appelle du cloaking.

export interface RouteSeo {
  // Titre tel que SEOHead l'attend : sans le suffixe de marque, qu'il ajoute.
  title: string;
  description: string;
  canonical: string;
  // Le H1 réel de la page.
  h1: string;
  // Le texte injecté dans le HTML pré-rendu. Il reprend l'ouverture réelle de
  // la page : ce que le robot lit doit être ce que le visiteur voit.
  intro: string[];
  // Les pages légales sont en noindex ; inutile de leur écrire un corps.
  noindex?: boolean;
}

const BASE = "https://discountcartegrise.fr";

export const ROUTES_SEO: Record<string, RouteSeo> = {
  "/": {
    title: "Carte Grise en Ligne | Discount Carte Grise",
    description:
      "Faites votre carte grise en ligne au meilleur prix. Service agréé par l'État, traitement sous 24h, dès 30 euros. Simulez et commandez maintenant.",
    canonical: `${BASE}/`,
    h1: "Carte grise en ligne rapide, sécurisée et pas chère",
    intro: [
      "Faites votre carte grise en ligne pas chère — service habilité par l'État, traitement sous 24h. Frais de dossier dès 30 €.",
      "Changement de titulaire, déclaration de cession, déclaration d'achat, duplicata, changement d'adresse : toutes les démarches d'immatriculation se font ici, sans guichet et sans rendez-vous.",
      "DISCOUNT AUTO / PAREBRISE est habilité par la préfecture pour l'accès au Système d'Immatriculation des Véhicules (n° 285046) et agréé par le Trésor public pour la perception des taxes (n° 63198). Ce site est un service commercial privé, indépendant des administrations publiques.",
    ],
  },

  "/simulateur": {
    title: "Simulateur Prix Carte Grise 2026",
    description:
      "Calculez le prix de votre carte grise en 30 secondes, et consultez le tarif du cheval fiscal des 101 départements en 2026. Gratuit, sans inscription.",
    canonical: `${BASE}/simulateur`,
    h1: "Simulateur prix carte grise 2026",
    intro: [
      "Calculez le prix de votre carte grise à partir de votre plaque d'immatriculation : puissance fiscale, genre, énergie et date de première mise en circulation sont lus automatiquement, sans que vous ayez à les recopier.",
      "Le tarif du cheval fiscal varie de 30 € à Mayotte à 68,95 € en Île-de-France. Le prix d'une carte grise se compose de la taxe régionale Y.1 (puissance fiscale × tarif du département), de la taxe de gestion Y.4 de 11 €, de la redevance d'acheminement Y.5 de 2,76 €, et le cas échéant du malus écologique et de la taxe de formation professionnelle Y.2.",
      "Les véhicules de plus de dix ans bénéficient d'un abattement de 50 % sur la taxe régionale. Les cyclomoteurs, remorques, tracteurs et matériels agricoles en sont exonérés ; les motos sont à demi-tarif.",
      "Cette page publie également le tableau complet du tarif du cheval fiscal des 101 départements en 2026, filtrable par région et triable, ainsi que le prix obtenu pour les puissances courantes de 3 à 10 CV.",
    ],
  },

  "/certificat-de-non-gage": {
    title: "Certificat de Non-Gage Gratuit",
    description:
      "Le certificat de non-gage est gratuit auprès du ministère de l'Intérieur et s'obtient en deux minutes. Ses six rubriques expliquées, sa durée de validité, et les démarches qui l'exigent.",
    canonical: `${BASE}/certificat-de-non-gage`,
    h1: "Certificat de situation administrative, dit « non-gage »",
    intro: [
      "Le certificat de situation administrative, que tout le monde appelle le « non-gage », dit si quelque chose s'oppose à la vente d'un véhicule : un crédit en cours, une saisie, une opposition, un vol. Sans lui, l'acheteur ne peut pas faire établir la carte grise à son nom.",
      "Il est délivré par le ministère de l'Intérieur, et il est gratuit. Il s'obtient en deux minutes sur le site du SIV ou via Histovec, avec le numéro d'immatriculation, la date du certificat d'immatriculation et le nom du titulaire.",
      "Six rubriques y figurent, imprimées même quand il n'y a rien à signaler : opposition au transfert du certificat d'immatriculation (OTCI), opposition véhicule endommagé, déclaration valant saisie, gage, immatriculation suspendue, véhicule volé. Lire « Gage » sur le document ne signifie donc pas que le véhicule est gagé : c'est un titre, et la réponse est sur la ligne en dessous.",
      "Le certificat n'est recevable que quinze jours après sa date d'édition. Il est exigé pour une carte grise, une déclaration de cession et une déclaration d'achat ; les autres démarches ne le demandent pas.",
    ],
  },

  "/carte-grise-professionnel": {
    title: "Carte Grise pour les Professionnels",
    description:
      "Déposez les cartes grises de vos clients sous notre habilitation SIV. Déclaration d'achat et de cession dès 5 €, sans abonnement. Première déclaration offerte.",
    canonical: `${BASE}/carte-grise-professionnel`,
    h1: "Carte grise pour les professionnels de l'automobile",
    intro: [
      "Garages, concessions, négociants, loueurs : déposez vos immatriculations depuis un compte professionnel, sous notre habilitation. Déclaration d'achat et de cession, changement de titulaire, véhicule neuf, W garage, WW provisoire — sans vous occuper des formalités auprès de la préfecture.",
      "Vous pouvez demander votre propre habilitation au Système d'Immatriculation des Véhicules : elle est délivrée par le préfet du département de votre siège social, aux professionnels de l'automobile et aux loueurs. Si vous immatriculez beaucoup et voulez tout gérer en interne, c'est la bonne voie.",
      "L'habilitation et l'agrément ne se confondent pas. L'habilitation, délivrée par la préfecture, donne accès au SIV pour effectuer les démarches. L'agrément, délivré par le Trésor public, autorise à percevoir les taxes d'immatriculation pour le compte de l'État. Un professionnel habilité mais non agréé ne peut pas encaisser la taxe régionale de son client. Nous détenons les deux : habilitation n° 285046 et agrément n° 63198.",
      "Le fonctionnement tient en quatre étapes : vous créez votre compte avec un Kbis de moins de six mois et la pièce d'identité du dirigeant ; nous vérifions votre entreprise, la date du Kbis étant lue automatiquement ; vous créditez un solde en euros, sans abonnement ni engagement de volume ; vous déposez vos démarches et le certificat provisoire part par e-mail dès la validation, votre client repart avec son véhicule le jour même.",
      "Sur les douze derniers mois, 4 047 démarches ont été traitées pour le compte de 189 garages vérifiés. Sur le dernier trimestre, le délai médian entre le dépôt et la finalisation a été de 21 heures sur 1 744 démarches. La première déclaration d'achat ou de cession est offerte à l'ouverture du compte.",
    ],
  },

  "/habilitation-siv": {
    title: "Habilitation SIV : les Conditions",
    description:
      "Comment obtenir l'habilitation au SIV : les deux conditions cumulatives, les pièces, la pré-demande ANTS et ce qu'elle engage une fois obtenue. Et quand il vaut mieux passer par un habilité.",
    canonical: `${BASE}/habilitation-siv`,
    h1: "Habilitation SIV : conditions, procédure et obligations",
    intro: [
      "L'habilitation au Système d'Immatriculation des Véhicules autorise un professionnel à télétransmettre lui-même les opérations d'immatriculation de ses clients. Elle est délivrée par le préfet du département du siège social de l'entreprise, et concerne les professionnels du commerce de l'automobile y compris du cyclomoteur, les loueurs, les experts, les huissiers, les démolisseurs, les broyeurs et les centres VHU.",
      "Deux conditions cumulatives doivent être remplies. D'abord être professionnel de l'automobile depuis plus d'un an avec une activité réelle, que le livre de police et les factures doivent pouvoir attester : l'article R. 322-1 du code de la route réserve l'habilitation aux professionnels de l'automobile, et les préfectures demandent un an d'activité de l'établissement. Ensuite avoir un bulletin n° 2 de casier judiciaire vierge, l'article 18-1 de l'arrêté du 9 février 2009 interdisant d'habiliter une personne faisant l'objet d'une condamnation inscrite à ce bulletin.",
      "Trois pièces sont systématiquement demandées : un extrait Kbis de moins de six mois ou le numéro de SIRET, la pièce d'identité du gérant, et la pièce d'identité de chaque personne qui aura accès au SIV. Vient ensuite une pré-demande en ligne sur le site de l'ANTS, puis l'acquisition du certificat numérique indispensable à la télétransmission — que les préfectures conseillent d'attendre la validation de la demande avant d'acheter.",
      "L'habilitation n'est pas un droit : l'autorité préfectorale reste seule à apprécier le bien-fondé d'une demande. Une fois obtenue, elle engage à signaler tout changement de situation dans le mois, à conserver les dossiers cinq ans et à les restituer en cas de cessation d'activité, à accepter le contrôle préfectoral des opérations, et à respecter un préavis de deux mois pour la résilier.",
      "L'habilitation et l'agrément ne se confondent pas. L'agrément, délivré par l'administration des finances publiques, autorise à percevoir les taxes et la redevance sur les certificats d'immatriculation puis à les reverser au Trésor public. Il est réservé aux professionnels du commerce de l'automobile et aux loueurs, et l'habilitation en est le préalable. Un professionnel habilité mais non agréé ne peut pas encaisser la taxe régionale de son client.",
    ],
  },

  "/a-propos": {
    title: "À propos | Discount Carte Grise",
    description:
      "DISCOUNT AUTO / PAREBRISE, service d'immatriculation habilite par la Prefecture (N° 285046) et agree par le Tresor Public (N° 63198).",
    canonical: `${BASE}/a-propos`,
    h1: "À propos de Discount Carte Grise",
    intro: [
      "DISCOUNT AUTO / PAREBRISE est habilité par la préfecture pour l'accès au Système d'Immatriculation des Véhicules sous le numéro 285046, et agréé par le Trésor public sous le numéro 63198 pour la perception des taxes liées à l'immatriculation.",
      "Ce site est un service commercial et privé, indépendant des administrations publiques. Les démarches d'immatriculation peuvent être réalisées par l'usager lui-même, sans frais de service, sur le site de l'ANTS.",
    ],
  },

  "/mentions-legales": {
    title: "Mentions Legales",
    description: "Mentions legales du site Discount Carte Grise - DISCOUNT AUTO / PAREBRISE",
    canonical: `${BASE}/mentions-legales`,
    h1: "Mentions légales",
    intro: [],
    noindex: true,
  },
  "/cgv": {
    title: "Conditions Generales de Vente",
    description: "CGV du service Discount Carte Grise - DISCOUNT AUTO / PAREBRISE",
    canonical: `${BASE}/cgv`,
    h1: "Conditions générales de vente",
    intro: [],
    noindex: true,
  },
  "/politique-confidentialite": {
    title: "Politique de Confidentialite",
    description:
      "Politique de confidentialite et protection des donnees personnelles - Discount Carte Grise",
    canonical: `${BASE}/politique-confidentialite`,
    h1: "Politique de confidentialité",
    intro: [],
    noindex: true,
  },
  "/cookies": {
    title: "Politique de Cookies",
    description:
      "Politique de cookies du site Discount Carte Grise - types de cookies utilises et gestion",
    canonical: `${BASE}/cookies`,
    h1: "Politique de cookies",
    intro: [],
    noindex: true,
  },
};
