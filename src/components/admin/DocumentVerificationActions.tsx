// Deux briques partagées par la fiche garage et la file des dates à saisir :
// l'état d'une pièce, et sa suppression silencieuse.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

/**
 * L'état d'une pièce en un mot. Un Kbis approuvé il y a plus de six mois passe
 * en orange : le laisser en vert ferait croire le dossier complet.
 */
export function EtatDocument({ doc, kbisPerime }: { doc: Doc; kbisPerime?: boolean }) {
  const expire = doc.document_type === "kbis" && doc.status === "approved" && kbisPerime;
  const sansDate = doc.document_type === "kbis" && doc.status === "pending" && !doc.date_emission;

  if (doc.status === "approved") {
    return (
      <Badge className={expire ? "shrink-0 bg-orange-500" : "shrink-0 bg-green-600"}>
        {expire ? "Expiré" : "Approuvé"}
      </Badge>
    );
  }
  if (doc.status === "rejected") {
    return <Badge variant="destructive" className="shrink-0">Refusé</Badge>;
  }
  return (
    <Badge variant="secondary" className={sansDate ? "shrink-0 bg-yellow-500 text-yellow-950" : "shrink-0"}>
      {sansDate ? "Sans date" : "En attente"}
    </Badge>
  );
}

/**
 * Supprimer une pièce sans prévenir le garage.
 *
 * Distinct du refus, qui est une demande adressée au garage : ici il n'y a
 * rien à demander. Un garage qui redépose cinq fois le même fichier parce que
 * la lecture automatique ne lui répond pas n'a pas besoin de cinq emails, il a
 * besoin que quatre lignes disparaissent. Le dialogue le dit mot pour mot,
 * pour qu'on ne le confonde pas avec le bouton voisin.
 */
export function SupprimerDocumentBouton({
  doc,
  onSupprime,
  libelle = "Supprimer",
}: {
  doc: Doc;
  onSupprime: (doc: Doc) => void | Promise<void>;
  libelle?: string;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <AlertDialog open={ouvert} onOpenChange={setOuvert}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {libelle}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette pièce ?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                <span className="font-medium text-foreground">{doc.nom_fichier}</span> sera retiré du
                dossier, et le fichier effacé du stockage.
              </p>
              <p>
                <span className="font-medium text-foreground">Le garage ne sera pas prévenu</span> — ni
                email, ni notification. Pour lui demander une pièce corrigée, utilisez « Refuser ».
              </p>
              <p className="text-muted-foreground">C'est définitif.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onSupprime(doc);
              setOuvert(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer sans prévenir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
