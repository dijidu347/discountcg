import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadFacture, extractPathFromUrl } from "@/lib/storage-utils";

interface FactureButtonProps {
  demarcheId: string;
  existingFactureId?: string;
  onFactureGenerated?: () => void;
}

export const FactureButton = ({
  existingFactureId,
}: FactureButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setLoading(true);

      // Get facture info
      const { data: facture, error } = await supabase
        .from('factures')
        .select('pdf_url, numero')
        .eq('id', existingFactureId)
        .single();

      if (error || !facture?.pdf_url) {
        throw new Error('Facture non trouvée');
      }

      // Extract clean path from pdf_url
      const path = extractPathFromUrl(facture.pdf_url);
      
      console.log(`📄 FactureButton: Downloading facture, path="${path}"`);
      
      // Use the unique download function
      await downloadFacture(path);

      toast({
        title: "Facture téléchargée",
        description: `Facture ${facture.numero}`,
      });
    } catch (error: any) {
      console.error('Error downloading facture:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de télécharger la facture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (existingFactureId) {
    return (
      <Button
        onClick={handleDownload}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Télécharger facture
      </Button>
    );
  }

  // Pas de facture encore : génération automatique (webhook à l'achat + cron horaire).
  // Plus de bouton manuel — on affiche juste un état passif.
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      Facture en génération auto…
    </span>
  );
};
