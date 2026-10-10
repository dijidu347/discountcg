// Retirer du stockage les fichiers que plus rien ne référence.
//
// Un orphelin est présent sur le disque sans qu'aucune ligne ne donne son
// adresse : personne ne peut l'atteindre, puisque les écrans lisent la base.
// Ils s'accumulent à chaque démarche supprimée et à chaque document remplacé.
//
// Deux temps obligatoires, et c'est tout l'intérêt de cet écran : on regarde
// d'abord combien il y en a, puis on supprime. Une suppression de fichiers est
// définitive, et la détection repose sur une convention — un chemin reconstruit
// ailleurs sans être enregistré passerait pour un orphelin.

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { HardDrive, Loader2 } from "lucide-react";

export function NettoyageStockage() {
  const { toast } = useToast();
  const [travail, setTravail] = useState<"apercu" | "suppression" | null>(null);
  const [orphelins, setOrphelins] = useState<number | null>(null);
  const [echantillon, setEchantillon] = useState<string[]>([]);

  const appeler = async (supprimer: boolean) => {
    setTravail(supprimer ? "suppression" : "apercu");
    const { data, error } = await supabase.functions.invoke("nettoyer-fichiers-orphelins", {
      body: { supprimer },
    });
    setTravail(null);

    if (error) {
      toast({ title: "Nettoyage impossible", description: error.message, variant: "destructive" });
      return;
    }
    if (supprimer) {
      toast({
        title: "Stockage nettoyé",
        description: `${data?.retires ?? 0} fichier${(data?.retires ?? 0) > 1 ? "s" : ""} retiré${(data?.retires ?? 0) > 1 ? "s" : ""}.`,
      });
      setOrphelins(0);
      setEchantillon([]);
      return;
    }
    setOrphelins(data?.orphelins ?? 0);
    setEchantillon(data?.echantillon ?? []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          Nettoyage du stockage
        </CardTitle>
        <CardDescription>
          Fichiers présents sur le disque qu'aucune ligne ne référence plus : démarches
          supprimées, et pièces remplacées par une pièce validée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={travail !== null} onClick={() => appeler(false)}>
            {travail === "apercu" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Compter les orphelins
          </Button>

          {orphelins !== null && orphelins > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={travail !== null}>
                  {travail === "suppression" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Supprimer les {orphelins} fichiers
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer {orphelins} fichiers ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La suppression est définitive. Ne sont concernés que les fichiers dont le
                    dossier parent n'existe plus, et les pièces de vérification qu'une pièce
                    approuvée a remplacées. Les fichiers rattachés à une démarche encore
                    vivante sont conservés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => appeler(true)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {orphelins === 0 && (
          <p className="text-sm text-muted-foreground">Aucun fichier orphelin à retirer.</p>
        )}

        {echantillon.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-1 text-xs text-muted-foreground">
              Échantillon des {orphelins} fichiers concernés :
            </p>
            <ul className="space-y-0.5 font-mono text-xs text-muted-foreground">
              {echantillon.map((c) => <li key={c} className="truncate">{c}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
