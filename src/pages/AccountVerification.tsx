import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AccountVerification() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [verificationDocs, setVerificationDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: garageData } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (garageData) {
      setGarage(garageData);

      const { data: docs } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('garage_id', garageData.id)
        .order('created_at', { ascending: false });

      setVerificationDocs(docs || []);
    }

    setLoading(false);
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!garage) return;

    setLoading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${garage.id}/${documentType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('demarche-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('demarche-documents')
        .getPublicUrl(fileName);

      // Create verification document record
      const { error: insertError } = await supabase
        .from('verification_documents')
        .upsert({
          garage_id: garage.id,
          document_type: documentType,
          url: publicUrl,
          nom_fichier: file.name,
          status: 'pending'
        }, {
          onConflict: 'garage_id,document_type'
        });

      if (insertError) throw insertError;

      toast({
        title: "Document envoyé",
        description: "Votre document a été soumis pour vérification"
      });

      // Request verification if all 3 docs are uploaded
      const newDocs = await supabase
        .from('verification_documents')
        .select('*')
        .eq('garage_id', garage.id);

      if (newDocs.data?.length === 3 && !garage.verification_requested_at) {
        await supabase
          .from('garages')
          .update({ verification_requested_at: new Date().toISOString() })
          .eq('id', garage.id);
      }

      loadData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocStatus = (documentType: string) => {
    const doc = verificationDocs.find(d => d.document_type === documentType);
    if (!doc) return { status: 'missing', badge: null };
    
    switch (doc.status) {
      case 'approved':
        return { 
          status: 'approved', 
          badge: <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge> 
        };
      case 'rejected':
        return { 
          status: 'rejected', 
          badge: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>,
          reason: doc.rejection_reason
        };
      default:
        return { 
          status: 'pending', 
          badge: <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge> 
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const allDocsApproved = verificationDocs.length === 3 && 
    verificationDocs.every(d => d.status === 'approved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Vérification de compte</CardTitle>
            <CardDescription>
              Soumettez vos documents pour obtenir un compte vérifié
            </CardDescription>
            {garage?.is_verified && (
              <Badge className="bg-green-500 w-fit">
                <CheckCircle className="h-4 w-4 mr-2" />
                Compte vérifié
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {allDocsApproved && !garage?.is_verified && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-900">
                <p className="font-medium">
                  Tous vos documents sont approuvés. Votre compte sera vérifié sous peu.
                </p>
              </div>
            )}

            {/* KBIS */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium mb-1">KBIS</h3>
                  <p className="text-sm text-muted-foreground">
                    Extrait K-bis de moins de 3 mois
                  </p>
                </div>
                {getDocStatus('kbis').badge}
              </div>
              {getDocStatus('kbis').reason && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
                  <p className="font-medium mb-1">Raison du refus:</p>
                  <p>{getDocStatus('kbis').reason}</p>
                </div>
              )}
              <input
                type="file"
                id="kbis-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('kbis', file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('kbis-upload')?.click()}
                disabled={loading || getDocStatus('kbis').status === 'approved'}
              >
                <Upload className="h-4 w-4 mr-2" />
                {getDocStatus('kbis').status === 'missing' ? 'Télécharger' : 'Remplacer'}
              </Button>
            </div>

            {/* Carte d'identité */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium mb-1">Carte d'identité</h3>
                  <p className="text-sm text-muted-foreground">
                    Recto/verso de votre carte d'identité valide
                  </p>
                </div>
                {getDocStatus('carte_identite').badge}
              </div>
              {getDocStatus('carte_identite').reason && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
                  <p className="font-medium mb-1">Raison du refus:</p>
                  <p>{getDocStatus('carte_identite').reason}</p>
                </div>
              )}
              <input
                type="file"
                id="carte-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('carte_identite', file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('carte-upload')?.click()}
                disabled={loading || getDocStatus('carte_identite').status === 'approved'}
              >
                <Upload className="h-4 w-4 mr-2" />
                {getDocStatus('carte_identite').status === 'missing' ? 'Télécharger' : 'Remplacer'}
              </Button>
            </div>

            {/* Mandat */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium mb-1">Mandat pré-rempli</h3>
                  <p className="text-sm text-muted-foreground">
                    Mandat signé et tamponné
                  </p>
                </div>
                {getDocStatus('mandat').badge}
              </div>
              {getDocStatus('mandat').reason && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
                  <p className="font-medium mb-1">Raison du refus:</p>
                  <p>{getDocStatus('mandat').reason}</p>
                </div>
              )}
              <input
                type="file"
                id="mandat-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('mandat', file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('mandat-upload')?.click()}
                disabled={loading || getDocStatus('mandat').status === 'approved'}
              >
                <Upload className="h-4 w-4 mr-2" />
                {getDocStatus('mandat').status === 'missing' ? 'Télécharger' : 'Remplacer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
