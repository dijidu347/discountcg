-- Savoir si l'email est réellement parti.
--
-- L'historique affichait une notification dès qu'elle était écrite en base.
-- Un envoi échoué s'y lisait exactement comme un envoi réussi, et l'équipe
-- relançait un garage qui n'avait jamais rien reçu — ou croyait l'avoir
-- prévenu alors que non.
--
-- La colonne reste vide pour les deux cent trois notifications antérieures :
-- on ne peut pas reconstituer après coup ce qu'on n'a pas enregistré.

alter table public.garage_verification_notifications
  add column if not exists email_envoye boolean;

comment on column public.garage_verification_notifications.email_envoye is
  'L''email est-il réellement sorti ? Vide pour les notifications antérieures à ce suivi.';
