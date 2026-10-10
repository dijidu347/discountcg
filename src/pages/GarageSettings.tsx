import { Helmet } from "react-helmet-async";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GarageSignatureSettings } from "@/components/signature/GarageSignatureSettings";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, History, Send, Upload, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { passwordChangeSchema } from "@/lib/validations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { formeJuridiqueDuGarage, pieceAttendue, libellePiece } from "@/lib/formeJuridique";
import { ChampFichiers } from "@/components/ChampFichiers";
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

const FORMATS_ACCEPTES = ["pdf", "jpg", "jpeg", "png"];

// Rend le message à afficher si un fichier ne peut pas être lu, sinon null.
function formatRefuse(files: File[]): string | null {
  const mauvais = files.filter((f) => !FORMATS_ACCEPTES.includes((f.name.split(".").pop() || "").toLowerCase()));
  if (mauvais.length === 0) return null;
  return `${mauvais.map((f) => f.name).join(", ")} : déposez un PDF ou une photo (JPG, PNG). Une archive ZIP ne peut pas être ouverte, ni par nous ni par l'administration.`;
}

// Combien de fichiers une pièce peut porter.
//
// Un Kbis est un document, pas une collection : en déposer un second à côté
// du premier ne sert à rien, et laisse deux versions dont personne ne sait
// laquelle fait foi. Une carte d'identité en vaut deux — recto et verso —
// sauf quand la photocopie contient déjà les deux faces.
//
// Au-delà de la capacité, le plus ancien s'efface : le dépôt remplace, il
// n'empile pas.
const CAPACITE_PIECE: Record<string, number> = {
  kbis: 1,
  carte_identite: 2,
  mandat: 1,
};
const capaciteDe = (code: string) => CAPACITE_PIECE[code] ?? 2;

