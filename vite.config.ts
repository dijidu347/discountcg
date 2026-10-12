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
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "socle-react";
          if (id.includes("react-router")) return "socle-routeur";
          if (id.includes("@supabase")) return "socle-supabase";
          if (id.includes("@stripe")) return "socle-stripe";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) return "socle-ui";
          if (id.includes("@tanstack")) return "socle-requetes";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) return "socle-formulaires";
          if (id.includes("date-fns")) return "socle-dates";
          if (id.includes("lucide-react")) return "socle-icones";
        },
      },
    },
  },
}));
