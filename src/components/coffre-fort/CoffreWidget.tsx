import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, FileText, Plus, CheckCircle2 } from "lucide-react";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
import { useCoffreDocuments } from "@/hooks/useCoffreDocuments";

export function CoffreWidget() {
  const navigate = useNavigate();
  const { isActive, isTrialing, isLoading: subLoading, subscribe } = useCoffreSubscription();
  const { documents, isLoading: docsLoading } = useCoffreDocuments();

  if (subLoading) return null;

  // Non-subscriber: eye-catching teaser widget
  if (!isActive) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-primary rounded-lg p-6 text-white shadow-lg">
        {/* NOUVEAU badge */}
        <div className="absolute -top-1 -right-1">
          <Badge className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-bl-lg rounded-tr-lg shadow-md">
            NOUVEAU
          </Badge>
        </div>

        <div className="flex items-start gap-4">
          <Archive className="h-9 w-9 flex-shrink-0 mt-1 opacity-90" />
          <div className="flex-1">
            <h3 className="font-extrabold text-lg leading-tight mb-1">
              Ne perdez plus JAMAIS une facture
            </h3>
            <p className="text-sm text-white/80 mb-3">
              Prenez vos factures en photo &rarr; classees automatiquement
            </p>
            <ul className="text-sm space-y-1 mb-4 text-white/90">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Photo en 2 secondes
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Classement automatique
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Export comptable en 1 clic
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Stockage illimite
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate("/coffre-fort-sales")}
                variant="secondary"
                className="font-bold shadow-md"
              >
                Activer mon coffre-fort
              </Button>
              <span className="text-xs text-white/70">9,99&#8364;/mois &mdash; 1er mois OFFERT</span>
            </div>
            <p className="text-[11px] text-white/50 mt-2">
              Rejoint par + de 180 garages pros
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active subscriber: stats widget with quick-add
  const thisMonth = documents.filter(d => {
    const docDate = new Date(d.created_at);
    const now = new Date();
    return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
  });

  const recentDocs = documents.slice(0, 3);

  return (
    <div className="border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-emerald-600" />
          <h3 className="font-bold">Coffre-fort factures</h3>
          {isTrialing && <Badge variant="secondary" className="text-xs">Essai gratuit</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate("/coffre-fort")}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/coffre-fort")}>
            Voir tout
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-sm">
        <div>
          <p className="text-2xl font-bold">{documents.length}</p>
          <p className="text-muted-foreground">documents</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{thisMonth.length}</p>
          <p className="text-muted-foreground">ce mois-ci</p>
        </div>
      </div>

      {recentDocs.length > 0 && (
        <div className="space-y-2">
          {recentDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 text-sm bg-white/60 rounded-md p-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">{doc.title}</span>
              {doc.amount && <span className="text-destructive font-semibold">{Number(doc.amount).toFixed(2)} &euro;</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
