import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Edit, Save, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type RequiredDocument = {
  id: string;
  nom_document: string;
  ordre: number;
  obligatoire: boolean;
  actif: boolean;
};

export default function ManageGuestDocuments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RequiredDocument | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndLoadData();
    }
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');

    if (!hasAdminRole) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    setLoading(true);

    const { data: docsData } = await supabase
      .from('guest_order_required_documents')
      .select('*')
      .order('ordre');

    if (docsData) {
      setDocuments(docsData);
    }

    setLoading(false);
  };

  const handleCreateDocument = () => {
    setEditingDoc({
      id: '',
      nom_document: '',
      ordre: documents.length + 1,
      obligatoire: true,
      actif: true
    });
    setShowDialog(true);
  };

  const handleEditDocument = (doc: RequiredDocument) => {
    setEditingDoc(doc);
    setShowDialog(true);
  };

  const handleSaveDocument = async () => {
    if (!editingDoc) return;

    if (!editingDoc.nom_document.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du document est obligatoire",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (editingDoc.id) {
        // Update existing document
        const { error } = await supabase
          .from('guest_order_required_documents')
          .update({
            nom_document: editingDoc.nom_document,
            ordre: editingDoc.ordre,
            obligatoire: editingDoc.obligatoire,
            actif: editingDoc.actif
          })
          .eq('id', editingDoc.id);

        if (error) throw error;

        toast({
          title: "Document mis à jour",
          description: "Le document requis a été mis à jour avec succès"
        });
      } else {
        // Create new document
        const { error } = await supabase
          .from('guest_order_required_documents')
          .insert({
            nom_document: editingDoc.nom_document,
            ordre: editingDoc.ordre,
            obligatoire: editingDoc.obligatoire,
            actif: editingDoc.actif
          });

        if (error) throw error;

        toast({
          title: "Document créé",
          description: "Le document requis a été créé avec succès"
        });
      }

      setShowDialog(false);
      setEditingDoc(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    setLoading(true);

    const { error } = await supabase
      .from('guest_order_required_documents')
      .delete()
      .eq('id', docId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Document supprimé",
        description: "Le document requis a été supprimé avec succès"
      });
      await loadData();
    }

    setLoading(false);
  };

  const handleToggleActive = async (doc: RequiredDocument) => {
    const { error } = await supabase
      .from('guest_order_required_documents')
      .update({ actif: !doc.actif })
      .eq('id', doc.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive"
      });
    } else {
      await loadData();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'administration
        </Button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documents requis particuliers</h1>
            <p className="text-muted-foreground">
              Configurer les documents à demander aux particuliers
            </p>
          </div>
          <Button onClick={handleCreateDocument}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau document
          </Button>
        </div>

        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className={!doc.actif ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-lg">{doc.nom_document}</p>
                        {!doc.actif && <Badge variant="secondary">Inactif</Badge>}
                        {doc.obligatoire && <Badge variant="destructive">Obligatoire</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Ordre: {doc.ordre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={doc.actif}
                      onCheckedChange={() => handleToggleActive(doc)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDocument(doc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDoc?.id ? 'Modifier le document' : 'Nouveau document'}
              </DialogTitle>
              <DialogDescription>
                Configurez les détails du document requis
              </DialogDescription>
            </DialogHeader>

            {editingDoc && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du document *</Label>
                  <Input
                    id="nom"
                    value={editingDoc.nom_document}
                    onChange={(e) => setEditingDoc({ ...editingDoc, nom_document: e.target.value })}
                    placeholder="Ex: Carte d'identité (recto)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordre">Ordre d'affichage</Label>
                  <Input
                    id="ordre"
                    type="number"
                    value={editingDoc.ordre}
                    onChange={(e) => setEditingDoc({ ...editingDoc, ordre: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="obligatoire"
                    checked={editingDoc.obligatoire}
                    onCheckedChange={(checked) => setEditingDoc({ ...editingDoc, obligatoire: checked })}
                  />
                  <Label htmlFor="obligatoire">Document obligatoire</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="actif"
                    checked={editingDoc.actif}
                    onCheckedChange={(checked) => setEditingDoc({ ...editingDoc, actif: checked })}
                  />
                  <Label htmlFor="actif">Document actif</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveDocument}>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
