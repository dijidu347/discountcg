import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type GuestDemarcheType = {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  prix_base: number;
  ordre: number;
  actif: boolean;
  require_vehicle_info: boolean;
  require_carte_grise_price: boolean;
};

type RequiredDocument = {
  id: string;
  demarche_type_code: string;
  nom_document: string;
  ordre: number;
  obligatoire: boolean;
  actif: boolean;
};

type NewDocument = {
  nom: string;
  obligatoire: boolean;
};

export default function ManageGuestActions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actions, setActions] = useState<GuestDemarcheType[]>([]);
  const [documents, setDocuments] = useState<Record<string, RequiredDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingAction, setEditingAction] = useState<GuestDemarcheType | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newDocuments, setNewDocuments] = useState<NewDocument[]>([]);

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

    const { data: actionsData } = await supabase
      .from('guest_demarche_types')
      .select('*')
      .order('ordre');

    if (actionsData) {
      setActions(actionsData);

      const { data: docsData } = await supabase
        .from('guest_order_required_documents')
        .select('*')
        .order('ordre');

      if (docsData) {
        const docsByCode: Record<string, RequiredDocument[]> = {};
        docsData.forEach(doc => {
          const code = doc.demarche_type_code || '_none';
          if (!docsByCode[code]) {
            docsByCode[code] = [];
          }
          docsByCode[code].push(doc);
        });
        setDocuments(docsByCode);
      }
    }

    setLoading(false);
  };

  const handleCreateAction = () => {
    setEditingAction({
      id: '',
      code: '',
      titre: '',
      description: '',
      prix_base: 0,
      ordre: actions.length + 1,
      actif: true,
      require_vehicle_info: false,
      require_carte_grise_price: false,
    });
    setNewDocuments([{ nom: '', obligatoire: true }]);
    setShowDialog(true);
  };

  const handleEditAction = (action: GuestDemarcheType) => {
    setEditingAction(action);
    const docs = documents[action.code]?.map(d => ({ nom: d.nom_document, obligatoire: d.obligatoire })) || [{ nom: '', obligatoire: true }];
    setNewDocuments(docs);
    setShowDialog(true);
  };

  const handleSaveAction = async () => {
    if (!editingAction) return;

    if (!editingAction.code || !editingAction.titre) {
      toast({
        title: "Erreur",
        description: "Le code et le titre sont obligatoires",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (editingAction.id) {
        // Update existing
        const { error } = await supabase
          .from('guest_demarche_types')
          .update({
            titre: editingAction.titre,
            description: editingAction.description,
            prix_base: editingAction.prix_base,
            ordre: editingAction.ordre,
            actif: editingAction.actif,
            require_vehicle_info: editingAction.require_vehicle_info,
            require_carte_grise_price: editingAction.require_carte_grise_price,
          })
          .eq('id', editingAction.id);

        if (error) throw error;

        toast({ title: "Démarche mise à jour", description: "La démarche a été mise à jour avec succès" });
      } else {
        // Create new
        const { error } = await supabase
          .from('guest_demarche_types')
          .insert({
            code: editingAction.code,
            titre: editingAction.titre,
            description: editingAction.description,
            prix_base: editingAction.prix_base,
            ordre: editingAction.ordre,
            actif: editingAction.actif,
            require_vehicle_info: editingAction.require_vehicle_info,
            require_carte_grise_price: editingAction.require_carte_grise_price,
          });

        if (error) throw error;

        // Insert documents
        const docsToInsert = newDocuments
          .filter(d => d.nom.trim())
          .map((doc, idx) => ({
            demarche_type_code: editingAction.code,
            nom_document: doc.nom,
            ordre: idx + 1,
            obligatoire: doc.obligatoire,
            actif: true,
          }));

        if (docsToInsert.length > 0) {
          await supabase
            .from('guest_order_required_documents')
            .insert(docsToInsert);
        }

        toast({ title: "Démarche créée", description: "La démarche a été créée avec succès" });
      }

      setShowDialog(false);
      setEditingAction(null);
      setNewDocuments([]);
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

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette démarche ?")) return;

    setLoading(true);

    // Find the code to delete associated documents
    const action = actions.find(a => a.id === actionId);
    if (action) {
      await supabase
        .from('guest_order_required_documents')
        .delete()
        .eq('demarche_type_code', action.code);
    }

    const { error } = await supabase
      .from('guest_demarche_types')
      .delete()
      .eq('id', actionId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la démarche",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Démarche supprimée",
        description: "La démarche a été supprimée avec succès"
      });
      await loadData();
    }

    setLoading(false);
  };

  const addNewDocument = () => {
    setNewDocuments([...newDocuments, { nom: '', obligatoire: false }]);
  };

  const removeDocument = (index: number) => {
    setNewDocuments(newDocuments.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: 'nom' | 'obligatoire', value: string | boolean) => {
    const updated = [...newDocuments];
    if (field === 'nom') {
      updated[index].nom = value as string;
    } else {
      updated[index].obligatoire = value as boolean;
    }
    setNewDocuments(updated);
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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'administration
        </Button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Actions rapides Particuliers</h1>
            <p className="text-muted-foreground">
              Configurer les types de démarches particuliers, leurs prix et documents requis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action) => (
            <Card key={action.id} className={!action.actif ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {action.titre}
                      {!action.actif && <Badge variant="secondary">Inactif</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Code: <span className="font-mono font-bold">{action.code}</span>
                    </CardDescription>
                    <CardDescription className="text-2xl font-bold text-primary mt-2">
                      {action.prix_base}€
                    </CardDescription>
                    <div className="flex gap-1 mt-2">
                      {action.require_vehicle_info && <Badge variant="outline" className="text-xs">Véhicule requis</Badge>}
                      {action.require_carte_grise_price && <Badge variant="outline" className="text-xs">Prix régional</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {action.description && (
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                )}
                
                {/* Section documents masquée pour le moment */}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditAction(action)} className="flex-1">
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteAction(action.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAction?.id ? 'Modifier la démarche' : 'Nouvelle démarche'}
              </DialogTitle>
              <DialogDescription>
                Configurez les détails de la démarche particulier
              </DialogDescription>
            </DialogHeader>

            {editingAction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={editingAction.code}
                      onChange={(e) => setEditingAction({ ...editingAction, code: e.target.value.toUpperCase() })}
                      placeholder="CHGT_ADRESSE..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix">Prix base (€) *</Label>
                    <Input
                      id="prix"
                      type="number"
                      step="0.01"
                      value={editingAction.prix_base}
                      onChange={(e) => setEditingAction({ ...editingAction, prix_base: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={editingAction.titre}
                    onChange={(e) => setEditingAction({ ...editingAction, titre: e.target.value })}
                    placeholder="Changement d'adresse"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingAction.description || ''}
                    onChange={(e) => setEditingAction({ ...editingAction, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ordre">Ordre d'affichage</Label>
                    <Input
                      id="ordre"
                      type="number"
                      value={editingAction.ordre}
                      onChange={(e) => setEditingAction({ ...editingAction, ordre: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="actif"
                      checked={editingAction.actif}
                      onCheckedChange={(checked) => setEditingAction({ ...editingAction, actif: checked })}
                    />
                    <Label htmlFor="actif">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require_vehicle"
                      checked={editingAction.require_vehicle_info}
                      onCheckedChange={(checked) => setEditingAction({ ...editingAction, require_vehicle_info: checked })}
                    />
                    <Label htmlFor="require_vehicle">Infos véhicule requises</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require_cg_price"
                      checked={editingAction.require_carte_grise_price}
                      onCheckedChange={(checked) => setEditingAction({ ...editingAction, require_carte_grise_price: checked })}
                    />
                    <Label htmlFor="require_cg_price">Prix régional (taxe)</Label>
                  </div>
                </div>

                {/* Section documents masquée pour le moment */}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveAction} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
