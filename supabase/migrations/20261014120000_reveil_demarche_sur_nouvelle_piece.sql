-- Une pièce déposée rallume la démarche, quel que soit le chemin emprunté.
--
-- Le réveil — `admin_viewed = false`, qui remet la démarche en rouge et la fait
-- remonter dans « à traiter » — était écrit dans UN composant React,
-- `DocumentUpload.tsx`. Or les pièces arrivent par plusieurs chemins : l'écran
-- de la démarche, la liste du garage, l'API externe, les emplacements de
-- « pièce demandée ». Mesure du 14 octobre 2026, sur quatorze jours :
--
--     127 pièces redéposées après un refus
--      47 ont déclenché le réveil
--      80 ne l'ont pas déclenché  (63 %)
--
-- Autrement dit, deux tiers des corrections envoyées par les garages
-- n'apparaissaient nulle part comme urgentes : la pièce était bien là, mais la
-- démarche restait grise, au milieu de la liste. C'est ce que l'équipe a
-- constaté sans pouvoir le nommer.
--
-- La règle descend donc en base, sur l'insertion, là où tous les chemins
-- passent — y compris ceux qu'on écrira demain.
--
-- `updated_at` est remis à maintenant en même temps : au sein des non-vues, la
-- liste admin trie par cette date, et c'est elle qui fait remonter la démarche.
--
-- Une seule exception : un document déposé PAR un administrateur ne réveille
-- rien. C'est lui qui vient de le poser, le lui signaler comme nouveau n'aurait
-- aucun sens — et ferait clignoter la démarche à chaque pièce rendue au garage.

create or replace function public.reveiller_demarche_sur_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and has_role(auth.uid(), 'admin'::app_role) then
    return new;
  end if;

  update public.demarches
     set admin_viewed = false,
         updated_at = now()
   where id = new.demarche_id;

  return new;
end;
$$;

drop trigger if exists documents_reveiller_demarche on public.documents;
create trigger documents_reveiller_demarche
  after insert on public.documents
  for each row execute function public.reveiller_demarche_sur_document();
