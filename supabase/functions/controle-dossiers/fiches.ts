// Ce que porte chaque document, et à quel endroit.
//
// Les erreurs de lecture venaient toutes du même défaut : une consigne générale
// demandant « la date de vente » à un modèle qui voyait quatre dates sur la même
// page. Un cerfa de déclaration d'achat en porte quatre — la date d'achat, la
// date de vente du certificat de vente, et deux « Fait à …, le … ». Sans dire
// laquelle on veut, on obtient celle qui tombe sous les yeux.
//
// Chaque fiche décrit donc le document tel qu'il est réellement imprimé, champ
// par champ, d'après les formulaires officiels livrés dans public/cerfas.
// Seule la fiche de la pièce attendue est jointe à la consigne.

export interface Fiche {
  motif: RegExp;
  texte: string;
}

const CESSION = `Ce document est le certificat de cession d'un véhicule d'occasion, cerfa 15776*02. Il existe en deux exemplaires identiques : un pour le vendeur, un pour l'acquéreur. Peu importe lequel t'est présenté.

Lis-le EN ENTIER avant de répondre : la même page porte plusieurs dates, et on ne sait à quoi chacune correspond qu'en repérant le bloc où elle figure. Il se lit en trois blocs, dans cet ordre :

1. Le véhicule, en haut : (A) numéro d'immatriculation, (E) numéro d'identification du véhicule, (B) date de 1re immatriculation, (D.1) marque, (D.2) type variante version, (J.1) genre national, (D.3) dénomination commerciale, kilométrage au compteur, puis la présence du certificat d'immatriculation avec son numéro de formule ou, pour un ancien format, la date (I) du certificat.

2. L'ANCIEN PROPRIÉTAIRE, c'est-à-dire le VENDEUR : « Je soussigné(e) », son nom ou sa raison sociale, son SIRET le cas échéant, son adresse complète. Puis la phrase qui porte la vente :
   « Certifie (veuillez cocher la case correspondante) : ☐ céder  ☐ céder pour destruction — Le ____ à ____ h le véhicule désigné ci-dessus. »
   → C'est ICI, et nulle part ailleurs, que se trouvent la DATE et l'HEURE DE LA CESSION. Mets-les dans dates.cession et dates.heure_cession.
   CETTE LIGNE SE LIT CASE PAR CASE, dans cet ordre exact :
     « Le [JJ] [MM] [AAAA] à [HH] h [MM] »
     deux cases pour le jour, deux pour le mois, QUATRE pour l'année, puis deux pour l'heure et deux pour les minutes.
   Exemple réel : « Le |3|1| |0|8| |2|0|2|6| à |1|8| h |0|0| » se lit le 31 août 2026 à 18h00, soit dates.cession = "2026-08-31" et dates.heure_cession = "18:00".
   N'attrape JAMAIS les deux derniers chiffres de l'année pour en faire le jour : « 2026 » n'est pas « le 26 ». Compte les cases avant de conclure.
   Le bloc se termine par « Fait à ______, le ______ » suivi de la signature de l'ancien propriétaire (pour une société : nom, qualité du signataire et cachet).
   → Cette date « Fait le » est celle de la RÉDACTION du document. Elle va dans dates.emission. Elle diffère souvent de la date de cession de plusieurs jours ou semaines : ne la confonds jamais avec elle.

3. Le NOUVEAU PROPRIÉTAIRE, c'est-à-dire l'ACQUÉREUR : mêmes champs, plus sa date et son lieu de naissance. Il certifie « acquérir le véhicule aux dates et heures indiquées par l'ancien propriétaire » — son bloc ne porte donc AUCUNE date de vente. Il se termine par son propre « Fait à ______, le ______ » et sa signature.

Signatures : signatures.vendeur pour celle de l'ancien propriétaire, signatures.acheteur pour celle du nouveau, signatures.tampon si un cachet d'entreprise figure sur l'une des deux.`;

const DECLARATION_ACHAT = `Ce document est la déclaration d'achat d'un véhicule d'occasion, cerfa 13751*02. Il porte QUATRE dates : lis-les avec attention, c'est là que se font les erreurs.

1. En haut, l'ACQUÉREUR professionnel : une case cochée « professionnel du commerce de l'automobile » ou « assureur », son nom ou sa raison sociale, son SIREN, son adresse. Puis :
   « Déclare avoir acheté le [jour mois année] à [heures minutes] le véhicule désigné ci-dessous »
   → C'est la DATE et l'HEURE D'ACHAT. Mets-les dans dates.cession et dates.heure_cession.
   Cette ligne se lit case par case, dans l'ordre imprimé sous les cases : [Jour] [Mois] [Année] pour la date, puis [Heures] [Minutes]. L'année occupe quatre cases. N'attrape jamais les deux derniers chiffres de l'année pour en faire le jour.

2. Le véhicule : (A) numéro d'immatriculation, (E) numéro d'identification, (D.1) marque, (D.2) type variante version, (D.3) dénomination commerciale, (J.1) genre national. Puis la présence du certificat d'immatriculation, avec soit sa date (I), soit son numéro de formule.

3. « Fait à ______, le [jour mois année] » suivi du cachet et de la signature de l'acquéreur.
   → Date de rédaction, à mettre dans dates.emission. Ce n'est PAS la date d'achat.

4. En bas, le CERTIFICAT DE VENTE, rempli par l'ancien propriétaire : son nom ou sa raison sociale, son SIREN, son adresse, puis « certifie avoir vendu le véhicule désigné ci-dessus au professionnel susnommé le [jour mois année] ». Ce bloc se termine par son propre « Fait à ______, le ______ » et la signature du vendeur.
   → Ces deux dates-là ne vont ni dans cession ni dans emission : ne les rapporte pas.

Signatures : signatures.acheteur pour le cachet et la signature de l'acquéreur, signatures.vendeur pour celle de l'ancien propriétaire en bas, signatures.tampon si un cachet d'entreprise est apposé.`;

