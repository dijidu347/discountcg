// `/demarrer/<code>` : le raccourci entre le menu et le formulaire.
//
// Le formulaire de commande a besoin qu'une commande existe avant de s'ouvrir.
// Cette page ne montre donc qu'un chargement : elle crée la commande et
// redirige. Elle est en `noindex` — il n'y a rien à lire, et une commande
// ouverte par un robot ne servirait personne.

import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { destinationDeLaDemarche } from "@/lib/demarrerDemarche";
import { getDemarcheByCode } from "@/data/demarchesConfig";

export default function DemarrerDemarche() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  // React monte deux fois en développement : sans ce garde-fou, deux commandes.
  const lance = useRef(false);

  const demarche = code ? getDemarcheByCode(code) : undefined;

  useEffect(() => {
    if (!code || lance.current) return;
    lance.current = true;

    (async () => {
      try {
        const destination = await destinationDeLaDemarche(code);
        if ("message" in destination && destination.message) {
          toast({ title: "Démarche réservée aux professionnels", description: destination.message });
        }
        navigate(destination.chemin, { replace: true });
      } catch (erreur) {
        console.error("Erreur création commande:", erreur);
        toast({
          title: "Erreur",
          description: "Impossible de démarrer la démarche",
          variant: "destructive",
        });
        // On renvoie vers la page de la démarche, qui garde un bouton.
        navigate(demarche ? `/${demarche.slug}` : "/", { replace: true });
      }
    })();
  }, [code, demarche, navigate, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {demarche ? `Ouverture de « ${demarche.shortTitle} »…` : "Ouverture de votre démarche…"}
      </p>
    </div>
  );
}
