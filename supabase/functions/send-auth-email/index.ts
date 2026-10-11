// Hors service, et volontairement.
//
// Cette fonction envoyait les e-mails d'authentification — confirmation
// d'adresse, réinitialisation de mot de passe — avant que `auth-email-hook`
// ne reprenne ce rôle. Plus rien ne l'appelait : aucune référence dans le
// site, aucune dans les autres fonctions, aucune dans la configuration des
// hameçons d'authentification.
//
// Elle restait pourtant en ligne, et ouverte : `verify_jwt = false`, aucune
// vérification de signature, aucun contrôle d'appelant. Elle acceptait de
// l'appelant le destinataire (`user.email`) ET l'adresse du bouton
// (`email_data.confirmation_url`), puis envoyait depuis
// noreply@discountcartegrise.fr un message au gabarit maison, intitulé
// « Confirmez votre adresse email », avec un bouton pointant où l'appelant
// voulait.
//
// Autrement dit : une trousse d'hameçonnage prête à l'emploi, sur notre
// domaine, accessible par une seule requête. Nous sortons d'un faux positif
// d'hameçonnage chez SFR ; celui-là n'en aurait pas été un.
//
// On ne la supprime pas du dépôt tout de suite : un retrait de fichier ne
// garantit pas le retrait du point d'entrée déjà déployé. Elle refuse donc,
// et ce refus, lui, se déploie.
//
// Le gabarit d'origine reste dans l'historique du dépôt, au commit qui a
// introduit ce fichier, si ces e-mails devaient revenir ici un jour.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(() =>
  new Response(
    JSON.stringify({
      error: "Gone",
      message: "Les e-mails d'authentification passent par auth-email-hook.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
