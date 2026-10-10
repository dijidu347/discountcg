-- Une fiche garage ne se crée que pour une inscription professionnelle.
--
-- Le déclencheur créait un garage dès que `raison_sociale` n'était pas NULL.
-- Or le client envoyait ce champ pour TOUTE inscription, à vide pour un
-- particulier — et une chaîne vide n'est pas NULL.
--
-- Chaque personne qui s'inscrivait comme particulier recevait donc, sans le
-- savoir, un compte garage fantôme : raison sociale vide, SIRET vide, et le
-- rôle « garage » par-dessus le marché. Ce rôle ouvre l'espace professionnel,
-- où une déclaration de cession coûte 5 € au lieu de 20 €.
--
-- Quarante-six comptes sont nés ainsi, du 15 avril au 8 octobre 2026. Aucun
-- n'a jamais déposé la moindre démarche professionnelle.
--
-- Deux verrous désormais, et non un seul : le type de compte déclaré, et une
-- raison sociale réellement renseignée. Le client a cessé d'envoyer ces champs
-- hors inscription professionnelle, mais un garde-fou unique ne suffit pas
-- pour une erreur qui distribue des droits.
--
-- Les quarante-six fiches existantes ne sont pas touchées ici : supprimer des
-- lignes rattachées à des comptes réels se décide, cela ne se glisse pas dans
-- une migration.

create or replace function public.handle_new_garage_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'garage'
     and coalesce(btrim(new.raw_user_meta_data->>'raison_sociale'), '') <> '' then
    insert into public.garages (
      user_id, raison_sociale, siret, adresse, code_postal, ville, email, telephone, reseau, referral_source
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data->>'raison_sociale', ''),
      coalesce(new.raw_user_meta_data->>'siret', ''),
      coalesce(new.raw_user_meta_data->>'adresse', ''),
      coalesce(new.raw_user_meta_data->>'code_postal', ''),
      coalesce(new.raw_user_meta_data->>'ville', ''),
      coalesce(new.raw_user_meta_data->>'email', new.email),
      coalesce(new.raw_user_meta_data->>'telephone', ''),
      new.raw_user_meta_data->>'reseau',
      new.raw_user_meta_data->>'referral_source'
    )
    on conflict (user_id) do nothing;

    insert into public.user_roles (user_id, role)
    values (new.id, 'garage')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;
