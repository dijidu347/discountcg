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
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, History, Send, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { passwordChangeSchema } from "@/lib/validations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RequiredDocument {
  id: string;
  code: string;
  nom_document: string;
  description: string;
  obligatoire: boolean;
}

interface VerificationDocument {
  id: string;
  document_type: string;
  nom_fichier: string;
  url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
}

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
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarage();
      loadRequiredDocs();
    }
    
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'verification') {
      setActiveTab('verification');
    }
  }, [user]);

  const loadRequiredDocs = async () => {
    const { data } = await supabase
      .from('garage_verification_required_documents')
      .select('*')
      .eq('actif', true)
      .order('ordre', { ascending: true });
    setRequiredDocs(data || []);
  };

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
      
      const { data: docs } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('garage_id', garageData.id)
        .order('created_at', { ascending: false });
      setVerificationDocs(docs || []);
      
      const { data: notifs } = await supabase
        .from('garage_verification_notifications')
        .select('*')
        .eq('garage_id', garageData.id)
        .order('created_at', { ascending: false });
      setNotifications(notifs || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('garages').update({ 
      email: formData.email, 
      telephone: formData.telephone, 
      adresse: formData.adresse, 
      code_postal: formData.code_postal, 
      ville: formData.ville 
    }).eq('id', garage.id);
    toast({ 
      title: error ? "Erreur" : "Succès", 
      description: error ? "Impossible de mettre à jour" : "Informations mises à jour", 
      variant: error ? "destructive" : "default" 
    });
    if (!error) loadGarage();
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      passwordChangeSchema.parse(passwordData);
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      toast({ 
        title: error ? "Erreur" : "Succès", 
        description: error?.message || "Mot de passe changé", 
        variant: error ? "destructive" : "default" 
      });
      if (!error) setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.errors?.[0]?.message || "Données invalides", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!garage) return;
    setUploadingDoc(documentType);
    try {
      const fileName = `${garage.id}/${documentType}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('demarche-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('demarche-documents').getPublicUrl(fileName);
      
      await supabase.from('verification_documents').insert({ 
        garage_id: garage.id, 
        document_type: documentType, 
        url: publicUrl, 
        nom_fichier: file.name, 
        status: 'pending' 
      });
      
      // Remettre le garage dans "À vérifier" (nouveau document envoyé)
      // Reset verification_admin_viewed pour qu'il apparaisse dans la section "À vérifier"
      await supabase.from('garages').update({ 
        verification_admin_viewed: false
      }).eq('id', garage.id);
      
      // Check if all required documents are now uploaded
      const { data: allDocs } = await supabase
        .from('verification_documents')
        .select('document_type')
        .eq('garage_id', garage.id)
        .in('status', ['pending', 'approved']);
      
      const uploadedTypes = new Set(allDocs?.map(d => d.document_type) || []);
      uploadedTypes.add(documentType);
      
      const requiredCodes = requiredDocs.filter(d => d.obligatoire).map(d => d.code);
      const allRequiredUploaded = requiredCodes.every(code => uploadedTypes.has(code));
      
      if (allRequiredUploaded && !garage.verification_requested_at) {
        await supabase.from('garages').update({ 
          verification_requested_at: new Date().toISOString(),
          verification_admin_viewed: false
        }).eq('id', garage.id);
        
        // Send admin notifications
        await supabase.functions.invoke('send-email', {
          body: { type: 'admin_verification_request', to: 'mathieugaillac4@gmail.com', data: { garage_name: garage.raison_sociale, garage_email: garage.email } }
        });
        await supabase.functions.invoke('send-email', {
          body: { type: 'admin_verification_request', to: 'contact@discountcartegrise.fr', data: { garage_name: garage.raison_sociale, garage_email: garage.email } }
        });
      }
      
      toast({ title: "Document envoyé", description: "Votre document a été soumis pour vérification" });
      loadGarage();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDocumentStatus = (docCode: string) => {
    const docs = verificationDocs.filter(d => d.document_type === docCode);
    if (docs.length === 0) return { status: 'missing', canUpload: true };
    
    const latestDoc = docs[0];
    switch (latestDoc.status) {
      case 'approved':
        return { 
          status: 'approved', 
          badge: <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>,
          canUpload: false,
          doc: latestDoc
        };
      case 'rejected':
        return { 
          status: 'rejected', 
          badge: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>,
          canUpload: true,
          reason: latestDoc.rejection_reason,
          doc: latestDoc
        };
      case 'pending':
        return { 
          status: 'pending', 
          badge: <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>,
          canUpload: false,
          doc: latestDoc
        };
      default:
        return { status: 'missing', canUpload: true };
    }
  };

  const getMissingDocsCount = () => {
    const requiredCodes = requiredDocs.filter(d => d.obligatoire).map(d => d.code);
    const approvedOrPending = verificationDocs
      .filter(d => d.status === 'approved' || d.status === 'pending')
      .map(d => d.document_type);
    return requiredCodes.filter(code => !approvedOrPending.includes(code)).length;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const missingDocs = getMissingDocsCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">Paramètres du compte</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="verification" className="relative">
              Vérification
              {missingDocs > 0 && !garage?.is_verified && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {missingDocs}
                </Badge>
              )}
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'entreprise</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Raison sociale</Label>
                      <Input value={formData.raison_sociale} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>SIRET</Label>
                      <Input value={formData.siret} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input 
                        value={formData.telephone} 
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input 
                      value={formData.adresse} 
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Code postal</Label>
                      <Input 
                        value={formData.code_postal} 
                        onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })} 
                        required 
                      />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input 
                        value={formData.ville} 
                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label>Nouveau mot de passe</Label>
                    <Input 
                      type="password" 
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <Label>Confirmer</Label>
                    <Input 
                      type="password" 
                      value={passwordData.confirmPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                      required 
                    />
                  </div>
                  <Button type="submit" disabled={saving}>
                    Changer le mot de passe
                  </Button>
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
                    <CardDescription>
                      Soumettez les documents requis pour obtenir le badge vérifié
                    </CardDescription>
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
                      <div className="text-center py-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950/20 dark:border-yellow-800">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Vérification en cours</h3>
                        <p className="text-muted-foreground text-sm">
                          Votre demande est en cours d'examen par notre équipe
                        </p>
                      </div>
                    )}
                    
                    {missingDocs > 0 && !garage?.verification_requested_at && (
                      <div className="text-center py-4 mb-4 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-950/20 dark:border-orange-800">
                        <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold mb-1">
                          Il vous manque {missingDocs} document{missingDocs > 1 ? 's' : ''}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Envoyez tous les documents obligatoires pour soumettre votre demande
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {requiredDocs.map(reqDoc => {
                        const status = getDocumentStatus(reqDoc.code);
                        
                        return (
                          <div 
                            key={reqDoc.id} 
                            className={`border rounded-lg p-4 ${
                              status.status === 'rejected' ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' :
                              status.status === 'approved' ? 'border-green-300 bg-green-50/50 dark:bg-green-950/10' :
                              ''
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium flex items-center gap-2">
                                  {reqDoc.nom_document}
                                  {reqDoc.obligatoire ? (
                                    <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Optionnel</Badge>
                                  )}
                                </h3>
                                {reqDoc.description && (
                                  <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                                )}
                                {reqDoc.code === 'mandat' && (
                                  <a 
                                    href="/cerfas/cerfa_13757_03.pdf" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Télécharger le CERFA 13757
                                  </a>
                                )}
                              </div>
                              {status.badge}
                            </div>
                            
                            {status.status === 'rejected' && status.reason && (
                              <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded text-sm dark:bg-red-950/30">
                                <p className="font-medium text-red-700 dark:text-red-400">Raison du refus:</p>
                                <p className="text-red-600 dark:text-red-300">{status.reason}</p>
                              </div>
                            )}
                            
                            {status.doc && (
                              <p className="text-sm text-muted-foreground mb-2">
                                Dernier envoi: {status.doc.nom_fichier} ({format(new Date(status.doc.created_at), "dd/MM/yyyy HH:mm", { locale: fr })})
                              </p>
                            )}
                            
                            {status.canUpload && (
                              <div className="relative">
                                <Input 
                                  type="file" 
                                  accept=".pdf,.jpg,.jpeg,.png" 
                                  onChange={(e) => e.target.files?.[0] && handleFileUpload(reqDoc.code, e.target.files[0])} 
                                  disabled={uploadingDoc === reqDoc.code}
                                  className="cursor-pointer"
                                />
                                {uploadingDoc === reqDoc.code && (
                                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Historique des notifications */}
                    {notifications.length > 0 && (
                      <div className="mt-8 pt-6 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <History className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">Historique des notifications</h3>
                          <Badge variant="secondary">{notifications.length}</Badge>
                        </div>
                        <ScrollArea className="h-[300px] pr-4">
                          <div className="space-y-3">
                            {notifications.map((notif) => (
                              <Card key={notif.id} className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium">{notif.subject}</h4>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(notif.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notif.message}</p>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
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
