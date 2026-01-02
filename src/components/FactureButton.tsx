import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadFromSignedUrl } from "@/lib/storage-utils";


interface FactureButtonProps {
  demarcheId: string;
  existingFactureId?: string;
  onFactureGenerated?: () => void;
}

export const FactureButton = ({ 
  demarcheId, 
  existingFactureId,
  onFactureGenerated 
}: FactureButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateFacture = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('generate-facture', {
        body: { demarcheId }
      });

      if (error) throw error;

      toast({
        title: "Facture générée",
        description: `Facture ${data.facture.numero} créée avec succès`,
      });

      onFactureGenerated?.();
    } catch (error: any) {
      console.error('Error generating facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la facture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFacture = async () => {
    try {
      setLoading(true);

      const { data: facture, error } = await supabase
        .from('factures')
        .select('pdf_url, numero')
        .eq('id', existingFactureId)
        .single();

      if (error || !facture?.pdf_url) {
        throw new Error('Facture URL not found');
      }

      // pdf_url contains the path in the bucket (e.g. "garage_id/2025-00001.pdf")
      const pdfPath = facture.pdf_url.includes('factures/') 
        ? facture.pdf_url.split('factures/').pop() || facture.pdf_url
        : facture.pdf_url;
      
      // Get signed URL directly from storage
      const { data: signedData, error: signedError } = await supabase.storage
        .from('factures')
        .createSignedUrl(pdfPath, 3600);

      if (signedError || !signedData?.signedUrl) {
        console.error('Error getting signed URL:', signedError);
        throw new Error('Unable to get download URL');
      }

      // Télécharger (blob) pour éviter l'ouverture en nouvel onglet sur iOS
      await downloadFromSignedUrl(signedData.signedUrl, `facture-${facture.numero}.pdf`);

      toast({
        title: "Facture téléchargée",
        description: `Facture ${facture.numero} ouverte`,
      });
    } catch (error) {
      console.error('Error downloading facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la facture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (existingFactureId) {
    return (
      <Button
        onClick={downloadFacture}
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

  return (
    <Button
      onClick={generateFacture}
      disabled={loading}
      size="sm"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      Générer facture
    </Button>
  );
};