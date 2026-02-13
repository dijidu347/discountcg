

# Ajouter les demarches particuliers avec funnel complet et admin

## Resume

Ajouter 9 nouvelles demarches pour les particuliers (en plus des CG et DC existants) sur la page d'accueil, avec les documents specifiques "Particuliers" tires des images fournies, un funnel complet (simulateur, paiement, infos, documents), et un menu admin "Actions rapides Particuliers" pour gerer prix, documents et statut.

## Demarches a ajouter

D'apres les images fournies, voici les demarches particuliers a creer (colonne "Particuliers" uniquement) :

1. **Carte Grise** (CG) - Deja existant, documents a completer
2. **Declaration de Cession** (DC) - Deja existant, documents a completer
3. **Changement d'adresse** (CHGT_ADRESSE) - Nouveau
4. **Immatriculer un vehicule neuf** (CG_NEUF) - Nouveau
5. **Duplicata** (DUPLICATA) - Nouveau
6. **Demande de FIV** (FIV) - Nouveau
7. **Modification ou correction** (MODIF_CG) - Nouveau
8. **Changement d'adresse locataire** (CHGT_ADRESSE_LOCATAIRE) - Nouveau
9. **Succession et heritage** (SUCCESSION) - Nouveau
10. **Ajouter ou retirer un co-titulaire** (COTITULAIRE) - Nouveau

## Documents par demarche (Particuliers)

### Carte Grise (CG) - existant, documents deja configures
Deja OK.

### Declaration de Cession (DC) - existant, documents a ajouter
- Piece d'identite (recto/verso)
- Certificat d'immatriculation barre
- Mandat signe Cerfa 13757
- Certificat de cession signe Cerfa 16776
- Piece d'identite de l'acquereur (recto/verso) - facultatif

### Changement d'adresse (CHGT_ADRESSE) - prix fixe 30EUR
- Piece d'identite (recto/verso)
- Certificat d'immatriculation
- Mandat signe Cerfa 13757
- Demande d'immatriculation signee Cerfa 13750
- Justificatif de domicile de moins de 6 mois

### Vehicule neuf (CG_NEUF) - prix regional + frais
- Piece d'identite (recto/verso)
- Permis de conduire (recto/verso)
- Justificatif de domicile de moins de 6 mois
- Attestation d'assurance
- Mandat signe Cerfa 13757
- Cerfa 13749 (remis par le constructeur)
- Piece d'identite du co-titulaire (si necessaire) - facultatif
- Contrat de location + mandat societe (si LOA) - facultatif

### Duplicata (DUPLICATA) - prix fixe 29.90EUR
- Piece d'identite (recto/verso)
- Permis de conduire (recto/verso)
- Justificatif de domicile de moins de 6 mois
- Attestation d'assurance
- Mandat signe Cerfa 13757
- Demande d'immatriculation signee Cerfa 13750
- Declaration de perte ou de vol signee Cerfa 13753
- Controle technique en cours de validite
- Mandat societe de location (si LOA) - facultatif

### Demande de FIV (FIV) - prix fixe 19.90EUR
- Piece d'identite du titulaire (recto/verso)
- Permis de conduire du titulaire (recto/verso)
- Justificatif de domicile de moins de 6 mois
- Mandat signe Cerfa 13757
- Declaration de perte ou de vol signee Cerfa 13753
- Mandat societe de location (si LOA) - facultatif

### Modification ou correction (MODIF_CG) - prix fixe 29.90EUR
- Piece d'identite (recto/verso)
- Permis de conduire (recto/verso)
- Justificatif de domicile de moins de 6 mois
- Attestation d'assurance
- Certificat d'immatriculation
- Mandat signe Cerfa 13757
- Demande d'immatriculation signee Cerfa 13750
- Piece justificative officielle de la modification
- Controle technique en cours de validite

### Changement d'adresse locataire (CHGT_ADRESSE_LOCATAIRE) - prix fixe 30EUR
- Piece d'identite (recto/verso)
- Certificat d'immatriculation
- Mandat signe par le locataire Cerfa 13757
- Mandat signe et tamponné par le bailleur
- Demande d'immatriculation signee par le locataire Cerfa 13750
- Justificatif de domicile de moins de 6 mois

