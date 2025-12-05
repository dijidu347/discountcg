import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { passwordChangeSchema } from "@/lib/validations";

export default function GarageSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [formData, setFormData] = useState({
    raison_sociale: "",
    siret: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: ""
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [verificationDocs, setVerificationDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadGarage();
    
    // Check URL params for tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'verification') {
      setActiveTab('verification');
    }
  }, [user]);

  const loadGarage = async () => {
    if (!user) return;
    const { data: garageData } = await supabase.from('garages').select('*').eq('user_id', user.id).single();
    if (garageData) {
      setGarage(garageData);
      setFormData({
        raison_sociale: garageData.raison_sociale,
        siret: garageData.siret,
        email: garageData.email,
        telephone: garageData.telephone,
        adresse: garageData.adresse,
        code_postal: garageData.code_postal,
        ville: garageData.ville
      });
      const { data: docs } = await supabase.from('verification_documents').select('*').eq('garage_id', garageData.id).order('created_at', { ascending: false });
      setVerificationDocs(docs || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('garages').update({ email: formData.email, telephone: formData.telephone, adresse: formData.adresse, code_postal: formData.code_postal, ville: formData.ville }).eq('id', garage.id);
    toast({ title: error ? "Erreur" : "Succès", description: error ? "Impossible de mettre à jour" : "Informations mises à jour", variant: error ? "destructive" : "default" });
    if (!error) loadGarage();
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      passwordChangeSchema.parse(passwordData);
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      toast({ title: error ? "Erreur" : "Succès", description: error?.message || "Mot de passe changé", variant: error ? "destructive" : "default" });
      if (!error) setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.errors?.[0]?.message || "Données invalides", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!garage) return;
    setSaving(true);
    try {
      const fileName = `${garage.id}/${documentType}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('demarche-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('demarche-documents').getPublicUrl(fileName);
      await supabase.from('verification_documents').insert({ garage_id: garage.id, document_type: documentType, url: publicUrl, nom_fichier: file.name, status: 'pending' });
      
      // Check if all 3 documents are now uploaded
      const { data: allDocs } = await supabase
        .from('verification_documents')
        .select('document_type')
        .eq('garage_id', garage.id)
        .in('status', ['pending', 'approved']);
      
      const uploadedTypes = new Set(allDocs?.map(d => d.document_type) || []);
      uploadedTypes.add(documentType); // Include the one just uploaded
      
      const requiredDocs = ['kbis', 'carte_identite', 'mandat'];
      const allDocsUploaded = requiredDocs.every(doc => uploadedTypes.has(doc));
      
      // Set verification_requested_at and send notification only when all 3 docs are uploaded
      if (allDocsUploaded && !garage.verification_requested_at) {
        await supabase.from('garages').update({ verification_requested_at: new Date().toISOString() }).eq('id', garage.id);
        // Send admin notification
        await supabase.functions.invoke('send-email', {
          body: { type: 'admin_verification_request', to: 'mathieugaillac4@gmail.com', data: { garage_name: garage.raison_sociale, garage_email: garage.email } }
        });
        await supabase.functions.invoke('send-email', {
          body: { type: 'admin_verification_request', to: 'contact@discountcartegrise.fr', data: { garage_name: garage.raison_sociale, garage_email: garage.email } }
        });
      }
      
      toast({ title: "Document envoyé", description: "Votre document a été soumis" });
      loadGarage();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getDocStatus = (documentType: string) => {
    const doc = verificationDocs.find(d => d.document_type === documentType);
    if (!doc) return { status: 'missing', badge: null, canUpload: true };
    switch (doc.status) {
      case 'approved': return { status: 'approved', badge: <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>, canUpload: false };
      case 'rejected': return { status: 'rejected', badge: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>, canUpload: true, reason: doc.rejection_reason };
      case 'pending': return { status: 'pending', badge: <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>, canUpload: false };
      default: return { status: 'missing', badge: null, canUpload: true };
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        <h1 className="text-2xl font-bold mb-6">Paramètres du compte</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="verification">Vérification</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle>Informations de l'entreprise</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Raison sociale</Label><Input value={formData.raison_sociale} disabled className="bg-muted" /></div>
                    <div><Label>SIRET</Label><Input value={formData.siret} disabled className="bg-muted" /></div>
                    <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
                    <div><Label>Téléphone</Label><Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} required /></div>
                  </div>
                  <div><Label>Adresse</Label><Input value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} required /></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Code postal</Label><Input value={formData.code_postal} onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })} required /></div>
                    <div><Label>Ville</Label><Input value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} required /></div>
                  </div>
                  <Button type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Mot de passe</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div><Label>Nouveau mot de passe</Label><Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} required /></div>
                  <div><Label>Confirmer</Label><Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required /></div>
                  <Button type="submit" disabled={saving}>Changer le mot de passe</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="verification" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vérification du compte</CardTitle>
                    <CardDescription>Soumettez les documents requis pour obtenir le badge vérifié</CardDescription>
                  </div>
                  {garage?.is_verified && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Compte Vérifié
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {garage?.is_verified ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Votre compte est vérifié</h3>
                    <p className="text-muted-foreground">
                      Vous bénéficiez maintenant du badge "Compte Vérifié"
                    </p>
                  </div>
                ) : (
                  <>
                    {garage?.verification_requested_at && (
                      <div className="text-center py-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Vérification en cours</h3>
                        <p className="text-muted-foreground text-sm">
                          Votre demande est en cours d'examen par notre équipe
                        </p>
                      </div>
                    )}
                    {['kbis', 'carte_identite', 'mandat'].map(type => {
                      const status = getDocStatus(type);
                      return (
                        <div key={type} className="border rounded-lg p-4">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-medium">
                              {type === 'kbis' ? 'KBIS' : type === 'carte_identite' ? "Carte d'identité" : (
                                <div>
                                  <div className="flex items-center gap-1">
                                    Mandat pré-rempli{' '}
                                    <a 
                                      href="/cerfas/cerfa_13757_03.pdf" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      (CERFA 13757)
                                    </a>
                                  </div>
                                  <p className="text-sm text-muted-foreground font-normal mt-1">
                                    (Remplir uniquement : raison sociale, SIRET, adresse. Tamponner et signer en bas)
                                  </p>
                                </div>
                              )}
                            </h3>
                            {status.badge}
                          </div>
                          {status.status === 'rejected' && <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm">{status.reason}</div>}
                          {status.canUpload && <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && handleFileUpload(type, e.target.files[0])} disabled={saving} />}
                        </div>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
