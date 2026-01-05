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

type ActionRapide = {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  prix: number;
  couleur: string;
  ordre: number;
  actif: boolean;
  require_immatriculation: boolean;
  test_only: boolean;
};

type ActionDocument = {
  id: string;
  action_id: string;
  nom_document: string;
  ordre: number;
  obligatoire: boolean;
};

type NewDocument = {
  nom: string;
  obligatoire: boolean;
};

export default function ManageActions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actions, setActions] = useState<ActionRapide[]>([]);
  const [documents, setDocuments] = useState<Record<string, ActionDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionRapide | null>(null);
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
      .from('actions_rapides')
      .select('*')
      .order('ordre');

    if (actionsData) {
      setActions(actionsData);

      const { data: docsData } = await supabase
        .from('action_documents')
        .select('*')
        .order('ordre');

      if (docsData) {
        const docsByAction: Record<string, ActionDocument[]> = {};
        docsData.forEach(doc => {
          if (!docsByAction[doc.action_id]) {
            docsByAction[doc.action_id] = [];
          }
          docsByAction[doc.action_id].push(doc);
        });
        setDocuments(docsByAction);
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
      prix: 0,
      couleur: 'primary',
      ordre: actions.length + 1,
      actif: true,
      require_immatriculation: true,
      test_only: false
    });
    setNewDocuments([{ nom: '', obligatoire: true }]);
    setShowDialog(true);
  };

  const handleEditAction = (action: ActionRapide) => {
    setEditingAction(action);
    const docs = documents[action.id]?.map(d => ({ nom: d.nom_document, obligatoire: d.obligatoire })) || [{ nom: '', obligatoire: true }];
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
        // Update existing action
        const { error } = await supabase
          .from('actions_rapides')
          .update({
            code: editingAction.code,
            titre: editingAction.titre,
            description: editingAction.description,
            prix: editingAction.prix,
            couleur: editingAction.couleur,
            ordre: editingAction.ordre,
            actif: editingAction.actif,
            require_immatriculation: editingAction.require_immatriculation
          })
          .eq('id', editingAction.id);

        if (error) throw error;

        // Delete old documents
        await supabase
          .from('action_documents')
          .delete()
          .eq('action_id', editingAction.id);

        // Insert new documents
        const docsToInsert = newDocuments
          .filter(d => d.nom.trim())
          .map((doc, idx) => ({
            action_id: editingAction.id,
            nom_document: doc.nom,
            ordre: idx + 1,
            obligatoire: doc.obligatoire
          }));

        if (docsToInsert.length > 0) {
          await supabase
            .from('action_documents')
            .insert(docsToInsert);
        }

        toast({
          title: "Action mise à jour",
          description: "L'action rapide a été mise à jour avec succès"
        });
      } else {
        // Create new action
        const { data: newAction, error } = await supabase
          .from('actions_rapides')
          .insert({
            code: editingAction.code,
            titre: editingAction.titre,
            description: editingAction.description,
            prix: editingAction.prix,
            couleur: editingAction.couleur,
            ordre: editingAction.ordre,
            actif: editingAction.actif,
            require_immatriculation: editingAction.require_immatriculation
          })
          .select()
          .single();

        if (error) throw error;

        // Insert documents
        const docsToInsert = newDocuments
          .filter(d => d.nom.trim())
          .map((doc, idx) => ({
            action_id: newAction.id,
            nom_document: doc.nom,
            ordre: idx + 1,
            obligatoire: doc.obligatoire
          }));

        if (docsToInsert.length > 0) {
          await supabase
            .from('action_documents')
            .insert(docsToInsert);
        }

        toast({
          title: "Action créée",
          description: "L'action rapide a été créée avec succès"
        });
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette action ?")) return;

    setLoading(true);

    const { error } = await supabase
      .from('actions_rapides')
      .delete()
      .eq('id', actionId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'action",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Action supprimée",
        description: "L'action rapide a été supprimée avec succès"
      });
      await loadData();
    }

    setLoading(false);
  };

  const addNewDocument = () => {
    setNewDocuments([...newDocuments, { nom: '', obligatoire: false }]);
  };

  const removeDocument = (index: number) => {
    if (index === 0) {
      toast({
        title: "Impossible de supprimer",
        description: "Le premier document est obligatoire",
        variant: "destructive"
      });
      return;
    }
    setNewDocuments(newDocuments.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: 'nom' | 'obligatoire', value: string | boolean) => {
    const updated = [...newDocuments];
    if (field === 'nom') {
      updated[index].nom = value as string;
    } else {
      // First document is always required
      if (index === 0) return;
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
            <h1 className="text-3xl font-bold mb-2">Gérer les actions rapides</h1>
            <p className="text-muted-foreground">
              Configurer les types de démarches, leurs prix et documents requis
            </p>
          </div>
          <Button onClick={handleCreateAction}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle action
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.filter(action => !action.test_only || user?.email === 'test@test.com').map((action) => (
            <Card key={action.id} className={!action.actif ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {action.titre}
                      {!action.actif && <Badge variant="secondary">Inactif</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Code: <span className="font-mono font-bold">{action.code}</span>
                    </CardDescription>
                    <CardDescription className="text-2xl font-bold text-primary mt-2">
                      {action.prix}€
                    </CardDescription>
                  </div>
                  <div 
                    className="h-6 w-6 rounded-full border border-border shadow-sm" 
                    style={{ backgroundColor: action.couleur.startsWith('#') ? action.couleur : '#3b82f6' }}
                    title={action.couleur}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {action.description && (
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                )}
                
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">
                    Documents requis ({documents[action.id]?.length || 0})
                  </p>
                  <ul className="text-xs space-y-1">
                    {documents[action.id]?.slice(0, 3).map((doc) => (
                      <li key={doc.id} className="text-muted-foreground">
                        • {doc.nom_document}
                      </li>
                    ))}
                    {(documents[action.id]?.length || 0) > 3 && (
                      <li className="text-muted-foreground italic">
                        ... et {documents[action.id].length - 3} autres
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAction(action)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAction(action.id)}
                  >
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
                {editingAction?.id ? 'Modifier l\'action' : 'Nouvelle action'}
              </DialogTitle>
              <DialogDescription>
                Configurez les détails de l'action rapide
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
                      placeholder="DA, DC, CG..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prix">Prix (€) *</Label>
                    <Input
                      id="prix"
                      type="number"
                      value={editingAction.prix}
                      onChange={(e) => setEditingAction({ ...editingAction, prix: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={editingAction.titre}
                    onChange={(e) => setEditingAction({ ...editingAction, titre: e.target.value })}
                    placeholder="Déclaration d'achat"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingAction.description || ''}
                    onChange={(e) => setEditingAction({ ...editingAction, description: e.target.value })}
                    placeholder="Certificat de cession, déclaration d'achat"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="couleur">Couleur</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { name: 'Bleu', color: '#3b82f6' },
                        { name: 'Vert', color: '#22c55e' },
                        { name: 'Rouge', color: '#ef4444' },
                        { name: 'Orange', color: '#f97316' },
                        { name: 'Violet', color: '#8b5cf6' },
                        { name: 'Rose', color: '#ec4899' },
                        { name: 'Cyan', color: '#06b6d4' },
                        { name: 'Jaune', color: '#eab308' },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setEditingAction({ ...editingAction, couleur: preset.color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${editingAction.couleur === preset.color ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent'}`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="couleur"
                        value={editingAction.couleur.startsWith('#') ? editingAction.couleur : '#3b82f6'}
                        onChange={(e) => setEditingAction({ ...editingAction, couleur: e.target.value })}
                        className="h-10 w-16 cursor-pointer rounded border border-input bg-background"
                      />
                      <Input
                        value={editingAction.couleur}
                        onChange={(e) => setEditingAction({ ...editingAction, couleur: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

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

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="actif"
                      checked={editingAction.actif}
                      onCheckedChange={(checked) => setEditingAction({ ...editingAction, actif: checked })}
                    />
                    <Label htmlFor="actif">Action active</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require_immat"
                      checked={editingAction.require_immatriculation}
                      onCheckedChange={(checked) => setEditingAction({ ...editingAction, require_immatriculation: checked })}
                    />
                    <Label htmlFor="require_immat">Immatriculation requise</Label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label>Documents requis</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addNewDocument}>
                      <Plus className="mr-2 h-3 w-3" />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {newDocuments.map((doc, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={doc.nom}
                            onChange={(e) => updateDocument(idx, 'nom', e.target.value)}
                            placeholder="Nom du document"
                          />
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`obligatoire-${idx}`}
                              checked={doc.obligatoire}
                              onCheckedChange={(checked) => updateDocument(idx, 'obligatoire', checked)}
                              disabled={idx === 0}
                            />
                            <Label htmlFor={`obligatoire-${idx}`} className="text-sm text-muted-foreground">
                              {idx === 0 ? 'Obligatoire (toujours)' : 'Obligatoire'}
                            </Label>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(idx)}
                          disabled={idx === 0}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
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