### Succession et heritage (SUCCESSION) - prix fixe 29.90EUR
Deux cas : heritier garde / heritier vend. Documents communs :
- Piece d'identite de l'heritier (recto/verso)
- Permis de conduire (recto/verso)
- Justificatif de domicile de moins de 6 mois
- Ancien certificat d'immatriculation
- Mandat Cerfa 13757 signe
- Demande d'immatriculation Cerfa 13750 signee
- Certificat de deces
- Acte notarie ou justificatif qualite d'heritier
- Lettre de desistement (si plusieurs heritiers) - conditionnel
- Controle technique en cours de validite (vehicules +4 ans)

### Ajouter ou retirer un co-titulaire (COTITULAIRE) - prix fixe 29.90EUR
Deux cas : ajouter / retirer. Documents communs :
- Piece d'identite et permis du titulaire (recto/verso)
- Piece d'identite et permis du co-titulaire (recto/verso)
- Justificatif de domicile de moins de 6 mois
- Attestation d'assurance
- Mandat signe Cerfa 13757
- Demande d'immatriculation signee Cerfa 13750
- Attestation ou acte de mariage/pacs (ajouter) OU Certificat de cession ou acte de divorce (retirer) - conditionnel
- Controle technique en cours de validite

## Plan technique

### Etape 1 : Migration base de donnees

Inserer les nouvelles demarches dans `guest_demarche_types` :
- CHGT_ADRESSE (30EUR, require_carte_grise_price: false)
- CG_NEUF (20EUR, require_carte_grise_price: true)
- DUPLICATA (29.90EUR, require_carte_grise_price: false)
- FIV (19.90EUR, require_carte_grise_price: false)
- MODIF_CG (29.90EUR, require_carte_grise_price: false)
- CHGT_ADRESSE_LOCATAIRE (30EUR, require_carte_grise_price: false)
- SUCCESSION (29.90EUR, require_carte_grise_price: false)
- COTITULAIRE (29.90EUR, require_carte_grise_price: false)

Mettre a jour les documents de DC existants dans `guest_order_required_documents`.

Inserer tous les documents requis pour chaque nouveau type dans `guest_order_required_documents`.

### Etape 2 : Mise a jour SimulateurSection

- Supprimer le filtre qui exclut DA (garder le filtre) et afficher tous les types actifs
- Ajouter des icones pour chaque nouveau code de demarche
- Le formulaire adapte deja l'affichage selon `require_carte_grise_price` (departement oui/non)

### Etape 3 : Mise a jour DemarcheSimple

- Etendre le composant pour supporter les nouveaux types (au-dela de DA/DC)
- Les documents sont deja charges dynamiquement depuis `guest_order_required_documents`
- Ajouter les icones correspondantes

### Etape 4 : Mise a jour UploadListSimple

- Etendre le type du prop `demarcheType` pour accepter tous les nouveaux codes
- Verifier que le chargement des documents depuis la BDD fonctionne pour tous types

### Etape 5 : Page admin "Actions rapides Particuliers"

Creer une nouvelle page `src/pages/admin/ManageGuestActions.tsx` qui reprend le meme design que `ManageActions.tsx` (PRO) mais travaille sur les tables `guest_demarche_types` et `guest_order_required_documents` :
- Lister toutes les demarches particuliers avec prix, statut actif/inactif
- Editer le prix, le titre, la description, le statut
- Gerer les documents obligatoires/optionnels par demarche
- Flags : require_vehicle_info, require_carte_grise_price

### Etape 6 : Integration admin

- Ajouter le lien "Actions rapides Particuliers" dans le dashboard admin, section "Espace Particuliers"
- Ajouter la route `/admin/guest-actions` dans App.tsx

### Etape 7 : Ajustement du funnel

- Les demarches avec `require_carte_grise_price: true` (CG, CG_NEUF) passeront par le parcours avec API vehicule et calcul regional
- Les autres demarches passeront par le parcours `DemarcheSimple` (prix fixe, paiement, infos, documents)
- Pour SUCCESSION et COTITULAIRE, ajouter un questionnaire simple dans le flux pour determiner les documents conditionnels

