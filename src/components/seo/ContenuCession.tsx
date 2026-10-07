// Le contenu de référence sur la déclaration de cession.
//
// La page vivait sur le gabarit générique des démarches : 795 mots, pas de
// tableau, huit questions. Elle est pourtant la deuxième du site en trafic et
// se classe 12e sur « certificat cession véhicule », 58e sur « certificat de
// cession en ligne ». Ce qui lui manquait, c'est ce que cherche vraiment
// quelqu'un qui tape ces mots : qui doit faire quoi, dans quel délai, et à quoi
// ressemble le formulaire.

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, FileText, Clock, KeyRound, Info } from "lucide-react";
import { QUI_FAIT_QUOI, CASES_CERFA } from "@/data/cessionReperes";

// Les délais et les sanctions, les deux questions qui amènent sur cette page.

export function ContenuCession() {
  return (
    <div className="container mx-auto px-4 py-12 border-t space-y-16">
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Clock className="w-7 h-7 text-primary" />
          Qui fait quoi, et dans quel délai
        </h2>
        <p className="text-muted-foreground mb-6">
          Une vente de véhicule engage deux personnes et trois formalités. Tant que la cession n'est
          pas déclarée, c'est le vendeur qui répond du véhicule devant l'administration.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Qui</TableHead>
                  <TableHead>Ce qu'il doit faire</TableHead>
                  <TableHead>Quand</TableHead>
                  <TableHead>À défaut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {QUI_FAIT_QUOI.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{l.qui}</TableCell>
                    <TableCell>{l.action}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary">{l.quand}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.sinon}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            Les quinze jours courent depuis la date portée sur le certificat, pas depuis le jour où
            l'acheteur vient chercher le véhicule. C'est la confusion la plus fréquente.
          </span>
        </p>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" />
          Remplir le certificat de cession : ce que contient le Cerfa 15776
        </h2>
        <p className="text-muted-foreground mb-6">
          Le certificat de cession est le formulaire Cerfa 15776. Il se remplit en trois exemplaires :
          un pour le vendeur, un pour l'acheteur, un pour l'administration. Voici ce qu'il demande,
          dans l'ordre.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {CASES_CERFA.map((c) => (
            <Card key={c.repere}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.repere}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{c.contenu}</CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <a
            href="/cerfas/cerfa_15776_02.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <Download className="w-4 h-4" />
            Télécharger le Cerfa 15776 vierge
          </a>
          <span className="text-sm text-muted-foreground">
            ou laissez-nous le remplir : nous le générons à partir de la plaque.
          </span>
        </div>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <KeyRound className="w-7 h-7 text-primary" />
          Le code de cession, et ce que l'acheteur en fait
        </h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            Déclarer la cession produit un <strong>code de cession à cinq caractères</strong>. Ce
            n'est pas une formalité de plus : c'est la clé que l'acheteur devra saisir pour demander
            la carte grise à son nom. Sans lui, sa démarche est bloquée, même avec la carte grise
            barrée en main.
          </p>
          <p>
            Le vendeur le transmet à l'acheteur, avec son exemplaire du certificat de cession et la
            carte grise barrée. Ces trois pièces suffisent : l'acheteur n'a rien à demander de plus
            au vendeur, ce qui évite les relances un mois après la vente.
          </p>
          <p>
            À une réserve près : l'acheteur aura aussi besoin d'un{" "}
            <Link to="/certificat-de-non-gage" className="text-primary hover:underline font-semibold">
              certificat de situation administrative
            </Link>{" "}
            — le « non-gage » — de moins de quinze jours. Il est gratuit, mais seul le vendeur peut
            le demander.
          </p>
          <p>
            Le code reste valable jusqu'à ce que l'acheteur l'utilise. S'il le perd, le vendeur peut
            le retrouver : il figure sur l'accusé d'enregistrement reçu au moment de la déclaration.
          </p>
          <p>
            C'est avec ce code que l'acheteur demandera la carte grise à son nom. S'il veut savoir
            à l'avance ce qu'elle lui coûtera, notre{" "}
            <Link to="/simulateur" className="text-primary hover:underline font-semibold">
              simulateur du prix de la carte grise
            </Link>{" "}
            le calcule à partir de la plaque, tarif du département compris.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Info className="w-7 h-7 text-primary" />
          Déclaration de cession gratuite : ce qui l'est, ce qui ne l'est pas
        </h2>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
          <p>
            La déclaration de cession ne donne lieu à <strong>aucune taxe</strong>. Contrairement à
            une carte grise, l'État ne prélève rien : ni taxe régionale, ni redevance d'acheminement.
            Sur le site de l'ANTS, la démarche est donc entièrement gratuite, et il faut le dire.
          </p>
          <p>
            Ce que vous payez chez nous, ce sont des <strong>frais de service</strong> : 20 € pour
            un particulier, 5 € pour un professionnel de l'automobile. Ils couvrent le remplissage
            du Cerfa à partir de la plaque, la vérification des
            informations avant envoi — une faute sur le nom de l'acheteur bloque sa carte grise — et
            la transmission au SIV avec le code de cession en retour, immédiatement.
          </p>
          <p>
            Si vous êtes à l'aise avec le site de l'ANTS et que vous avez le temps de recommencer en
            cas de rejet, faites-le vous-même : c'est gratuit et c'est légitime. Notre service existe
            pour ceux qui préfèrent que ce soit fait, vérifié, et fait une seule fois.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-primary" />
          Les cas qui ne ressemblent pas à une vente ordinaire
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Un don, un héritage</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Céder un véhicule gratuitement reste une cession : même formulaire, mêmes délais. La
              case du prix se remplit à zéro, ou se laisse vide.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Un véhicule bon pour la casse</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ce n'est pas une cession mais une destruction : elle se déclare auprès d'un centre VHU
              agréé, qui remet un certificat de destruction. Une déclaration de cession ne vaut pas
              mise à la casse.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Deux titulaires sur la carte grise</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Les deux doivent signer. Un certificat signé d'un seul co-titulaire est rejeté, et
              l'acheteur s'en aperçoit au moment de sa demande, pas avant.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Une vente à un professionnel</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Le garage qui rachète votre véhicule fait une{" "}
              <Link to="/declaration-achat" className="text-primary hover:underline">
                déclaration d'achat
              </Link>
              , pas un changement de titulaire. Vous, vous déclarez la cession comme pour un
              particulier.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
