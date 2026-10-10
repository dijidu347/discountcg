// L'écran qui suit l'inscription : il reste un geste à faire.
//
// Le compte n'est pas utilisable tant que l'adresse n'est pas confirmée.
// L'inscription annonçait pourtant « redirection vers votre espace » et y
// menait — un espace qui refusait l'entrée, sans dire pourquoi ni quoi faire.
//
// Cette page dit les trois choses qui manquaient : qu'un mail est parti, à
// quelle adresse exactement, et qu'il faut l'ouvrir. L'adresse est affichée en
// toutes lettres parce que c'est là que les fautes de frappe se voient : un
// compte de cette semaine attend toujours sa confirmation, son adresse se
// terminant par « .cim ».

import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MailCheck } from "lucide-react";

export default function ConfirmationEmail() {
  const navigate = useNavigate();
  const email = (useLocation().state as { email?: string } | null)?.email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-france-red/10 p-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Confirmez votre adresse | Discount Carte Grise</title>
      </Helmet>

      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 py-8 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-primary" />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Votre compte est créé</h1>
            <p className="text-muted-foreground">
              Il reste une étape : nous venons d'envoyer un lien de confirmation
              {email ? " à" : " à votre adresse"}
              {email && <span className="block font-medium text-foreground">{email}</span>}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-left text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Ouvrez ce message et cliquez sur le lien.</span>{" "}
              Votre compte sera alors actif et vous pourrez vous connecter.
            </p>
            <p className="mt-2">
              Rien reçu après quelques minutes ? Regardez dans vos indésirables. Si l'adresse
              ci-dessus comporte une faute, créez un compte avec la bonne : le lien ne peut pas
              arriver ailleurs.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/login")}>J'ai confirmé, me connecter</Button>
            <Button variant="outline" onClick={() => navigate("/register")}>
              Corriger mon adresse
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