const CARTE_GRISE = `Ce document est un certificat d'immatriculation, autrement dit la carte grise. Le recto porte les repères (A) numéro d'immatriculation, (B) date de 1re immatriculation, (C.1) titulaire, (E) numéro d'identification du véhicule, (I) date du certificat, (D.1) marque, et le numéro de formule imprimé en bas — onze caractères commençant par l'année d'édition. Le verso porte les données techniques.

Ce qui est attendu ici, c'est la trace de la vente, portée À LA MAIN sur le document :
- un trait qui barre le certificat ;
- une mention manuscrite de vente, suivie d'une date et souvent d'une heure. La formulation varie et toutes se valent : « vendu le », « cédé le », « cédé », « vendu », « véhicule vendu le » ;
- la signature du vendeur.

→ mentions.cede_le = true dès qu'une telle mention datée est écrite à la main, quelle qu'en soit la formulation. mentions.barree = true si un trait barre le document.
→ dates.cession = UNIQUEMENT la date manuscrite portée à côté de cette mention. Jamais la date imprimée (I) du certificat, jamais la date (B) de première mise en circulation, jamais la date d'une vente antérieure. Si l'écriture n'est pas lisible, mets null.
→ Une carte grise n'a pas de fin de validité : laisse dates.validite à null.

Le recto et le verso arrivent souvent inversés, ou réunis dans un seul fichier. Dis dans « face » ce que tu vois réellement.`;

const MANDAT = `Ce document est le mandat pour effectuer les formalités d'immatriculation, cerfa 13757*03. Il tient sur une page et se lit ainsi :

1. Le MANDANT : « Je soussigné(e) », son nom ou sa raison sociale, son N° SIRET le cas échéant, puis son adresse complète avec code postal, commune et pays. C'est la personne pour le compte de qui la démarche est faite.
2. Le MANDATAIRE : « donne mandat à », nom ou raison sociale et SIRET du professionnel mandaté.
3. Le VÉHICULE : marque, **numéro VIN**, et numéro d'immatriculation « le cas échéant ». Le formulaire demande donc le VIN en premier ; la plaque y est présentée comme facultative.
4. « Fait à ______, le [jour mois année] » suivi de la signature, et pour une société du nom et de la qualité du signataire et de son cachet.

→ dates.emission = la date du « Fait le ». Un mandat ne porte aucune date de vente : laisse dates.cession à null.
→ signatures.mandant = true si une signature manuscrite figure au bas du document, signatures.tampon = true si un cachet d'entreprise y est apposé.
→ personnes : le mandant avec le rôle « mandant », le mandataire avec le rôle « mandataire ».`;

const NON_GAGE = `Ce document est un certificat de situation administrative, appelé aussi non-gage. Il est délivré par le ministère de l'Intérieur, soit depuis le site du SIV, soit par le service Histovec : les deux sont officiels et se valent.

Il porte l'immatriculation du véhicule, son numéro d'identification, l'identité du titulaire, et surtout la situation administrative du véhicule à sa date d'édition.

→ dates.emission = la date d'édition du certificat. Elle compte : le document n'est recevable que quinze jours.
→ situation_administrative.vierge = true seulement si le document ne signale absolument rien. false dès qu'il mentionne une opposition, un gage, une saisie, un vol, une procédure VE ou VGE, une immatriculation suspendue, un certificat perdu ou déclaré en duplicata. Recopie chacune de ces mentions dans situation_administrative.mentions.
→ Un document Histovec qui présente l'historique du véhicule sans conclure sur la situation administrative n'est pas un certificat de situation administrative : dis-le dans la remarque.`;

const IDENTITE = `Ce document est une pièce d'identité : carte nationale d'identité, passeport ou titre de séjour.

→ dates.validite = la date de fin de validité imprimée sur le document. C'est elle qui compte, et elle seule.
→ personnes : le titulaire, avec son nom, son prénom, et son adresse si elle figure.
→ face : « recto » si tu vois la face qui porte la photo, « verso » si tu vois celle qui porte l'adresse et la bande de lecture optique, « recto_verso » seulement si les deux apparaissent réellement.`;

const RECEPISSE_DA = `Ce document est un récépissé de déclaration d'achat, édité par le SIV une fois la démarche enregistrée. Il ne faut pas le confondre avec le formulaire cerfa 13751, qui est la demande et non la preuve.

Il porte l'identité du professionnel acquéreur, celle du vendeur, le numéro d'immatriculation, le numéro VIN, la date et l'heure de l'achat, et la date d'enregistrement dans le système.

→ type_document = « accuse_enregistrement_achat ».
→ dates.cession = la date de l'achat qui y est mentionnée.`;

export const FICHES: Fiche[] = [
  { motif: /cession|15776/i, texte: CESSION },
  { motif: /r[ée]c[ée]piss[ée]|derni[èe]re da|da enregistr/i, texte: RECEPISSE_DA },
  { motif: /d[ée]claration d.achat|13751/i, texte: DECLARATION_ACHAT },
  { motif: /carte grise|certificat d.immatriculation/i, texte: CARTE_GRISE },
  { motif: /mandat|13757/i, texte: MANDAT },
  { motif: /non.?gage|situation administrative/i, texte: NON_GAGE },
  { motif: /identit|passeport|titre de s[ée]jour/i, texte: IDENTITE },
];

export function ficheDe(libellePiece: string): string | null {
  return FICHES.find((f) => f.motif.test(libellePiece))?.texte ?? null;
}
