// Le pont entre les deux publics.
//
// Le site sert deux audiences qui ne tapent pas les mêmes mots : un
// particulier cherche « prix carte grise », un garage cherche « déclaration
// d'achat » ou « habilitation SIV ». Les pages existaient des deux côtés sans
// jamais se renvoyer l'une à l'autre, si bien qu'un garage arrivé sur une page
// grand public repartait sans savoir qu'il existe une grille professionnelle à
// 5 € la déclaration.
//
// Nommer l'audience dans le lien sert aussi à Google : deux pages qui se
// disputent la même requête se départagent mal, deux pages qui déclarent à qui
// elles s'adressent se complètent.

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Building2, Users } from "lucide-react";

// Démarches que le produit réserve aux professionnels.
const PRO_SEULEMENT = ["DA", "W_GARAGE"];

// Démarches majoritairement professionnelles à l'usage : sur douze mois, le
// CPI WW compte 80 dépôts professionnels pour 3 particuliers.
const PRO_MAJORITAIRE = ["CPI_WW"];

interface PublicCroiseProps {
  code: string;
}

export const PublicCroise = ({ code }: PublicCroiseProps) => {
  const proSeulement = PRO_SEULEMENT.includes(code);
  const proMajoritaire = PRO_MAJORITAIRE.includes(code);

  if (proSeulement || proMajoritaire) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-5">
          <div className="flex gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {proSeulement ? (
                  <>
                    <strong className="text-foreground">
                      Cette démarche est réservée aux professionnels de l'automobile.
                    </strong>{" "}
                    Elle se dépose depuis un compte garage, sous notre habilitation.
                  </>
                ) : (
                  <>
                    <strong className="text-foreground">
                      Démarche majoritairement professionnelle.
                    </strong>{" "}
                    Garages, concessions et négociants la déposent depuis un compte professionnel,
                    à un tarif différent.
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link
                  to="/carte-grise-professionnel"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  L'offre et les tarifs professionnels
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/habilitation-siv"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Faut-il demander son habilitation SIV ?
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Vous êtes un professionnel de l'automobile ?</strong>{" "}
              Garages, concessions, négociants et loueurs déposent leurs démarches depuis un compte
              dédié, avec une grille tarifaire à part — la déclaration d'achat et la déclaration de
              cession y sont à 5 €.
            </p>
            <Link
              to="/carte-grise-professionnel"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Voir l'offre professionnels
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
