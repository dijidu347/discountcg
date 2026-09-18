-- Commandes particulier : le navigateur du client ne peut plus se declarer paye
-- ni modifier ce qu'il a paye.
--
-- Les regles d'acces de guest_orders laissent tout visiteur creer et modifier
-- une commande (le parcours invite en a besoin). Sans garde-fou, un client
-- pouvait passer sa commande a "payee" sans passer par la banque, ou baisser le
-- montant apres coup. Seuls le serveur (webhook de paiement, fonctions) et les
-- administrateurs touchent desormais aux champs de paiement.

-- Departement choisi dans le simulateur : le serveur en a besoin pour
-- recalculer la taxe au moment du paiement.
alter table public.guest_orders add column if not exists departement text;

create or replace function public.proteger_paiement_commande_particulier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Serveur (webhook, fonctions, migrations) et administrateurs : aucun filtre.
  if auth.role() is null or auth.role() = 'service_role' or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.paye := false;
    new.paid_at := null;
    new.payment_intent_id := null;
    new.status := 'en_attente';
    new.resubmission_paid := false;
    new.requires_resubmission_payment := false;
    return new;
  end if;

  -- Paiement : jamais depuis le navigateur.
  new.paye := old.paye;
  new.paid_at := old.paid_at;
  new.payment_intent_id := old.payment_intent_id;
  new.resubmission_paid := old.resubmission_paid;
  new.requires_resubmission_payment := old.requires_resubmission_payment;
  new.tracking_number := old.tracking_number;

  -- Seul changement de statut permis au client : renvoyer ses pieces apres paiement.
  if new.status is distinct from old.status
     and not (old.paye and new.status = 'en_traitement') then
    new.status := old.status;
  end if;

  -- Une fois paye, le contenu facture ne bouge plus.
  if old.paye then
    new.demarche_type := old.demarche_type;
    new.montant_ht := old.montant_ht;
    new.montant_ttc := old.montant_ttc;
    new.frais_dossier := old.frais_dossier;
    new.express := old.express;
    new.certificat_non_gage := old.certificat_non_gage;
    new.sms_notifications := old.sms_notifications;
    new.dossier_prioritaire := old.dossier_prioritaire;
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_paiement_commande_particulier on public.guest_orders;
create trigger proteger_paiement_commande_particulier
  before insert or update on public.guest_orders
  for each row execute function public.proteger_paiement_commande_particulier();
