-- Catalogue particulier : on garde les demarches et les prix affiches sur le
-- site, on retire les doublons invisibles, et on complete les listes de pieces
-- des demarches visibles qui ne demandaient que le mandat.
-- Deja applique en production le 18/09/2026.

-- 1. Doublons invisibles (jamais proposes sur le site, a d'autres prix).
update guest_demarche_types set actif = false, updated_at = now()
where code in ('WW_PROVISOIRE','CHGT_ADRESSE_LOCATAIRE','ANNULER_CPI_WW','ANNULER_CORRIGER_DC_DA','DEMANDE_IMMAT','CYCLO_ANCIEN');

-- 2. Changement d'adresse du locataire : reprise de la liste du doublon.
insert into guest_order_required_documents (demarche_type_code, nom_document, ordre, obligatoire)
select 'CHANGEMENT_ADRESSE_LOCATAIRE', nom_document, ordre, obligatoire from guest_order_required_documents
where demarche_type_code = 'CHGT_ADRESSE_LOCATAIRE' and actif and nom_document not like 'Mandat signé par le locataire%';
update guest_order_required_documents set ordre = 3
where demarche_type_code = 'CHANGEMENT_ADRESSE_LOCATAIRE' and nom_document = 'Mandat (cerfa 13757*03)';

-- 3. Annulation d'une DC ou DA : reprise de la liste du doublon.
insert into guest_order_required_documents (demarche_type_code, nom_document, ordre, obligatoire)
select 'ANNULER_DC_DA', nom_document, ordre, obligatoire from guest_order_required_documents
where demarche_type_code = 'ANNULER_CORRIGER_DC_DA' and actif and nom_document not like 'Mandat%';
update guest_order_required_documents set ordre = 5
where demarche_type_code = 'ANNULER_DC_DA' and nom_document = 'Mandat (cerfa 13757*03)';

-- 4. Declaration de cession : carte grise et piece d'identite demandees trois fois.
update guest_order_required_documents set actif = false, updated_at = now()
where demarche_type_code = 'DC'
  and nom_document in ('Carte grise (recto)','Carte grise (verso)','Pièce d''identité (recto)','Pièce d''identité (verso)');
