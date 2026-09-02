import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "Quels documents faut-il pour une carte grise professionnelle ?",
      answer: "Pour une carte grise professionnelle, vous devez fournir : un Kbis de moins de 3 mois, une pièce d'identité du gérant, le certificat de cession du véhicule, le contrôle technique valide, et un mandat de représentation. Nous vous accompagnons dans la préparation de ces documents."
    },
    {
      question: "Quel est le délai de traitement d'un dossier ?",
      answer: "Nous traitons votre dossier en moins de 24 heures ouvrées dès réception de l'ensemble des pièces justificatives. Vous recevez une notification par email et WhatsApp à chaque étape du processus."
    },
    {
      question: "Le paiement en ligne est-il sécurisé ?",
      answer: "Oui, absolument. Tous nos paiements sont sécurisés par cryptage SSL et conformes aux normes PCI DSS. Nous acceptons les cartes bancaires et PayPal pour votre sécurité et votre tranquillité d'esprit."
    },
    {
      question: "Puis-je suivre l'avancement de mon dossier ?",
      answer: "Oui, vous recevez des notifications automatiques par email et WhatsApp à chaque étape du traitement de votre dossier. Vous pouvez également nous contacter à tout moment pour un point sur l'avancement."
    },
    {
      question: "Que faire si je n'ai pas tous les documents ?",
      answer: "Contactez-nous ! Notre équipe d'experts vous guidera pour obtenir les documents manquants et vous accompagnera dans vos démarches administratives."
    },
    {
      question: "Travaillez-vous avec les professionnels (garagistes, concessionnaires) ?",
      answer: "Oui, nous proposons des tarifs et services spécifiques pour les professionnels de l'automobile. Contactez-nous pour découvrir nos offres partenaires et nos solutions de traitement en volume."
    },
    {
      question: "Puis-je annuler ma demande ?",
      answer: "Une fois votre dossier transmis à l'administration, la commande est définitive et ne peut plus être remboursée : les taxes ont déjà été reversées à l'État, qui ne les restitue pas. Si votre demande n'a pas encore été prise en charge, contactez-nous au plus vite et nous verrons ensemble ce qui est possible."
    },
    {
      question: "Quelles régions couvrez-vous ?",
      answer: "Nous intervenons sur toute la France métropolitaine et les DOM-TOM. Nos services sont 100% en ligne, vous pouvez donc bénéficier de notre expertise où que vous soyez."
    }
  ];

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Questions fréquentes</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Trouvez rapidement les réponses à vos questions
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border-2 border-border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
