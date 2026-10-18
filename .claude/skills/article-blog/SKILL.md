---
name: article-blog
description: Rédige, vérifie à la source et publie un article automobile sur le blog de discountcartegrise.fr.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebSearch
---

Écris et publie un article sur le blog de discountcartegrise.fr.

Tu travailles à la racine du dépôt, déjà cloné. Les dépendances sont déjà installées.

## Règle technique, à respecter avant tout

Elle a une cause mesurée. Le 14 octobre 2026, cette tâche s'est figée à 7 h 53 sur un
`WebFetch` vers legifrance.gouv.fr qui n'a jamais rendu de réponse et n'a jamais expiré.
La session est restée suspendue deux heures sans rien produire. Donc :

- Pour lire une page, **n'utilise pas WebFetch**. Utilise Bash avec un délai dur :
  `curl -sL --max-time 25 "<url>" | sed 's/<[^>]*>//g' | tr -s " \n" " \n" | head -c 6000`
  Si curl expire, tu le sais et tu passes à autre chose.
- WebSearch reste utilisable : il a toujours répondu.
- Ne lance jamais deux lectures de page à la suite sans avoir vu le résultat de la première.

## Le périmètre

L'automobile telle que la vit un propriétaire de véhicule en France. Pas seulement la carte grise.

**Bienvenus :** contrôle technique, zones à faibles émissions, malus et bonus, carburants et
bornes de recharge, assurance auto, permis de conduire, achat et revente d'occasion, arnaques
et litiges, réglementation européenne applicable en France, marché du véhicule d'occasion,
plaques et immatriculation, obligations des professionnels de l'automobile.

**À écarter :** les concept-cars, les essais de modèles, le sport automobile, les annonces de
constructeurs sans effet pour le propriétaire. Ils feraient venir des lecteurs qui ne
deviendront jamais clients et brouilleraient le sujet sur lequel le site est reconnu.

**Le test :** « un automobiliste qui lit ça doit-il faire quelque chose, ou éviter une erreur
qui lui coûte ? » Si non, change de sujet.

## Méthode, dans cet ordre

1. Lis `src/data/articles.ts` : la structure, les catégories, le commentaire d'en-tête qui pose
   la règle de rédaction, et les sujets déjà traités, pour ne pas les refaire.

2. Cherche ce qui a bougé depuis le dernier article (WebSearch, mode extended), dans le
   périmètre ci-dessus.

3. **Vérifie à la source avant d'écrire une phrase**, avec curl comme indiqué. Pour la
   réglementation : legifrance.gouv.fr, service-public.gouv.fr, interieur.gouv.fr,
   douane.gouv.fr, impots.gouv.fr, ants.gouv.fr, ecologie.gouv.fr, securite-routiere.gouv.fr,
   utac.com. Pour un chiffre de marché : l'organisme qui le publie, jamais un article qui le
   cite. Ne te contente jamais d'un extrait de résultat de recherche. Si une affirmation ne se
   vérifie pas, elle ne sort pas, ou l'article change de sujet.

4. **Relis ce qui est déjà publié** (`src/data/demarchesConfig.ts`, `src/data/articles.ts`).
   Si ton article contredit le site, l'un des deux est faux : tranche à la source et corrige
   le mauvais.

5. **Auto-correction.** Une fois rédigé, relis en cherchant tes propres erreurs. Vérifie chaque
   date, chaque montant, chaque numéro d'article une deuxième fois en rouvrant la source.
   Retire toute affirmation qui ne vient que d'un blog.

   Erreurs déjà commises sur ce projet : confondre la FIV avec l'attestation FFVE ; inventer un
   délai de trois mois pour mettre une carte grise à son nom (il n'en existe aucun quand on
   garde le véhicule ; les trois mois concernent la revente, arrêté du 9 février 2009 art. 12) ;
   publier des tarifs professionnels sur une page de particuliers ; écrire qu'une mesure « a été
   abandonnée du projet de loi de finances » sans source officielle ; placer une date butoir sur
   le mauvais critère d'un arrêté sans relire l'article qui la porte.

6. Ajoute l'article à `ARTICLES` dans `src/data/articles.ts`, avec la date du jour, ses sources,
   et une photo libre de droits dans `public/blog/<slug>.jpg`. Télécharge-la depuis Unsplash :
   `curl -sL --max-time 40 "https://unsplash.com/photos/<id>/download?force=true&w=1600" -o public/blog/<slug>.jpg`
   puis vérifie avec `file` que c'est bien un JPEG et pas une page HTML d'erreur. Si la catégorie
   n'existe pas encore, ajoute-la à `COULEURS_CATEGORIE` avec une teinte distincte.

7. Contrôle : `npx tsc --noEmit -p tsconfig.app.json`, puis `npm run build`. Le pré-rendu doit
   annoncer une page et une URL de sitemap de plus qu'avant.

8. Vérifie que l'article est dans le **HTML pré-rendu**, pas seulement dans le JavaScript :
   `grep -o '<title>[^<]*' dist/blog/<slug>/index.html`. S'il n'y est pas, le pré-rendu ne l'a
   pas pris — regarde `scripts/prerender.mjs` avant de publier quoi que ce soit.

9. Commit et push sur `main`. **C'est tout** : le workflow `.github/workflows/pages.yml`
   construit et publie à chaque push, en deux à trois minutes. N'appelle jamais `deploy_project` :
   il publierait sur discountcg.lovable.app, qui n'est plus le vrai site depuis le 16 octobre 2026.

10. Attends la publication, puis vérifie en ligne :
    `node scripts/verifier-site.mjs` doit finir par « Tout est bon. » et montrer ton commit.
    Puis `curl -s https://discountcartegrise.fr/blog/<slug> | grep -o '<title>[^<]*'`.

11. Termine en écrivant, dans le journal d'exécution : le titre, les sources sur lesquelles il
    s'appuie, et ce que tu as corrigé sur le site s'il y avait une contradiction.

## Rien de vérifié, rien de publié

Si aucun sujet ne tient la route cette fois-ci, **ne publie pas** et dis-le en une ligne.
Deux rendez-vous par semaine ne veulent pas dire deux articles par semaine : un article faux ou
creux coûte plus cher que pas d'article, parce qu'il est publié sous l'habilitation n° 285046.
