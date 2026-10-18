# Les workflows GitHub de ce dépôt

Un jeton d'accès personnel sans la portée `workflow` ne peut pas écrire dans
`.github/workflows/`. Les fichiers qui s'y trouvent ont donc été créés à la main
depuis l'interface web de GitHub, et leur contenu est recopié ici pour qu'il
reste versionné, relisible et diffable comme le reste du code.

**Ce dossier est de la documentation. GitHub n'exécute rien d'ici.**
Toute modification doit être reportée dans le vrai fichier, sous
`.github/workflows/`, sinon les deux divergent en silence.

| Fichier | Vrai emplacement | Rôle |
|---|---|---|
| `article.yml` | `.github/workflows/article.yml` | Rédige et publie un article de blog, mardi et vendredi |

Le workflow `pages.yml`, qui construit et met le site en ligne à chaque push,
vit déjà dans `.github/workflows/` et n'a pas besoin d'être recopié.

## Ce que `article.yml` attend

- L'app **Claude** installée sur le dépôt.
- Un secret **`CLAUDE_CODE_OAUTH_TOKEN`**, engendré par `claude setup-token`.
  Il authentifie avec l'abonnement Claude : les exécutions ne sont pas facturées
  à l'usage comme le serait une clé d'API.
- La compétence `.claude/skills/article-blog/`, qui porte la méthode de rédaction.
