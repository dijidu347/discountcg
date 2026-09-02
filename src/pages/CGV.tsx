import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/seo/SEOHead";

export default function CGV() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Conditions Generales de Vente"
        description="CGV du service Discount Carte Grise - DISCOUNT AUTO / PAREBRISE"
        noindex
      />
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Conditions Générales de Vente — discountcartegrise.fr</h1>
        <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 26 juin 2026</p>

        <div className="prose prose-lg text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Préambule — Identification du prestataire</h2>
            <p>Le site <strong>discountcartegrise.fr</strong> (ci-après « le Site ») est édité et exploité par :</p>
            <p>
              <strong>DISCOUNT AUTO / PAREBRISE</strong> (DISCOUNT AUTO PARE BRISE), société par actions simplifiée (SAS)<br />
              Siège social : ZA de l'Avenir, 30600 Vestric-et-Candiac<br />
              SIRET (siège) : 830 888 277 00027<br />
              RCS : Nîmes 830 888 277 (Greffe du Tribunal de Commerce de Nîmes)<br />
              N° TVA intracommunautaire : FR68 830 888 277<br />
              Capital social : 10 000 €<br />
              Représentée par son Président : Jimmy Sourasith Douangsiddhi<br />
              Adresse e-mail : contact@discountcartegrise.fr<br />
              Horaires du service client : du lundi au vendredi, de 9h30 à 12h et de 14h à 17h30
            </p>
            <p>Ci-après dénommée « le Prestataire ».</p>
            <p>
              <strong>Habilitation et agrément :</strong> Le Prestataire est habilité par la Préfecture à accéder au
              Système d'Immatriculation des Véhicules (SIV) sous le numéro d'habilitation <strong>285046</strong> et
              agréé par le Trésor Public sous le numéro <strong>63198</strong> pour la perception des taxes liées à
              l'immatriculation des véhicules.
            </p>
            <p>
              <strong>Information importante :</strong> discountcartegrise.fr est un service{" "}
              <strong>commercial et privé</strong>, <strong>indépendant des administrations publiques</strong>. Il ne
              s'agit pas du site officiel de l'État. Les démarches d'immatriculation peuvent être réalisées gratuitement
              (hors taxes) par l'usager lui-même sur le site officiel de l'Agence Nationale des Titres Sécurisés (ANTS) :{" "}
              <strong>https://immatriculation.ants.gouv.fr</strong>. En choisissant le Prestataire, le client opte pour
              un service d'assistance payant, dont les frais de service s'ajoutent aux taxes obligatoires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 1 — Définitions</h2>
            <ul>
              <li><strong>Client</strong> : toute personne physique ou morale passant commande sur le Site.</li>
              <li>
                <strong>Consommateur</strong> : tout Client personne physique agissant à des fins n'entrant pas dans le
                cadre de son activité commerciale, industrielle, artisanale ou libérale, au sens de l'article liminaire
                du Code de la consommation.
              </li>
              <li>
                <strong>Prestations</strong> : services d'assistance et de mandat pour la réalisation de démarches
                administratives d'immatriculation de véhicules (carte grise / certificat d'immatriculation).
              </li>
              <li>
                <strong>Taxes</strong> : sommes dues à l'État et aux Régions (taxe régionale, taxe de gestion, redevance
                d'acheminement, taxe sur les véhicules polluants / malus le cas échéant), perçues par le Prestataire pour
                le compte de l'administration.
              </li>
              <li>
                <strong>Frais de service</strong> : rémunération du Prestataire pour son assistance, distincte des Taxes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 2 — Objet et champ d'application</h2>
            <p>
              Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des relations contractuelles entre
              le Prestataire et le Client dans le cadre des Prestations proposées sur le Site.
            </p>
            <p>
              Toute commande implique l'adhésion sans réserve aux présentes CGV, à l'exclusion de tout autre document. Le
              Client reconnaît en avoir pris connaissance avant de valider sa commande.
            </p>
            <p>
              Le Prestataire se réserve le droit de modifier les CGV à tout moment. Les CGV applicables sont celles en
              vigueur à la date de validation de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 3 — Description des Prestations</h2>
            <p>
              Le Prestataire propose un service d'assistance et de mandat pour la réalisation, auprès de l'administration
              compétente, des démarches d'immatriculation suivantes (liste non exhaustive) :
            </p>
            <ul>
              <li>changement de titulaire (achat d'un véhicule d'occasion) ;</li>
              <li>déclaration de cession / vente ;</li>
              <li>changement d'adresse ;</li>
              <li>duplicata en cas de perte, vol ou détérioration ;</li>
              <li>modification d'état civil ou de caractéristiques du véhicule ;</li>
              <li>première immatriculation ;</li>
              <li>toute autre démarche relevant du SIV.</li>
            </ul>
            <p>
              Dans le cadre de sa mission, le Prestataire vérifie les pièces transmises, constitue le dossier, le
              transmet à l'administration via le SIV, perçoit et reverse les Taxes, et assure le suivi jusqu'à l'édition
              du titre.
            </p>
            <p>
              Le Prestataire agit en qualité de mandataire du Client.{" "}
              <strong>Il ne délivre pas lui-même le certificat d'immatriculation</strong>, qui demeure édité par l'État
              et acheminé par l'opérateur désigné (Imprimerie Nationale).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 4 — Information précontractuelle et acceptation</h2>
            <p>
              Conformément aux articles L. 221-5 et L. 111-1 du Code de la consommation, le Client reçoit, préalablement
              à la commande, les informations relatives aux caractéristiques essentielles des Prestations, au prix, aux
              modalités d'exécution, au droit de rétractation et à ses limites.
            </p>
            <p>
              La validation de la commande vaut acceptation pleine et entière des présentes CGV et reconnaissance d'avoir
              reçu ces informations.
            </p>
            <p>
              Avant tout paiement, le Client accepte les présentes CGV au moyen d'une case à cocher dédiée. Le Client
              consommateur coche en outre une <strong>seconde case, distincte</strong>, par laquelle il demande
              l'exécution immédiate de la Prestation et renonce à son droit de rétractation dans les conditions de
              l'article 10.3. Aucun paiement ne peut être effectué sans ces acceptations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 5 — Processus de commande</h2>
            <ol>
              <li>Le Client sélectionne la démarche souhaitée et renseigne les informations requises.</li>
              <li>Le Client transmet les pièces justificatives nécessaires.</li>
              <li>
                Un récapitulatif détaillé de la commande (nature de la prestation, Taxes, Frais de service, montant total
                TTC) est présenté avant validation.
              </li>
              <li>
                Le Client valide sa commande par un double-clic confirmant son acceptation des CGV et du prix
                (« commande avec obligation de paiement »).
              </li>
              <li>Le Client procède au paiement.</li>
              <li>Un e-mail de confirmation récapitulant la commande est adressé au Client.</li>
            </ol>
            <p>La vente est considérée comme conclue à compter de la confirmation du paiement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 6 — Prix</h2>
            <p>Les prix sont indiqués en euros, toutes taxes comprises (TTC).</p>
            <p>Le montant total facturé au Client se compose :</p>
            <ul>
              <li>
                <strong>des Taxes</strong> dues à l'État et aux Régions, dont le montant est fixé par la réglementation
                et calculé en fonction des caractéristiques du véhicule et de la Région du titulaire. Ces sommes sont
                intégralement reversées à l'administration ;
              </li>
              <li>
                <strong>des Frais de service</strong> du Prestataire, correspondant à sa prestation d'assistance. Ces
                frais varient selon la nature de la démarche et débutent à 19,90 € TTC. Le montant exact des Frais de
                service applicable à la commande est porté à la connaissance du Client au moyen du simulateur de prix et
                du récapitulatif de commande, avant toute validation et tout paiement.
              </li>
            </ul>
            <p>
              Le détail de cette ventilation (Taxes / Frais de service) est porté à la connaissance du Client avant la
              validation de la commande, conformément à l'obligation de transparence tarifaire.
            </p>
            <p>
              Le Prestataire se réserve le droit de modifier ses tarifs à tout moment ; le prix applicable est celui
              affiché au jour de la commande.
            </p>
            <p>
              Les Taxes sont avancées par le Prestataire <strong>au nom et pour le compte du Client</strong> puis
              intégralement reversées à l'administration. Une fois ce reversement effectué, elles ne peuvent plus être
              récupérées par le Prestataire et ne sont, en conséquence,{" "}
              <strong>en aucun cas remboursables</strong> (article 10).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 7 — Modalités de paiement</h2>
            <p>
              Le paiement s'effectue en ligne, au moment de la commande, par les moyens proposés sur le Site (notamment
              carte bancaire). Les transactions sont sécurisées via la plateforme de paiement Sogecommerce (Société
              Générale).
            </p>
            <p>
              Le Prestataire ne conserve aucune donnée bancaire ; celles-ci sont traitées directement par le prestataire
              de paiement dans un environnement sécurisé.
            </p>
            <p>Aucune démarche n'est engagée tant que le paiement n'a pas été intégralement encaissé.</p>
            <p>
              Tout paiement est <strong>définitif</strong> dans les conditions et limites fixées à l'article 10.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 8 — Obligations du Client</h2>
            <p>Le Client s'engage à :</p>
            <ul>
              <li>fournir des informations exactes, complètes et à jour ;</li>
              <li>transmettre des pièces justificatives authentiques, lisibles et en cours de validité ;</li>
              <li>
                détenir les droits et qualités nécessaires pour réaliser la démarche demandée (être titulaire ou mandant
                légitime) ;
              </li>
              <li>
                s'assurer que le véhicule remplit les conditions légales requises (assurance, contrôle technique en cours
                de validité le cas échéant).
              </li>
            </ul>
            <p>
              Le Client est seul responsable de l'exactitude des informations et documents transmis.{" "}
              <strong>Tout dossier incomplet, erroné ou frauduleux pourra entraîner un retard, un rejet par
              l'administration ou l'impossibilité d'exécuter la Prestation</strong>, sans que la responsabilité du
              Prestataire puisse être engagée. Les Frais de service restent dus dès lors que la prestation d'assistance a
              été engagée.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 9 — Exécution de la Prestation et délais</h2>
            <p>Le Prestataire traite le dossier dès réception du paiement et des pièces complètes et conformes.</p>
            <p>
              Après transmission du dossier au SIV, un{" "}
              <strong>Certificat Provisoire d'Immatriculation (CPI)</strong>, lorsqu'il est applicable, est mis à
              disposition du Client, l'autorisant à circuler pour une durée d'un mois sur le territoire national.
            </p>
            <p>
              Le <strong>certificat d'immatriculation définitif</strong> est édité par l'État et acheminé directement au
              domicile du titulaire par l'opérateur désigné (Imprimerie Nationale), sous pli sécurisé, dans un délai
              dépendant de l'administration. Ce délai d'acheminement échappe au contrôle du Prestataire.
            </p>
            <p>
              Les délais communiqués sont indicatifs et dépendent notamment de la complétude du dossier et des délais de
              traitement de l'administration. À titre indicatif, le Prestataire traite les dossiers complets sous 24
              heures ouvrées après réception du paiement et des pièces conformes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Article 10 — Caractère définitif de la commande et droit de rétractation
            </h2>

            <h3 className="font-semibold text-foreground">10.1 — Principe : toute commande est définitive</h3>
            <p>
              La Prestation consiste à constituer un dossier et à le transmettre à l'administration, en avançant au nom
              et pour le compte du Client les Taxes dues à l'État et aux Régions. Ces sommes, une fois versées à
              l'administration, ne sont <strong>ni restituables ni récupérables</strong> par le Prestataire, quelle que
              soit la suite donnée au dossier.
            </p>
            <p>
              En conséquence, <strong>toute commande est ferme et définitive</strong> et ne donne lieu à{" "}
              <strong>aucun remboursement</strong> dès lors que la Prestation a été pleinement exécutée au sens de
              l'article 10.4, sous la seule réserve des cas prévus à l'article 10.5.
            </p>

            <h3 className="font-semibold text-foreground">10.2 — Clients professionnels : absence de droit de rétractation</h3>
            <p>
              Le droit de rétractation prévu par le Code de la consommation est réservé aux consommateurs. Il ne
              bénéficie pas au Client professionnel dont la commande entre dans le champ de son activité principale, ce
              qui est le cas des démarches d'immatriculation commandées par un garage, un concessionnaire, un négociant
              ou tout professionnel de l'automobile (art. L. 221-3 du Code de la consommation, a contrario).
            </p>
            <p>
              Pour ces Clients, <strong>toute commande est définitive dès son paiement</strong> et ne peut donner lieu à
              aucun remboursement.
            </p>

            <h3 className="font-semibold text-foreground">10.3 — Consommateurs : droit de rétractation et renonciation expresse</h3>
            <p>
              Conformément aux articles L. 221-18 et suivants du Code de la consommation, le Consommateur dispose en
              principe d'un délai de <strong>quatorze (14) jours</strong> à compter de la conclusion du contrat pour
              exercer son droit de rétractation, sans avoir à motiver sa décision.
            </p>
            <p>
              Toutefois, la Prestation étant un service dont le Client attend une exécution rapide, celui-ci{" "}
              <strong>demande expressément que son exécution commence immédiatement</strong>, avant l'expiration du délai
              de quatorze jours, et <strong>renonce expressément à son droit de rétractation</strong> pour le cas où la
              Prestation serait pleinement exécutée avant la fin de ce délai.
            </p>
            <p>
              Cette demande et cette renonciation sont recueillies au moyen d'une{" "}
              <strong>case à cocher dédiée, distincte de l'acceptation des présentes CGV</strong>, que le Client coche
              obligatoirement avant tout paiement. En application de l'<strong>article L. 221-28, 1°</strong> du Code de
              la consommation, le Consommateur <strong>perd son droit de rétractation</strong> dès que la Prestation est
              pleinement exécutée.
            </p>

            <h3 className="font-semibold text-foreground">10.4 — Point à partir duquel la Prestation est pleinement exécutée</h3>
            <p>
              La Prestation est réputée <strong>pleinement exécutée</strong>, et la commande définitivement acquise au
              Prestataire, dès la survenance du premier des événements suivants :
            </p>
            <ul>
              <li>la transmission du dossier à l'administration via le SIV ;</li>
              <li>l'édition ou la mise à disposition du Certificat Provisoire d'Immatriculation (CPI) ;</li>
              <li>le versement des Taxes à l'administration pour le compte du Client.</li>
            </ul>
            <p>
              À compter de cet instant, <strong>aucun remboursement ne peut intervenir</strong>, ni sur les Taxes, ni sur
              les Frais de service.
            </p>

            <h3 className="font-semibold text-foreground">10.5 — Rétractation exercée avant exécution</h3>
            <p>
              Si le Consommateur notifie sa rétractation <strong>avant</strong> que la Prestation ne soit pleinement
              exécutée au sens de l'article 10.4, il est redevable, conformément à l'article L. 221-25 du Code de la
              consommation, d'un montant <strong>proportionnel à la Prestation déjà fournie</strong> à la date de la
              rétractation. Seules les sommes correspondant aux diligences non encore engagées lui sont restituées.
            </p>
            <p>
              <strong>Exercice du droit :</strong> le Consommateur notifie sa décision au moyen du formulaire type
              figurant en Annexe, ou de toute autre déclaration dénuée d'ambiguïté, par e-mail à
              contact@discountcartegrise.fr ou par courrier à l'adresse du siège social.
            </p>

            <h3 className="font-semibold text-foreground">10.6 — Absence de remboursement en cas de dossier incomplet ou erroné</h3>
            <p>
              Le rejet, l'ajournement ou le retard d'un dossier imputable à des informations inexactes ou à des pièces
              manquantes, illisibles, périmées ou non conformes fournies par le Client{" "}
              <strong>n'ouvre droit à aucun remboursement</strong>, la Prestation d'assistance ayant été exécutée. Le
              Prestataire accompagne le Client dans la régularisation du dossier, sans frais de service supplémentaires
              lorsque la reprise relève de la même démarche.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 11 — Responsabilité</h2>
            <p>
              Le Prestataire est tenu d'une <strong>obligation de moyens</strong> dans l'exécution de sa mission
              d'assistance.
            </p>
            <p>Sa responsabilité ne saurait être engagée :</p>
            <ul>
              <li>
                en cas de transmission par le Client d'informations ou de documents inexacts, incomplets ou frauduleux ;
              </li>
              <li>
                en raison des délais de traitement et d'acheminement relevant de l'administration ou de l'Imprimerie
                Nationale ;
              </li>
              <li>en cas de rejet du dossier par l'administration pour un motif indépendant du Prestataire ;</li>
              <li>
                en cas de force majeure ou de dysfonctionnement des services publics (indisponibilité du SIV, etc.).
              </li>
            </ul>
            <p>
              En tout état de cause, la responsabilité du Prestataire, si elle était retenue, serait limitée au montant
              des Frais de service perçus pour la commande concernée.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 12 — Réclamations et service après-vente</h2>
            <p>Toute réclamation peut être adressée au Prestataire :</p>
            <ul>
              <li>par e-mail : contact@discountcartegrise.fr ;</li>
              <li>par courrier : DISCOUNT AUTO / PAREBRISE, ZA de l'Avenir, 30600 Vestric-et-Candiac.</li>
            </ul>
            <p>Le Prestataire s'engage à apporter une réponse dans les meilleurs délais.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 13 — Données personnelles (RGPD)</h2>
            <p>
              Le Prestataire traite les données personnelles du Client conformément au Règlement (UE) 2016/679 (RGPD) et
              à la loi « Informatique et Libertés » modifiée.
            </p>
            <p>
              Les données collectées sont nécessaires au traitement de la commande et à la réalisation des démarches
              d'immatriculation auprès de l'administration. Elles ne sont conservées que le temps nécessaire à ces
              finalités et aux obligations légales de conservation.
            </p>
            <p>
              Le Client dispose d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de
              portabilité, qu'il peut exercer à l'adresse contact@discountcartegrise.fr. Il peut également introduire une
              réclamation auprès de la CNIL.
            </p>
            <p>
              Les modalités détaillées figurent dans la <strong>Politique de Confidentialité</strong> accessible sur le
              Site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 14 — Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments du Site (marques, logos, textes, visuels, structure) est protégé par le droit de la
              propriété intellectuelle et demeure la propriété exclusive du Prestataire ou de ses partenaires. Toute
              reproduction ou exploitation non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 15 — Force majeure</h2>
            <p>
              La responsabilité du Prestataire ne pourra être engagée en cas d'inexécution ou de retard dû à un cas de
              force majeure au sens de l'article 1218 du Code civil et de la jurisprudence française.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 16 — Médiation de la consommation</h2>
            <p>
              Conformément à l'article L. 612-1 du Code de la consommation, le Consommateur a le droit de recourir
              gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige, après avoir
              tenté au préalable de le résoudre directement auprès du Prestataire par une réclamation écrite.
            </p>
            <p>
              Le médiateur compétent est :<br />
              <strong>Médiateur de Mobilians</strong><br />
              43 bis, Route de Vaugirard – CS 80016, 92197 Meudon Cedex<br />
              Saisine en ligne : https://www.mediateur-mobilians.fr — E-mail : mediateur@mediateur-mobilians.fr
            </p>
            <p>
              Le Consommateur peut également recourir à la plateforme européenne de Règlement en Ligne des Litiges :
              https://ec.europa.eu/consumers/odr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Article 17 — Droit applicable et juridiction</h2>
            <p>Les présentes CGV sont soumises au droit français.</p>
            <p>
              En cas de litige, et à défaut de résolution amiable, les tribunaux français sont compétents dans les
              conditions de droit commun. Le Consommateur peut saisir, à son choix, l'une des juridictions
              territorialement compétentes en vertu du Code de procédure civile, ou la juridiction du lieu où il
              demeurait au moment de la conclusion du contrat.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Annexe — Formulaire type de rétractation</h2>
            <p>
              <em>(À compléter et renvoyer uniquement par un Consommateur souhaitant se rétracter{" "}
              <strong>avant que la Prestation ne soit pleinement exécutée</strong>, dans les conditions restrictives de
              l'article 10.5. Passé ce stade, la commande est définitive et le droit de rétractation est perdu.)</em>
            </p>
            <p>
              À l'attention de <strong>DISCOUNT AUTO / PAREBRISE</strong>, ZA de l'Avenir, 30600 Vestric-et-Candiac —
              contact@discountcartegrise.fr :
            </p>
            <blockquote>
              <p>
                Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de service
                ci-dessous :
              </p>
              <ul>
                <li>Commandée le : ……………………………………</li>
                <li>Numéro de commande : ……………………………………</li>
                <li>Nom du (des) consommateur(s) : ……………………………………</li>
                <li>Adresse du (des) consommateur(s) : ……………………………………</li>
                <li>Date : ……………………………………</li>
                <li>Signature (uniquement en cas de notification papier) : ……………………………………</li>
              </ul>
            </blockquote>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
