## Objectif

Calculer nous-mêmes le prix de la carte grise selon le **genre du véhicule** (case J.1) au lieu de faire confiance aveuglément à l'API. Cela corrige les prix pour motos (demi-tarif), CTTE (Y.2 = 34 €), remorques (Y.1 = 0), quads, VASP, cyclomoteurs et tracteurs agricoles.

## Règles appliquées (2026, sources officielles service-public / BOFIP)

| Genre (J.1) | Y.1 régionale | Y.2 transport | Y.3 malus | Abattement 10 ans |
|---|---|---|---|---|
| **VP** voiture | CV × tarif dpt | — | si neuf/import | -50 % |
| **CTTE** utilitaire ≤3,5 t | CV × tarif dpt | **34 €** | — | -50 % |
| **CAM/TRR >3,5 t** | *hors périmètre en ligne* | *manuel* | — | — |
| **MTL / MTT1 / MTT2 / MTL1** moto | CV × tarif dpt × **50 %** | — | — | -50 % (pas cumul) |
| **CL** cyclomoteur | **0 €** | — | — | — |
| **QM** quadricycle | CV × tarif dpt | — | — | -50 % |
| **REM / SREM** remorque | **0 €** | — | — | — |
| **VASP** camping-car/ambulance | CV × tarif dpt | — | — | -50 % |
| **TRA** tracteur agricole | **0 €** | — | — | — |

Toutes les catégories paient **Y.4 = 11 €** et **Y.5 = 2,76 €**.

**Électrique / hybride / GPL / E85** : tarif plein partout (règle 2025 confirmée, plus d'exonération nationale).

**Malus CO2 (Y.3)** : uniquement si case « véhicule neuf ou importé jamais immatriculé en France » cochée dans le formulaire manuel. Sinon 0.

## Modifications

### 1. `src/utils/calculatePrice.ts`
Refonte complète autour d'une table `GENRE_RULES` qui définit pour chaque genre : coefficient Y.1 (0, 0.5, 1), Y.2 fixe (0 ou 34), et éligibilité à l'abattement 10 ans. Ajout d'un genre `AUTRE` qui retombe sur VP. Le paramètre `genre` reste optionnel (défaut = VP) pour ne pas casser les appels existants.

Correctif au passage : le code actuel applique la taxe parafiscale (34 €) aux CYCL, REM, SREM, TRA, VASP — c'est faux. Y.2 est uniquement pour CTTE (et poids lourds).

### 2. `supabase/functions/carte-grise-quote/index.ts`
Après le retour API, recalculer nous-mêmes le prix via une copie serveur de la même logique, en s'appuyant sur `vehicle.genre` + `vehicle.puissance_fiscale` + `vehicle.date_mise_en_circulation` + tarif régional (à récupérer via département → `department_tariffs`). Renvoyer `price.total` = **notre calcul**, avec `price.apiTotal` en debug. Détecter poids lourd (CAM/TRR + PTAC>3500) → `incomplete: true, reason: 'heavy_vehicle'`.

### 3. `src/components/VehicleFormCG.tsx` (pro)
Quand le lookup API est **incomplet** (genre inconnu, CV=0, ou poids lourd), afficher un **panneau de saisie manuelle** avec :
- Menu genre : Voiture (VP), Utilitaire (CTTE), Moto (MTL), Quadricycle (QM), Camping-car/VASP, Remorque (REM), Cyclomoteur (CL), Tracteur agricole (TRA)
- Si CAM/TRR/>3,5t → message « Contactez-nous pour ce type de véhicule »
- Champs : CV fiscaux, date 1ère MEC
- Case optionnelle : « Véhicule neuf ou importé (jamais immatriculé en France) » → si cochée, champ CO2 g/km apparaît pour calcul malus

### 4. `src/pages/ResultatCarteGrise.tsx` (guest / simulateur public)
Même comportement : si l'API renvoie `incomplete`, proposer la saisie manuelle avec les mêmes champs.

## Détails techniques

- `PriceCalculation` interface étendue avec `genre: string` et `malus: number`.
- Fonction utilitaire `computeMalusCO2(co2: number, dateMEC: string): number` avec le barème WLTP 2026 (seuil 108 g/km, progression jusqu'à 70 000 €).
- Table `GENRE_RULES` exportée pour être réutilisée par les 4 emplacements (pas de duplication).
- Aucune modification de la DB (tout est calculé en front + edge).
- Snapshot en DB inchangé : `prix_cv`, `taxe_parafiscale`, `frais_gestion`, `frais_acheminement` sont déjà là et suffisent (on ajoute malus dans `taxe_parafiscale` si nécessaire, ou colonne séparée si tu préfères).

## Non-fait (à part si tu demandes)

- CAM/TRR >3,5 t vendus en ligne (barème PTAC 127/189/285 €) → confirmé « manuel/contact »
- Gestion Hauts-de-France demi-tarif électrique 2026 (cas très marginal)
- Exceptions collection, successions, etc.
