-- Les quatre colonnes ajoutées à chaud aujourd'hui, rattrapées dans le dépôt.
--
-- Elles ont été créées directement en base pendant la séance, pour avancer vite
-- sur des correctifs qui pressaient. La base les a donc, le dépôt non : un
-- nouvel environnement monté depuis ces migrations se retrouverait sans elles,
-- et la lecture automatique comme le tableau de bord échoueraient à l'écriture.
--
-- Tout est écrit « if not exists » : rejouer ce fichier sur la base de
-- production ne fait rien, il ne sert qu'à ce que le dépôt dise la vérité.

-- Un compte de la maison — l'adresse admin, les comptes de test — n'est soumis
-- à aucune vérification : ni compté dans les files, ni relancé par les crons,
-- ni affiché comme un garage à contrôler. Sans cela, contact@discountcartegrise.fr
-- s'envoyait à lui-même des rappels de Kbis.
alter table public.garages
  add column if not exists compte_interne boolean not null default false;

comment on column public.garages.compte_interne is
  'Compte de la maison (adresse admin, comptes de test) : jamais soumis a la verification, ni compte dans les files, ni relance par les crons.';

-- Ce que la lecture automatique reconnaît sur la pièce d'immatriculation.
--
-- Depuis qu'on accepte l'attestation d'immatriculation au RNE, savoir lequel
-- des deux documents a été déposé ne suffit plus : le Kbis reste la règle pour
-- une société, l'attestation n'est admise que pour qui ne peut pas en obtenir.
-- Ce discernement se lit sur le document lui-même — un Kbis mentionne toujours
-- le RCS, l'attestation d'un artisan jamais — d'où ces trois colonnes, qui
-- portent ce que la lecture a relevé pour que l'administration tranche en
-- connaissance de cause.
alter table public.verification_documents
  add column if not exists nature_document text,
  add column if not exists forme_juridique text,
  add column if not exists inscrit_rcs boolean;

comment on column public.verification_documents.nature_document is
  'Ce que la lecture automatique a reconnu : kbis, ou rne pour une attestation d''immatriculation au Registre National des Entreprises. Un artisan n''a pas de Kbis : le dire evite de lui reclamer l''impossible.';

comment on column public.verification_documents.forme_juridique is
  'Forme juridique lue sur le document (SARL, SAS, entrepreneur individuel...). Decide si un Kbis existe : une societe en a un, un artisan non.';

comment on column public.verification_documents.inscrit_rcs is
  'Le document mentionne-t-il une inscription au registre du commerce et des societes. Si oui, un Kbis existe et l''attestation RNE ne suffit pas.';
