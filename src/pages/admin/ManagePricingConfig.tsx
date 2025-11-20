import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Calculator, Plus, Trash2, Edit, X, GripVertical, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface PricingConfig {
  id: string;
  config_key: string;
  config_value: number;
  description: string;
}

type RequiredDocument = {
  id: string;
  nom_document: string;
  ordre: number;
  obligatoire: boolean;
  actif: boolean;
};

const ManagePricingConfig = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RequiredDocument | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_config")
        .select("*")
        .order("config_key");

      if (error) throw error;
      setConfigs(data || []);

      const { data: docsData } = await supabase
        .from('guest_order_required_documents')
        .select('*')
        .order('ordre');

      if (docsData) {
        setDocuments(docsData);
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration des tarifs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const config of configs) {
        const { error } = await supabase
          .from("pricing_config")
          .update({ config_value: config.config_value })
          .eq("id", config.id);

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "Les tarifs ont été mis à jour",
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les tarifs",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setConfigs(
      configs.map((config) =>
        config.id === id
          ? { ...config, config_value: parseFloat(value) || 0 }
          : config
      )
    );
  };

  const getConfigLabel = (key: string) => {
    const labels: Record<string, string> = {
      prix_par_cv: "Prix par CV fiscal (€)",
      taxe_co2_seuil: "Seuil CO2 (g/km)",
      taxe_co2_montant: "Taxe CO2 par g (€)",
      frais_acheminement: "Frais d'acheminement (€)",
      taxe_gestion: "Taxe de gestion (€)",
      frais_dossier: "Frais de dossier (€)",
    };
    return labels[key] || key;
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

    setSaving(true);

    try {
      if (editingDoc.id) {
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
      await loadConfigs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    setSaving(true);

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
      await loadConfigs();
    }

    setSaving(false);
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
      await loadConfigs();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Simulateur Particulier</CardTitle>
                <CardDescription>
                  Gérez les tarifs utilisés pour le calcul du prix des cartes grises
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              {configs.map((config) => (
                <div key={config.id} className="space-y-2">
                  <Label htmlFor={config.config_key}>
                    {getConfigLabel(config.config_key)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={config.config_key}
                      type="number"
                      step="0.01"
                      value={config.config_value}
                      onChange={(e) =>
                        handleValueChange(config.id, e.target.value)
                      }
                      className="max-w-xs"
                    />
                    {config.description && (
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Comment sont calculés les prix ?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>• <strong>Prix par CV fiscal :</strong> Multiplié par la puissance fiscale du véhicule</p>
            <p>• <strong>Taxe CO2 :</strong> Si CO2 &gt; seuil, taxe = (CO2 - seuil) × montant par gramme</p>
            <p>• <strong>Frais fixes :</strong> Acheminement + Taxe de gestion (ajoutés systématiquement)</p>
            <p>• <strong>Frais de dossier :</strong> Ajoutés au montant total pour les commandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Documents requis particuliers</CardTitle>
                  <CardDescription>
                    Configurer les documents à demander aux particuliers
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleCreateDocument} disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id} className={!doc.actif ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{doc.nom_document}</p>
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
          </CardContent>
        </Card>
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
            <Button onClick={handleSaveDocument} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePricingConfig;
