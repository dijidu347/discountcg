import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Eye, ShieldCheck, Clock, Plus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RequiredDocument {
  id: string;
  code: string;
  nom_document: string;
  description: string;
  obligatoire: boolean;
  ordre: number;
  actif: boolean;
}

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  sent_by: string;
}

export default function ManageGarages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garages, setGarages] = useState<any[]>([]);
  const [garagesAVerifier, setGaragesAVerifier] = useState<any[]>([]);
  const [garagesVerifies, setGaragesVerifies] = useState<any[]>([]);
  const [garagesEnAttente, setGaragesEnAttente] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [showManageDocsDialog, setShowManageDocsDialog] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ nom_document: "", code: "", description: "", obligatoire: true });
  const [savingDoc, setSavingDoc] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    // Filtre sur le rôle admin (sinon .single() casse pour les users ayant plusieurs rôles)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      navigate('/dashboard');
      return;
    }

    loadGarages();
    loadRequiredDocs();
  };

  const loadRequiredDocs = async () => {
    const { data } = await supabase
      .from('garage_verification_required_documents')
      .select('*')
      .order('ordre', { ascending: true });
    setRequiredDocs(data || []);
  };

  const loadGarages = async () => {
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading garages:', error);
      setLoading(false);
      return;
    }
    
    const allGarages = data || [];
    
    // Charger les documents de vérification pour tous les garages
    const { data: allDocs } = await supabase
      .from('verification_documents')
      .select('garage_id');
    
    // Set de garages ayant au moins 1 document
    const garagesWithDocs = new Set((allDocs || []).map(d => d.garage_id));
    
    // VÉRIFIÉS: Garages déjà vérifiés
    const verifies = allGarages.filter(g => g.is_verified);
    
    // À VÉRIFIER: Garages avec tous les documents soumis ET pas encore ouverts par admin
    const aVerifier = allGarages.filter(g => 
      g.verification_requested_at && 
      !g.is_verified && 
      !g.verification_admin_viewed
    );
    
    // EN ATTENTE: Garages avec au moins 1 document ET (ouverts par admin OU pas tous les docs)
    // DOIT avoir au moins 1 document pour apparaître
    const enAttente = allGarages.filter(g => 
      !g.is_verified && 
      !aVerifier.some(av => av.id === g.id) && 
      garagesWithDocs.has(g.id) && // OBLIGATOIRE: au moins 1 document
      g.verification_admin_viewed === true // ET doit avoir été ouvert par admin
    );
    
    setGarages(allGarages);
    setGaragesAVerifier(aVerifier);
    setGaragesVerifies(verifies);
    setGaragesEnAttente(enAttente);
    setLoading(false);
  };

  // Check if all required documents are approved
  const handleAddRequiredDoc = async () => {
    if (!newDocForm.nom_document.trim() || !newDocForm.code.trim()) return;
    setSavingDoc(true);
    try {
      const maxOrdre = Math.max(...requiredDocs.map(d => d.ordre), 0);
      const { error } = await supabase.from('garage_verification_required_documents').insert({
        nom_document: newDocForm.nom_document,
        code: newDocForm.code.toLowerCase().replace(/\s+/g, '_'),
        description: newDocForm.description,
        obligatoire: newDocForm.obligatoire,
        ordre: maxOrdre + 1
      });
      if (error) throw error;
      toast({ title: "Document ajouté" });
      setNewDocForm({ nom_document: "", code: "", description: "", obligatoire: true });
      await loadRequiredDocs();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSavingDoc(false);
    }
  };

  const handleToggleDocActive = async (doc: RequiredDocument) => {
    await supabase.from('garage_verification_required_documents')
      .update({ actif: !doc.actif })
      .eq('id', doc.id);
    await loadRequiredDocs();
  };

  const handleToggleDocRequired = async (doc: RequiredDocument) => {
    await supabase.from('garage_verification_required_documents')
      .update({ obligatoire: !doc.obligatoire })
      .eq('id', doc.id);
    await loadRequiredDocs();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  // Recherche EN MÉMOIRE par nom (raison_sociale) OU email — appliquée aux 3 buckets.
  const filtrerGarages = (liste: any[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return liste;
    return liste.filter(
      (g) => g.raison_sociale?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q),
    );
  };
  const filteredAVerifier = filtrerGarages(garagesAVerifier);
  const filteredEnAttente = filtrerGarages(garagesEnAttente);
  const filteredVerifies = filtrerGarages(garagesVerifies);
  const aucunResultat =
    searchQuery.trim() !== "" &&
    filteredAVerifier.length === 0 &&
    filteredEnAttente.length === 0 &&
    filteredVerifies.length === 0 &&
    garagesAVerifier.length + garagesEnAttente.length + garagesVerifies.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin - Gérer les garages | Discount Carte Grise</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button variant="outline" onClick={() => setShowManageDocsDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gérer les documents requis
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Rechercher un garage (nom ou email)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>

        {aucunResultat && (
          <p className="text-muted-foreground text-center py-8">Aucun garage ne correspond à la recherche</p>
        )}

        {/* Section À VÉRIFIER */}
        <Card className="p-6 mb-8 border-2 border-orange-500/20 bg-orange-50/5">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-orange-700 dark:text-orange-500">Garages à vérifier</h1>
            <Badge variant="outline" className="border-orange-500 text-orange-600">{garagesAVerifier.length}</Badge>
          </div>

          {garagesAVerifier.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun garage en attente de vérification</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Date demande</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAVerifier.map((garage) => (
                  <TableRow
                    key={garage.id}
                    onClick={() => navigate(`/admin/garages/${garage.id}`)}
                    className={`cursor-pointer ${!garage.verification_admin_viewed ? "bg-red-50 dark:bg-red-950/20" : "bg-orange-50/50 dark:bg-orange-950/10"}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {garage.raison_sociale}
                        {!garage.verification_admin_viewed && (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Nouveau
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{garage.siret}</TableCell>
                    <TableCell>{garage.email}</TableCell>
                    <TableCell>{garage.telephone}</TableCell>
                    <TableCell>
                      {new Date(garage.verification_requested_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/garages/${garage.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir la fiche
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Section EN ATTENTE (nouveau : vue après ouverture) */}
        <Card className="p-6 mb-8 border-2 border-yellow-500/20 bg-yellow-50/5">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-yellow-600" />
            <h1 className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">En attente de documents</h1>
            <Badge variant="outline" className="border-yellow-500 text-yellow-600">{garagesEnAttente.length}</Badge>
          </div>

          {garagesEnAttente.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun garage en attente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnAttente.map((garage) => (
                  <TableRow
                    key={garage.id}
                    onClick={() => navigate(`/admin/garages/${garage.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {garage.raison_sociale}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{garage.siret}</TableCell>
                    <TableCell className="text-muted-foreground">{garage.email}</TableCell>
                    <TableCell className="text-muted-foreground">{garage.telephone}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/garages/${garage.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir la fiche
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Section VÉRIFIÉS */}
        <Card className="p-6 mb-8 border-2 border-green-500/20 bg-green-50/5">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-500">Garages vérifiés</h1>
            <Badge variant="outline" className="border-green-500 text-green-600">{garagesVerifies.length}</Badge>
          </div>

          {garagesVerifies.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun garage vérifié</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVerifies.map((garage) => (
                  <TableRow
                    key={garage.id}
                    onClick={() => navigate(`/admin/garages/${garage.id}`)}
                    className="cursor-pointer bg-green-50/50 dark:bg-green-950/10"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {garage.raison_sociale}
                        <Badge className="bg-green-500">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Vérifié
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{garage.siret}</TableCell>
                    <TableCell>{garage.email}</TableCell>
                    <TableCell>{garage.telephone}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/garages/${garage.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir la fiche
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Manage Required Documents Dialog */}
        <Dialog open={showManageDocsDialog} onOpenChange={setShowManageDocsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Documents requis pour la vérification</DialogTitle>
              <DialogDescription>
                Gérer les documents obligatoires et optionnels
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Ajouter un document</h4>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nom du document</Label>
                      <Input
                        placeholder="Ex: Attestation d'assurance"
                        value={newDocForm.nom_document}
                        onChange={(e) => setNewDocForm({ ...newDocForm, nom_document: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Code unique</Label>
                      <Input
                        placeholder="Ex: attestation_assurance"
                        value={newDocForm.code}
                        onChange={(e) => setNewDocForm({ ...newDocForm, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description (optionnel)</Label>
                    <Input
                      placeholder="Instructions pour le garage"
                      value={newDocForm.description}
                      onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newDocForm.obligatoire}
                      onCheckedChange={(checked) => setNewDocForm({ ...newDocForm, obligatoire: !!checked })}
                    />
                    <Label>Document obligatoire</Label>
                  </div>
                  <Button onClick={handleAddRequiredDoc} disabled={savingDoc}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </Card>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {requiredDocs.map((doc) => (
                    <Card key={doc.id} className={`p-3 ${!doc.actif ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.nom_document}</h4>
                          <p className="text-sm text-muted-foreground">{doc.code}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={doc.obligatoire ? "default" : "outline"}
                            onClick={() => handleToggleDocRequired(doc)}
                          >
                            {doc.obligatoire ? "Obligatoire" : "Optionnel"}
                          </Button>
                          <Button
                            size="sm"
                            variant={doc.actif ? "outline" : "destructive"}
                            onClick={() => handleToggleDocActive(doc)}
                          >
                            {doc.actif ? "Actif" : "Inactif"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