export default function GarageSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
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
    if (!authLoading && !user) {
      // On emporte la destination : après la connexion, le garage revient ici,
      // et pas sur le tableau de bord.
      const suite = window.location.pathname + window.location.search;
      navigate(`/login?suite=${encodeURIComponent(suite)}`);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarage();
      loadRequiredDocs();
    }
    
    // Le lien « Déposer mon Kbis » des e-mails porte encore ?tab=verification :
    // la page n'a plus d'onglets, elle y descend.
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'verification') {
      setTimeout(() => {
        document.getElementById('verification')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [user]);

  // Dossier complet sans demande enregistrée (une pièce requise a été retirée
  // de la liste, comme le mandat le 21/09/2026) : la demande part d'elle-même,
  // sinon le garage n'aurait ni « Vérification en cours » ni pièce à envoyer.
  const demandeRattrapee = useRef(false);
  useEffect(() => {
    if (!garage || garage.is_verified || garage.verification_requested_at || demandeRattrapee.current) return;
    // Sauf si c'est le Kbis qui a expiré : repartir en vérification avec le même
    // Kbis périmé affiche « Vérification en cours » au garage, qui attend alors
    // une réponse au lieu de déposer le document neuf, et met l'administration
    // devant un dossier qui n'a pas bougé.
    const kbisPerime = garage.kbis_valide_jusqu_au
      && new Date(garage.kbis_valide_jusqu_au) < new Date();
    if (kbisPerime) return;
    const requis = requiredDocs.filter(d => d.obligatoire).map(d => d.code);
    if (requis.length === 0) return;
    const envoyes = new Set(verificationDocs.filter(d => d.status === 'approved' || d.status === 'pending').map(d => d.document_type));
    if (!requis.every(code => envoyes.has(code))) return;
    demandeRattrapee.current = true;
    (async () => {
      const maintenant = new Date().toISOString();
      const { error } = await supabase.from('garages').update({
        verification_requested_at: maintenant,
        verification_admin_viewed: false,
      }).eq('id', garage.id);
      if (error) { demandeRattrapee.current = false; return; }
      setGarage((g: any) => (g ? { ...g, verification_requested_at: maintenant } : g));
      await supabase.functions.invoke('send-email', {
        body: { type: 'admin_verification_request', to: 'contact@discountcartegrise.fr', data: { garage_name: garage.raison_sociale, garage_email: garage.email } }
      });
    })();
  }, [garage, requiredDocs, verificationDocs]);

  // Subscribe to realtime updates for verification documents
  useEffect(() => {
    if (!garage?.id) return;

    const channel = supabase
      .channel(`verification-docs-${garage.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_documents',
          filter: `garage_id=eq.${garage.id}`
        },
        () => {
          // Reload documents when any change happens
          loadGarage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [garage?.id]);

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
    // Un SIRET à moitié saisi vaut moins que pas de SIRET du tout : il
    // empêcherait de lire la forme juridique tout en paraissant renseigné.
    if (!garage?.is_verified && formData.siret && formData.siret.length !== 14) {
      toast({
        title: "SIRET incomplet",
        description: "Le SIRET comporte quatorze chiffres. Laissez le champ vide plutôt que d'en saisir une partie.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('garages').update({ 
      email: formData.email, 
      telephone: formData.telephone, 
      adresse: formData.adresse, 
      code_postal: formData.code_postal, 
      ville: formData.ville,
      // Tant que le compte n'est pas vérifié, ces deux-là restent corrigeables.
      ...(garage?.is_verified
        ? {}
        : { raison_sociale: formData.raison_sociale, siret: formData.siret }),
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

  const handleFileUpload = async (documentType: string, files: File[]) => {
    if (!garage || files.length === 0) return;
    const refus = formatRefuse(files);
    if (refus) {
      toast({ title: "Format non accepté", description: refus, variant: "destructive" });
      return;
    }
    setUploadingDoc(documentType);
    try {
      // Delete any rejected documents of this type before uploading new ones
      const { data: rejectedDocs, error: fetchError } = await supabase
        .from('verification_documents')
        .select('id, url')
        .eq('garage_id', garage.id)
        .eq('document_type', documentType)
        .eq('status', 'rejected');
      
      if (fetchError) {
        console.error('Error fetching rejected docs:', fetchError);
      }
      
      if (rejectedDocs && rejectedDocs.length > 0) {
        // Delete from storage first (ignore errors - file might already be deleted)
        for (const doc of rejectedDocs) {
          try {
            const urlParts = doc.url.split('/demarche-documents/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1].split('?')[0]; // Remove any query params
              await supabase.storage.from('demarche-documents').remove([filePath]);
            }
          } catch (e) {
            console.error('Error deleting file from storage:', e);
          }
        }
        
        // Delete from database - use individual deletes by ID for better reliability
        for (const doc of rejectedDocs) {
          const { error: deleteError } = await supabase
            .from('verification_documents')
            .delete()
            .eq('id', doc.id);
          
          if (deleteError) {
            console.error('Error deleting rejected doc:', deleteError);
          }
        }
      }
      
      // Upload all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Toast "Upload en cours..."
        toast({ 
          title: "Upload en cours...", 
          description: file.name 
        });
        
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileName = `${garage.id}/${documentType}-${timestamp}-${randomSuffix}.${file.name.split('.').pop()}`;
        
        const { error: uploadError } = await supabase.storage
          .from('demarche-documents')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        
        // Store the file path - signed URLs will be generated on demand
        // Le bucket est prive : on stocke le chemin, jamais une URL brute, que
      // le navigateur ne saurait de toute facon pas ouvrir. L'affichage passe
      // par une URL signee, et extractPathFromUrl accepte les deux formes.
      const fileUrl = `demarche-documents/${fileName}`;
        
        const { error: insertError } = await supabase.from('verification_documents').insert({ 
          garage_id: garage.id, 
          document_type: documentType, 
          url: fileUrl, 
          nom_fichier: file.name, 
          status: 'pending' 
        });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        
        // Toast "Upload terminé"
        toast({ 
          title: "Upload terminé", 
          description: file.name 
        });
      }
      // Le dépôt remplace : au-delà de la capacité de la pièce, les plus
      // anciens s'effacent. Sans cela un garage qui redépose son Kbis en
      // laisse deux à l'écran, et l'administration ignore lequel est le bon.
      const capacite = capaciteDe(documentType);
      const { data: presents } = await supabase
        .from('verification_documents')
        .select('id, url, created_at')
        .eq('garage_id', garage.id)
        .eq('document_type', documentType)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      const surnumeraires = (presents ?? []).slice(capacite);
      for (const vieux of surnumeraires) {
        try {
          const parts = String(vieux.url ?? "").split('/demarche-documents/');
          const chemin = parts.length > 1 ? parts[1].split('?')[0] : null;
          if (chemin) await supabase.storage.from('demarche-documents').remove([chemin]);
        } catch (e) {
          console.error('Fichier remplacé non supprimé du stockage', e);
        }
        const { error } = await supabase
          .from('verification_documents')
          .delete()
          .eq('id', vieux.id);
        if (error) console.error('Ligne remplacée non supprimée', error);
      }

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
      
      // Un renouvellement de Kbis n'est pas une demande de vérification : la
      // lecture décide toute seule dans le quart d'heure, et ne réveille
      // l'administration que si elle n'a pas pu conclure. Prévenir dès le dépôt
      // revenait à annoncer un travail qui, neuf fois sur dix, n'aura pas lieu.
      if (allRequiredUploaded && !garage.verification_requested_at && !kbisPerime) {
        await supabase.from('garages').update({ 
          verification_requested_at: new Date().toISOString(),
          verification_admin_viewed: false
        }).eq('id', garage.id);
        
        // Send admin notification
        await supabase.functions.invoke('send-email', {
          body: { type: 'admin_verification_request', to: 'contact@discountcartegrise.fr', data: { garage_name: garage.raison_sociale, garage_email: garage.email } }
        });
      }
      
      // Reload garage data

      loadGarage();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  // Documents approuvés dont le garage a demandé le remplacement.
  // Le détail des fichiers est replié par défaut, et seulement pour ce qui
  // est réglé : une pièce refusée ou périmée s'ouvre d'elle-même, puisque
  // c'est précisément celle qu'il faut regarder.
  const [detailsOuverts, setDetailsOuverts] = useState<Set<string>>(new Set());
  const [remplacements, setRemplacements] = useState<Set<string>>(new Set());

  // La fiche entreprise est le préalable aux pièces, et non un à-côté.
  //
  // La lecture automatique compare le SIREN imprimé sur le Kbis à celui du
  // garage : sans SIRET enregistré, la comparaison échoue en silence, et
  // l'administration n'a rien à quoi rapprocher le document. Un garage pouvait
  // pourtant déposer ses deux pièces avec une fiche vide — quarante-six
  // comptes n'ont ni raison sociale ni SIRET.
  const ficheIncomplete =
    !String(garage?.raison_sociale ?? "").trim()
    || String(garage?.siret ?? "").replace(/\D/g, "").length !== 14;

  // Quelle pièce d'immatriculation ce professionnel peut fournir. Déduite de
  // son SIRET, sans rien lui demander : beaucoup ignorent s'ils relèvent du
  // registre du commerce ou du répertoire des métiers, et répondraient au
  // hasard à la question.
  const [attendue, setAttendue] = useState<ReturnType<typeof pieceAttendue>>("indetermine");

  useEffect(() => {
    if (!garage?.id) return;
    let vivant = true;
    formeJuridiqueDuGarage(garage).then((code) => {
      if (vivant) setAttendue(pieceAttendue(code));
    });
    return () => { vivant = false; };
  }, [garage?.id, garage?.siret, garage?.forme_juridique_code]);

  const getDocumentStatus = (docCode: string) => {
    const docs = verificationDocs.filter(d => d.document_type === docCode);
    if (docs.length === 0) return { status: 'missing', canUpload: true };
    
    // Priority: approved > pending > rejected
    // Check for approved first
    const approvedDoc = docs.find(d => d.status === 'approved');
    // Un envoi postérieur à l'approbation est un remplacement : c'est lui qu'il
    // faut montrer, sinon le garage dépose son nouveau Kbis et l'écran continue
    // d'afficher « Approuvé » avec l'ancien fichier.
    const remplacementEnAttente = approvedDoc
      && docs.some(d => d.status === 'pending' && d.created_at > approvedDoc.created_at);
    if (approvedDoc && !remplacementEnAttente) {
      // Un Kbis approuvé il y a plus de six mois n'est plus valable : le montrer
      // en vert reviendrait à dire au garage qu'il n'a rien à faire.
      if (docCode === 'kbis' && kbisPerime) {
        return {
          status: 'expire',
          badge: <Badge className="bg-orange-500"><AlertCircle className="h-3 w-3 mr-1" />Expiré</Badge>,
          canUpload: true,
          doc: approvedDoc
        };
      }
      return { 
        status: 'approved', 
        badge: <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>,
        // Un document approuvé reste remplaçable, sur demande : un Kbis vieillit
        // et passe les six mois. Tant que le garage n'a pas cliqué sur
        // « Remplacer », les champs de dépôt restent fermés, pour ne pas laisser
        // croire qu'il manque quelque chose.
        canUpload: remplacements.has(docCode),
        remplacable: true,
        doc: approvedDoc
      };
    }
    
    // Check for pending (new document sent after rejection)
    const pendingDocs = docs.filter(d => d.status === 'pending');
    if (pendingDocs.length > 0) {
      const latestPending = pendingDocs[0]; // Already sorted by created_at desc
      return { 
        status: 'pending', 
        badge: <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>,
        canUpload: true,
        doc: latestPending,
        allPendingDocs: pendingDocs
      };
    }
    
    // All remaining are rejected
    const latestRejected = docs[0];
    return { 
      status: 'rejected', 
      badge: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>,
      canUpload: true,
      reason: latestRejected.rejection_reason,
      doc: latestRejected
    };
  };

  // Kbis dépassé : c'est lui qu'il faut renouveler, et le dire vaut mieux que
  // de laisser le garage devant un « Vérification en cours » qui n'avance pas.
  const kbisPerime = Boolean(
    garage?.kbis_valide_jusqu_au && new Date(garage.kbis_valide_jusqu_au) < new Date(),
  );

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
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Paramètres du garage | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">Paramètres du compte</h1>
        
        {/* Deux colonnes dès qu'il y a la place : la page était large et vide,
            avec la vérification rejetée tout en bas. */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'entreprise</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" id="fiche-entreprise">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Raison sociale et SIRET se verrouillent une fois le
                        compte vérifié : à ce moment nous avons contrôlé les
                        pièces, et ils ne doivent plus bouger. Avant, ils
                        restent modifiables — sans quoi un garage inscrit avec
                        un champ vide ou un SIRET fautif ne peut plus rien
                        corriger. Quarante-six comptes n'ont ni raison sociale
                        ni SIRET et étaient dans cette impasse. */}
                    <div>
                      <Label htmlFor="raison_sociale">Raison sociale</Label>
                      <Input
                        id="raison_sociale"
                        value={formData.raison_sociale}
                        onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                        disabled={garage?.is_verified}
                        className={garage?.is_verified ? "bg-muted" : ""}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    <div>
                      <Label htmlFor="siret">SIRET</Label>
                      <Input
                        id="siret"
                        value={formData.siret}
                        onChange={(e) =>
                          setFormData({ ...formData, siret: e.target.value.replace(/\D/g, "").slice(0, 14) })
                        }
                        disabled={garage?.is_verified}
                        className={garage?.is_verified ? "bg-muted" : ""}
                        inputMode="numeric"
                        maxLength={14}
                        placeholder="14 chiffres"
                      />
                      {!garage?.is_verified && formData.siret.length > 0 && formData.siret.length < 14 && (
                        <p className="mt-1 text-xs text-destructive">
                          {14 - formData.siret.length} chiffre
                          {14 - formData.siret.length > 1 ? "s" : ""} manquant
                          {14 - formData.siret.length > 1 ? "s" : ""}.
                        </p>
                      )}
                      {garage?.is_verified && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Verrouillé depuis la vérification de votre compte.
                        </p>
                      )}
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
                        type="tel"
                        inputMode="tel"
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
                        inputMode="numeric"
                        pattern="[0-9]*"
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
                    <ChampMotDePasse
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                      required 
                    />
                  </div>
                  <div>
                    <Label>Confirmer</Label>
                    <ChampMotDePasse
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

            <GarageSignatureSettings
              garage={garage}
              onSaved={(patch) => setGarage((g: any) => (g ? { ...g, ...patch } : g))}
            />
          </div>

          <div id="verification" className="scroll-mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vérification du compte</CardTitle>
                    <CardDescription>
                      {ficheIncomplete && !garage?.is_verified
                        ? "Complétez d'abord votre fiche entreprise, puis déposez vos pièces"
                        : "Soumettez les documents requis pour obtenir le badge vérifié"}
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
                {/* Le préalable, avant toute pièce : sans raison sociale ni
                    SIRET, un Kbis déposé ne se rattache à rien. Le dire ici
                    plutôt que de laisser déposer des documents inexploitables. */}
                {ficheIncomplete && !garage?.is_verified && (
                  <div className="rounded-lg border-2 border-primary bg-primary/10 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="font-bold text-primary">
                            Commencez par votre fiche entreprise
                          </p>
                          <p className="mt-0.5 text-sm text-primary/90">
                            Il manque{" "}
                            {!String(garage?.raison_sociale ?? "").trim() && "votre raison sociale"}
                            {!String(garage?.raison_sociale ?? "").trim()
                              && String(garage?.siret ?? "").replace(/\D/g, "").length !== 14
                              && " et "}
                            {String(garage?.siret ?? "").replace(/\D/g, "").length !== 14
                              && "votre SIRET"}
                            . Sans eux, nous ne pouvons pas rattacher votre Kbis à votre
                            entreprise : déposer vos pièces maintenant ne servirait à rien.
                          </p>
                        </div>
                      </div>
                      <Button
                        className="shrink-0"
                        onClick={() =>
                          document.getElementById("fiche-entreprise")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          })
                        }
                      >
                        Compléter ma fiche
                      </Button>
                    </div>
                  </div>
                )}

                {garage?.is_verified && (
                  <div className="text-center py-6 mb-2 rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold mb-1">Votre compte est vérifié</h3>
                    <p className="text-muted-foreground text-sm">
                      Un document qui n'est plus à jour se remplace ci-dessous.
                    </p>
                  </div>
                )}
                {(
                  <>
                    {kbisPerime && (
                      <div className="py-4 mb-4 px-4 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-950/20 dark:border-orange-800">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-6 w-6 text-orange-500 shrink-0" />
                          <div>
                            <h3 className="font-semibold mb-1">Votre justificatif d'immatriculation a plus de six mois</h3>
                            <p className="text-muted-foreground text-sm">
                              Déposez-en un récent ci-dessous, avec le bouton « Remplacer » : un
                              extrait Kbis, ou votre attestation d'immatriculation au RNE si vous
                              n'êtes pas inscrit au registre du commerce — elle est gratuite sur
                              data.inpi.fr. Vos démarches continuent de fonctionner normalement.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {!garage?.is_verified && !kbisPerime && garage?.verification_requested_at && (
                      <div className="text-center py-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950/20 dark:border-yellow-800">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Vérification en cours</h3>
                        <p className="text-muted-foreground text-sm">
                          Votre demande est en cours d'examen par notre équipe
                        </p>
                      </div>
                    )}
                    
                    {!garage?.is_verified && missingDocs > 0 && !garage?.verification_requested_at && (
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
                    
                    {/* Les pièces ne s'affichent qu'une fois la fiche
                        complète : c'est le SIRET qui décide laquelle demander.
                        Sans lui on afficherait « Kbis ou attestation RNE » à
                        tout le monde, en laissant le garage choisir — et un
                        artisan choisirait le Kbis, qu'il ne peut pas obtenir.

                        Sauf pour un compte déjà vérifié. Douze garages sont
                        vérifiés avec un SIRET à neuf chiffres, hérité de
                        l'époque où le formulaire les acceptait. Ils ne voyaient
                        ni le bandeau (réservé aux comptes non vérifiés) ni la
                        liste : un écran vide, et aucun moyen de remplacer un
                        Kbis périmé. Leur fiche a déjà été acceptée ; le verrou
                        ne protège que le premier dépôt. */}
                    {(!ficheIncomplete || garage?.is_verified) && (
                    <div className="space-y-4">
                      {requiredDocs.map(reqDoc => {
                        const status = getDocumentStatus(reqDoc.code);
                        
                        return (
                          <div 
                            key={reqDoc.id} 
                            className={`border rounded-lg p-4 ${
                              status.status === 'rejected' ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' :
                              status.status === 'expire' ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/10' :
                              status.status === 'approved' ? 'border-green-300 bg-green-50/50 dark:bg-green-950/10' :
                              ''
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium flex items-center gap-2">
                                  {reqDoc.code === 'kbis' ? libellePiece(attendue).nom : reqDoc.nom_document}
                                  {reqDoc.obligatoire ? (
                                    <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Optionnel</Badge>
                                  )}
                                </h3>
                                {reqDoc.code === 'kbis' ? (
                                  <p className="text-sm text-muted-foreground">{libellePiece(attendue).aide}</p>
                                ) : reqDoc.description ? (
                                  <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                                ) : null}
                                {reqDoc.code === 'mandat' && (
                                  <div className="flex flex-col gap-1">
                                    <p className="text-sm text-muted-foreground italic">
                                      (Remplir uniquement : raison sociale, SIRET, adresse. Tamponner et signer en bas)
                                    </p>
                                    <a 
                                      href="/cerfas/cerfa_13757_03.pdf" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline"
                                    >
                                      Télécharger le CERFA 13757
                                    </a>
                                  </div>
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
                            
                            {/* Tous les fichiers reçus, pas seulement le dernier.
                                Une carte d'identité tient souvent en deux photos :
                                l'écran n'en montrait qu'une, et le garage croyait
                                que son verso avait écrasé son recto. */}
                            {status.doc && (() => {
                              const recus = verificationDocs
                                .filter((d) => d.document_type === reqDoc.code
                                  && (d.status === 'pending' || d.status === 'approved'))
                                .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
                              return (
                                (() => {
                                const aRegler = status.status === "rejected" || status.status === "expire";
                                // Deux fichiers portant le même nom dans la même pièce :
                                // c'est presque toujours le même document déposé deux
                                // fois, par un double clic ou un envoi qui semblait
                                // avoir échoué. Personne ne s'en rend compte, et
                                // l'écran affichait « Fichier 1 sur 2 » comme si le
                                // dossier était complet alors qu'il manquait le verso.
                                const vus = new Set<string>();
                                const doublons = new Set<string>();
                                recus.forEach((d) => {
                                  const cle = String(d.nom_fichier ?? "").trim().toLowerCase();
                                  if (!cle) return;
                                  if (vus.has(cle)) doublons.add(d.id);
                                  else vus.add(cle);
                                });
                                const ouvert = aRegler || detailsOuverts.has(reqDoc.code);
                                const dernier = recus[recus.length - 1];
                                return (
                                <div className="mb-2 space-y-1">
                                  {/* Une ligne de résumé plutôt qu'un gros bouton par
                                      fichier. Le nom du fichier n'apprend rien à
                                      personne — « Capture d'écran 2025-12-16 à
                                      11.56.33.png » — et prenait toute la largeur ;
                                      la date, elle, dit si la pièce est à jour. */}
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span>
                                      {recus.length === 1
                                        ? `1 fichier reçu, le ${format(new Date(dernier.created_at), "dd/MM/yyyy", { locale: fr })}`
                                        : `${recus.length} fichiers reçus, le dernier le ${format(new Date(dernier.created_at), "dd/MM/yyyy", { locale: fr })}`}
                                    </span>
                                    {doublons.size > 0 && (
                                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                                        {doublons.size === 1
                                          ? "un fichier semble être un doublon"
                                          : `${doublons.size} fichiers semblent être des doublons`}
                                      </span>
                                    )}
                                    {!aRegler && (
                                      <button
                                        type="button"
                                        className="text-primary hover:underline"
                                        onClick={() => setDetailsOuverts((o) => {
                                          const suivant = new Set(o);
                                          if (suivant.has(reqDoc.code)) suivant.delete(reqDoc.code);
                                          else suivant.add(reqDoc.code);
                                          return suivant;
                                        })}
                                      >
                                        {ouvert ? "masquer le détail" : "voir le détail"}
                                      </button>
                                    )}
                                  </div>

                                  {ouvert && recus.map((d, i) => (
                                    <div key={d.id} className="flex items-center gap-3 border-t py-1.5 text-sm">
                                      <span className="w-10 shrink-0 text-muted-foreground">
                                        {recus.length > 1 ? `${i + 1} / ${recus.length}` : ""}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate">
                                        Déposé le {format(new Date(d.created_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                                        {doublons.has(d.id) && (
                                          <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                                            même fichier que plus haut
                                          </span>
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        className="shrink-0 text-primary hover:underline"
                                        onClick={() => window.open(d.url, '_blank')}
                                      >
                                        Voir
                                      </button>
                                    </div>
                                  ))}

                                  {status.remplacable && !status.canUpload && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-1"
                                      onClick={() => setRemplacements((d) => new Set(d).add(reqDoc.code))}
                                    >
                                      <Upload className="h-4 w-4 mr-1" />
                                      Remplacer
                                    </Button>
                                  )}
                                </div>
                                );
                                })()
                              );
                            })()}
                            
                            {status.canUpload && (
                              <div className="space-y-2">
                                {/* Un seul champ : trois cases donnaient à croire qu'il
                                    fallait trois fichiers. Il en accepte plusieurs d'un
                                    coup, pour un recto et un verso. */}
                                <ChampFichiers
                                  variante="zone"
                                  multiple={capaciteDe(reqDoc.code) > 1}
                                  disabled={uploadingDoc === reqDoc.code}
                                  libelle={
                                    // Une pièce qui ne tient qu'en un fichier ne
                                    // s'« ajoute » jamais : elle se remplace, et le
                                    // bouton doit le dire avant le clic.
                                    capaciteDe(reqDoc.code) === 1 && status.doc
                                      ? "Remplacer"
                                      : status.status === "approved" || status.status === "expire"
                                      ? "Remplacer"
                                      : status.doc ? "Ajouter un fichier" : undefined
                                  }
                                  vide={
                                    status.status === "expire"
                                      ? "Déposez un justificatif de moins de six mois"
                                      : capaciteDe(reqDoc.code) === 1 && status.doc
                                      ? "Le nouveau fichier remplacera celui déjà déposé"
                                      : status.doc
                                      ? (verificationDocs.filter((d) => d.document_type === reqDoc.code
                                          && (d.status === 'pending' || d.status === 'approved')).length >= capaciteDe(reqDoc.code)
                                          ? "Le nouveau fichier remplacera le plus ancien"
                                          : "Vous pouvez en ajouter un autre — le verso, par exemple")
                                      : reqDoc.code === "carte_identite"
                                      ? "Recto et verso : choisissez les deux fichiers à la fois, ou un seul s'il contient les deux faces"
                                      : "Aucun fichier choisi"
                                  }
                                  onChoisis={(fichiers) => handleFileUpload(reqDoc.code, fichiers)}
                                />
                                {uploadingDoc === reqDoc.code && (
                                  <div className="flex items-center justify-center py-2">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">Envoi en cours...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                    
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
          </div>
        </div>
      </div>
    </div>
  );
}
