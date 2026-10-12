import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Le socle est séparé du code de l'application.
        //
        // Tout partait dans un seul fichier d'entrée de 524 Ko, rechargé en
        // entier à chaque publication : React, le routeur, Supabase, Stripe et
        // la bibliothèque de composants changent pourtant une fois par
        // trimestre, quand le code du site change dix fois par jour. Séparés,
        // ils restent dans le cache du navigateur d'une publication à l'autre.
        //
        // Le découpage suit la durée de vie, pas la taille : chaque groupe
        // réunit ce qui bouge au même rythme.
        // Ne sont regroupés que les modules dont TOUT le contenu sert dès le
        // premier écran : React, le routeur, le client de données et Supabase.
        //
        // Première tentative, corrigée : Radix et les icônes y figuraient
        // aussi. Mal lui en a pris — forcer un paquet entier dans un morceau
        // empêche Rollup d'en retirer ce qui ne sert pas, et chaque route
        // tirait alors les vingt-huit composants Radix du projet au lieu des
        // trois qu'elle utilise. Le premier chargement passait de 524 à
        // 692 Ko. Laissés libres, ils se répartissent par route et ne
        // voyagent qu'avec ce qui les appelle.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "socle-react";
          if (id.includes("react-router")) return "socle-react";
          if (id.includes("@tanstack")) return "socle-react";
          if (id.includes("@supabase")) return "socle-supabase";
        },
      },
    },
  },
}));
