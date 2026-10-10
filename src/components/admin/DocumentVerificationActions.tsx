// Deux briques partagées par la fiche garage et la file des dates à saisir :
// l'état d'une pièce, et sa suppression silencieuse.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
 *
 * L'ancienneté se lit sur LE document, pas sur le garage. Elle venait de
 * `garages.kbis_valide_jusqu_au`, qui vaut pour le compte entier : tous les
 * Kbis d'un même dossier portaient donc le même badge. Un garage qui venait
 * de déposer un extrait du 9 octobre le voyait marqué « Expiré » à côté de
 * « valable encore 181 jours », parce qu'un extrait de mars traînait dans ses
 * dépôts précédents — et l'inverse était pire : le vieux passait au vert dès
 * que le nouveau arrivait.
 *
 * Même règle qu'en base (validite_kbis) : six mois à compter de la date portée
 * sur le document, à défaut de sa date de dépôt.
 */
export function EtatDocument({ doc, kbisPerime }: { doc: Doc; kbisPerime?: boolean }) {
  const perimeCeDocument = (() => {
    if (doc.document_type !== "kbis") return false;
    const base = doc.date_emission ?? doc.created_at;
    if (!base) return Boolean(kbisPerime);
    const fin = new Date(base);
    fin.setMonth(fin.getMonth() + 6);
    return fin < new Date();
  })();

  const expire = doc.document_type === "kbis" && doc.status === "approved" && perimeCeDocument;
  const sansDate = doc.document_type === "kbis" && doc.status === "pending" && !doc.date_emission;

  // Une attestation RNE se signale : un artisan n'a pas de Kbis et n'en aura
  // jamais, et deux garages se sont vu réclamer l'impossible avant qu'on le
  // sache. Le dire sur la pièce évite le troisième refus.
  const estRne = doc.nature_document === "rne";

  if (doc.status === "approved") {
    return (
      <Badge
        className={
          expire
            ? "shrink-0 bg-orange-500 hover:bg-orange-500"
            : "shrink-0 bg-green-600 hover:bg-green-600"
        }
      >
        {expire ? "Expiré" : "Approuvé"}
      </Badge>
    );
  }
  if (doc.status === "rejected") {
    return <Badge variant="destructive" className="shrink-0">Refusé</Badge>;
  }
  if (estRne) {
    return (
      <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
        Attestation RNE
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={sansDate ? "shrink-0 bg-yellow-500 text-yellow-950 hover:bg-yellow-500" : "shrink-0"}>
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

// Les refus qui reviennent, en un clic. Le texte reste modifiable : ce sont des
// points de départ, pas des cases à cocher.
//
// Ils existent parce qu'un refus sans explication fait redéposer le même
// fichier — c'est ce qui s'est passé avec les Kbis illisibles, cinq fois pour
// un seul garage. Écrire la raison à chaque fois coûte, et ce qui coûte finit
// par être abrégé en « non conforme ».
const RAISONS_KBIS = [
  {
    titre: "Ce n'est pas un Kbis",
    texte:
      "Le document déposé n'est pas un extrait Kbis. Nous avons besoin de l'extrait d'immatriculation au RCS délivré par le greffe du tribunal de commerce, de moins de six mois — ou, si vous n'êtes pas inscrit au registre du commerce, de votre attestation d'immatriculation au RNE.",
  },
  {
    titre: "Illisible",
    texte:
      "Le document est illisible : nous n'y distinguons pas la date de délivrance. Merci de le déposer en PDF, ou de le photographier à plat, bien éclairé et sans reflet.",
  },
  {
    titre: "Trop ancien",
    texte:
      "Ce Kbis a plus de six mois : il n'est plus recevable. Vous pouvez en obtenir un à jour gratuitement sur monidenum.fr, ou sur infogreffe.fr.",
  },
  {
    titre: "Incomplet",
    texte:
      "Le document est incomplet : il manque une ou plusieurs pages. Merci de déposer l'extrait entier.",
  },
];

// Une pièce d'identité ne se refuse pas pour les mêmes raisons qu'un Kbis.
// Les motifs du Kbis s'affichaient pourtant sur toutes les pièces : on
// proposait « Trop ancien — ce Kbis a plus de six mois » pour refuser une
// carte d'identité, et le garage recevait un message qui ne parlait pas de
// son document.
const RAISONS_CARTE_IDENTITE = [
  {
    titre: "Ce n'est pas une pièce d'identité",
    texte:
      "Le document déposé n'est pas une pièce d'identité. Nous avons besoin de la carte nationale d'identité, du passeport ou du titre de séjour du représentant légal de l'entreprise.",
  },
  {
    titre: "Illisible",
    texte:
      "La pièce est illisible : le nom, la date de naissance ou la photo ne se distinguent pas. Photographiez-la à plat, bien éclairée et sans reflet, ou déposez un scan.",
  },
  {
    titre: "Verso manquant",
    texte:
      "Il manque le verso de la pièce d'identité. Déposez les deux faces — vous pouvez envoyer les deux fichiers en une fois — ou une photocopie qui les contient toutes les deux.",
  },
  {
    titre: "Périmée",
    texte:
      "Cette pièce d'identité est expirée. Merci d'en déposer une en cours de validité.",
  },
  {
    titre: "Pas la bonne personne",
    texte:
      "Cette pièce n'est pas celle du représentant légal de l'entreprise. Nous avons besoin de la pièce d'identité de la personne qui figure comme dirigeant sur le Kbis.",
  },
];

const RAISONS_MANDAT = [
  {
    titre: "Non signé",
    texte:
      "Le mandat n'est pas signé. Merci de le signer et de le tamponner en bas, puis de le redéposer.",
  },
  {
    titre: "Illisible",
    texte:
      "Le mandat est illisible. Déposez-le en PDF, ou photographiez-le à plat, bien éclairé et sans reflet.",
  },
  {
    titre: "Incomplet",
    texte:
      "Le mandat est incomplet : il manque la raison sociale, le SIRET ou l'adresse. Merci de remplir ces champs avant de le redéposer.",
  },
];

/** Les motifs qui correspondent à la pièce qu'on refuse. */
function raisonsPour(typeDocument: string | null | undefined) {
  const code = String(typeDocument ?? "").toLowerCase();
  if (code.includes("identite") || code.includes("identité")) return RAISONS_CARTE_IDENTITE;
  if (code.includes("mandat")) return RAISONS_MANDAT;
  if (code.includes("kbis")) return RAISONS_KBIS;
  return RAISONS_KBIS;
}

/**
 * Refuser une pièce en écrivant au garage.
 *
 * Distinct de la suppression, qui ne dit rien : ici le garage doit renvoyer
 * quelque chose, donc le message est obligatoire et le bouton reste inactif
 * tant qu'il est vide.
 */
export function RefuserDocumentBouton({
  doc,
  onRefuse,
  libelle = "Refuser",
  suggestions,
}: {
  doc: Doc;
  onRefuse: (doc: Doc, raison: string) => void | Promise<void>;
  libelle?: string;
  suggestions?: { titre: string; texte: string }[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [raison, setRaison] = useState("");
  const motifs = suggestions ?? raisonsPour(doc?.document_type);

  const fermer = (v: boolean) => {
    setOuvert(v);
    if (!v) setRaison("");
  };

  return (
    <AlertDialog open={ouvert} onOpenChange={fermer}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <XCircle className="mr-2 h-4 w-4" />
          {libelle}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser « {doc.nom_fichier} »</AlertDialogTitle>
          <AlertDialogDescription>
            Le garage recevra ce message par email et le retrouvera dans son espace. Dites-lui ce qui
            ne va pas et ce qu'il doit déposer, sans quoi il redéposera le même fichier.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {motifs.map((r) => (
              <Button
                key={r.titre}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRaison(r.texte)}
              >
                {r.titre}
              </Button>
            ))}
          </div>
          <Textarea
            autoFocus
            rows={5}
            placeholder="Ce que le garage doit corriger…"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={!raison.trim()}
            onClick={() => {
              onRefuse(doc, raison.trim());
              fermer(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Refuser et prévenir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
