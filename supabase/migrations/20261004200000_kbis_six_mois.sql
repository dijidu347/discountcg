-- Le Kbis demandé à la vérification d'un compte garage vaut six mois, pas
-- trois.
--
-- Le guide le dit deux fois — « Extrait Kbis de moins de 6 mois » page 13 pour
-- la DC, page 16 pour la DA — et tout le site compte déjà six mois : la
-- validité calculée par validite_kbis(), la relance par e-mail, les pièces des
-- autres démarches pro. Seule cette description annonçait trois mois, ce qui
-- faisait croire à un garage qu'un Kbis de quatre mois n'était plus valable.

update public.garage_verification_required_documents
set description = 'Extrait K-Bis de moins de 6 mois'
where code = 'kbis';
