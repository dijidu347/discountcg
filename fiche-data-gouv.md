# Fiche à déposer sur data.gouv.fr

**Où :** https://www.data.gouv.fr/admin/reuse/new/ (il faut un compte, gratuit)

---

## Titre

Simulateur du prix de la carte grise par département

## URL

https://discountcartegrise.fr/simulateur

## Type

Application

## Thématique

Transports et mobilités

## Tags

carte-grise · certificat-immatriculation · simulateur · cheval-fiscal · taxe-regionale · immatriculation

## Jeu de données à rattacher

**Simulateur de COÛT DU CERTIFICAT D'IMMATRICULATION (CARTE GRISE)**
Publié par le Premier ministre (DILA), licence ouverte.
https://www.data.gouv.fr/datasets/simulateur-de-cout-du-certificat-dimmatriculation-carte-grise

C'est le jeu qui porte les données de référence du simulateur officiel : tarif
du cheval fiscal par région, barème des démarches, malus. C'est aussi celui
auquel le concurrent `lesvoitures.fr` a rattaché sa propre réutilisation.

---

## Description

Un simulateur gratuit qui calcule le prix d'un certificat d'immatriculation à
partir des données de référence publiées par la DILA.

**Ce qu'il fait**

Il reprend la taxe régionale département par département — les 101
départements, du tarif le plus bas (Mayotte, 30 € le cheval fiscal) au plus
élevé (Île-de-France, 68,95 €) — et applique les règles de calcul du
certificat d'immatriculation :

- la taxe régionale Y.1, soit la puissance fiscale multipliée par le tarif du
  département du titulaire ;
- la taxe de formation professionnelle Y.2, 34 €, due par les seules
  camionnettes de 3,5 tonnes au plus ;
- la taxe de gestion Y.4, 11 €, et la redevance d'acheminement Y.5, 2,76 € ;
- l'abattement de 50 % sur la taxe régionale au-delà de dix ans de mise en
  circulation ;
- les exonérations par genre : cyclomoteurs, remorques, tracteurs et matériel
  agricole, exonérés de taxe régionale ; motos à demi-tarif.

**Ce qu'il ajoute aux données**

Le calcul part du numéro d'immatriculation : la puissance fiscale, le genre,
l'énergie et la date de première mise en circulation sont lus dans le fichier
national, sans que l'utilisateur ait à les recopier de sa carte grise. C'est
là que se trompent la plupart des estimations faites à la main — une puissance
fiscale lue dans la mauvaise case suffit à fausser le montant.

La page publie également le tableau complet du tarif du cheval fiscal des 101
départements, filtrable par région et triable, ainsi que le prix obtenu pour
les puissances courantes, de 3 à 10 CV.

**Conformité**

Les tarifs utilisés ont été comparés aux données de référence du simulateur
officiel : les 101 départements correspondent, sans écart.

Simulateur gratuit, sans inscription. Édité par DISCOUNT AUTO / PAREBRISE,
habilité par la préfecture pour l'accès au Système d'Immatriculation des
Véhicules (n° 285046) et agréé par le Trésor public pour la perception des
taxes d'immatriculation (n° 63198).

---

## Image à joindre

Une capture de la page, prise sur le tableau des 101 départements plutôt que sur
le formulaire : c'est ce qui montre la réutilisation des données.

---

## Deux remarques

1. La description dit ce que fait l'outil et ce qu'il ajoute aux données
   publiques. C'est ce qu'attend data.gouv.fr d'une réutilisation ; une fiche
   purement commerciale se fait retirer.

2. La mention de l'agrément et de l'éditeur est volontaire : elle distingue un
   service habilité d'un simple comparateur, et c'est vérifiable.
