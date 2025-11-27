import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck } from "lucide-react";

const Pricing = () => {
  const pricingData = [
    {
      service: "Déclaration d'achat",
      documents: ["Carte grise barrée", "Certificat de cession", "Justificatif d'identité", "Justificatif de domicile"]
    },
    {
      service: "Déclaration de cession",
      documents: ["Carte grise", "Certificat de cession signé", "Justificatif d'identité", "Contrôle technique (si applicable)"]
    },
    {
      service: "Carte grise standard",
      documents: ["Certificat de cession", "Justificatif d'identité", "Justificatif de domicile", "Contrôle technique", "Demande de certificat"]
    },
    {
      service: "Carte grise professionnel",
      documents: ["Kbis de moins de 3 mois", "Justificatif d'identité gérant", "Certificat de cession", "Contrôle technique", "Mandat de représentation"]
    }
  ];

  return (
    <section id="tarifs" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Documents requis</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Liste des pièces justificatives nécessaires pour chaque démarche
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl shadow-lg overflow-hidden border-2 border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent">
                  <TableHead className="text-white font-bold text-lg">Service</TableHead>
                  <TableHead className="text-white font-bold text-lg">Documents requis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-semibold">{item.service}</TableCell>
                    <TableCell>
                      <ul className="space-y-1">
                        {item.documents.map((doc, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <FileCheck className="w-4 h-4 text-accent mr-2 flex-shrink-0 mt-0.5" />
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-6">
            {pricingData.map((item, index) => (
              <div key={index} className="bg-card rounded-xl shadow-lg p-6 border-2 border-border">
                <h3 className="text-xl font-bold mb-4">{item.service}</h3>
                <div>
                  <p className="font-semibold mb-2 text-muted-foreground">Documents requis :</p>
                  <ul className="space-y-2">
                    {item.documents.map((doc, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <FileCheck className="w-4 h-4 text-accent mr-2 flex-shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
