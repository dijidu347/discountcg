import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Calculator, Plus, Trash2, Edit, GripVertical, FileText, Package, Euro } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PricingConfig {
  id: string;
  config_key: string;
  config_value: number;
  description: string;
}

interface DemarcheType {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  prix_base: number;
  actif: boolean;
  ordre: number;
  require_vehicle_info: boolean;
  require_carte_grise_price: boolean;
}

type RequiredDocument = {
  id: string;
  nom_document: string;
  ordre: number;
  obligatoire: boolean;
  actif: boolean;
  demarche_type_code: string | null;
};

const ManagePricingConfig = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [demarcheTypes, setDemarcheTypes] = useState<DemarcheType[]>([]);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RequiredDocument | null>(null);
  const [editingType, setEditingType] = useState<DemarcheType | null>(null);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configsRes, typesRes, docsRes] = await Promise.all([
        supabase.from("pricing_config").select("*").order("config_key"),
        supabase.from("guest_demarche_types").select("*").order("ordre"),
        supabase.from("guest_order_required_documents").select("*").order("ordre")
      ]);

      if (configsRes.error) throw configsRes.error;
      if (typesRes.error) throw typesRes.error;

      setConfigs(configsRes.data || []);
      setDemarcheTypes(typesRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfigs = async () => {
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
      frais_dossier: "Frais de dossier par défaut (€)",
    };
    return labels[key] || key;
  };

  // === DEMARCHE TYPES ===
  const handleCreateType = () => {
    setEditingType({
      id: '',
      code: '',
      titre: '',
      description: '',
      prix_base: 0,
      actif: true,
      ordre: demarcheTypes.length + 1,
      require_vehicle_info: true,
      require_carte_grise_price: false
    });
    setShowTypeDialog(true);
  };

  const handleEditType = (type: DemarcheType) => {
    setEditingType(type);
    setShowTypeDialog(true);
  };

  const handleSaveType = async () => {
    if (!editingType) return;

    if (!editingType.code.trim() || !editingType.titre.trim()) {
      toast({
        title: "Erreur",
        description: "Le code et le titre sont obligatoires",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      if (editingType.id) {
        const { error } = await supabase
          .from('guest_demarche_types')
          .update({
            code: editingType.code,
            titre: editingType.titre,
            description: editingType.description,
            prix_base: editingType.prix_base,
            actif: editingType.actif,
            ordre: editingType.ordre,
            require_vehicle_info: editingType.require_vehicle_info,
            require_carte_grise_price: editingType.require_carte_grise_price
          })
          .eq('id', editingType.id);

        if (error) throw error;

        toast({
          title: "Type mis à jour",
          description: "Le type de démarche a été mis à jour"
        });
      } else {
        const { error } = await supabase
          .from('guest_demarche_types')
          .insert({
            code: editingType.code,
            titre: editingType.titre,
            description: editingType.description,
            prix_base: editingType.prix_base,
            actif: editingType.actif,
            ordre: editingType.ordre,
            require_vehicle_info: editingType.require_vehicle_info,
            require_carte_grise_price: editingType.require_carte_grise_price
          });

        if (error) throw error;

        toast({
          title: "Type créé",
          description: "Le type de démarche a été créé"
        });
      }

      setShowTypeDialog(false);
      setEditingType(null);
      await loadData();
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

  const handleDeleteType = async (typeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type de démarche ?")) return;

    setSaving(true);

    const { error } = await supabase
      .from('guest_demarche_types')
      .delete()
      .eq('id', typeId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le type",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Type supprimé",
        description: "Le type de démarche a été supprimé"
      });
      await loadData();
    }

    setSaving(false);
  };

  const handleToggleTypeActive = async (type: DemarcheType) => {
    const { error } = await supabase
      .from('guest_demarche_types')
      .update({ actif: !type.actif })
      .eq('id', type.id);

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

  // === DOCUMENTS ===
  const handleCreateDocument = () => {
    setEditingDoc({
      id: '',
      nom_document: '',
      ordre: documents.length + 1,
      obligatoire: true,
      actif: true,
      demarche_type_code: selectedTypeFilter !== 'all' ? selectedTypeFilter : 'CG'
    });
    setShowDocDialog(true);
  };

  const handleEditDocument = (doc: RequiredDocument) => {
    setEditingDoc(doc);
    setShowDocDialog(true);
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
            actif: editingDoc.actif,
            demarche_type_code: editingDoc.demarche_type_code
          })
          .eq('id', editingDoc.id);

        if (error) throw error;

        toast({
          title: "Document mis à jour",
          description: "Le document requis a été mis à jour"
        });
      } else {
        const { error } = await supabase
          .from('guest_order_required_documents')
          .insert({
            nom_document: editingDoc.nom_document,
            ordre: editingDoc.ordre,
            obligatoire: editingDoc.obligatoire,
            actif: editingDoc.actif,
            demarche_type_code: editingDoc.demarche_type_code
          });

        if (error) throw error;

        toast({
          title: "Document créé",
          description: "Le document requis a été créé"
        });
      }

      setShowDocDialog(false);
      setEditingDoc(null);
      await loadData();
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
        description: "Le document requis a été supprimé"
      });
      await loadData();
    }

    setSaving(false);
  };

  const handleToggleDocActive = async (doc: RequiredDocument) => {
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

  const filteredDocuments = selectedTypeFilter === 'all' 
    ? documents 
    : documents.filter(d => d.demarche_type_code === selectedTypeFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au dashboard
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Simulateur Particulier</h1>
            <p className="text-muted-foreground">
              Gérez les types de démarches, tarifs et documents requis pour les particuliers
            </p>
          </div>
        </div>

        <Tabs defaultValue="types" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="types" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Types de démarches
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents requis
            </TabsTrigger>
            <TabsTrigger value="tarifs" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Tarifs globaux
            </TabsTrigger>
          </TabsList>

          {/* TYPES DE DEMARCHES */}
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Types de démarches particuliers</CardTitle>
                    <CardDescription>
                      Configurez les différents types de démarches disponibles (CG, DA, DC) avec leurs prix
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateType} disabled={saving}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demarcheTypes.map((type) => (
                    <Card key={type.id} className={!type.actif ? 'opacity-60' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-mono">{type.code}</Badge>
                                <p className="font-medium">{type.titre}</p>
                                {!type.actif && <Badge variant="secondary">Inactif</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="font-semibold text-primary">{type.prix_base.toFixed(2)} € HT</span>
                                {type.require_carte_grise_price && (
                                  <Badge variant="secondary">+ Prix carte grise</Badge>
                                )}
                                <span className="text-muted-foreground">
                                  {documents.filter(d => d.demarche_type_code === type.code && d.actif).length} documents
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={type.actif}
                              onCheckedChange={() => handleToggleTypeActive(type)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditType(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteType(type.id)}
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
          </TabsContent>

          {/* DOCUMENTS REQUIS */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Documents requis par type de démarche</CardTitle>
                    <CardDescription>
                      Configurez les documents à demander pour chaque type de démarche
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrer par type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {demarcheTypes.map(type => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.code} - {type.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateDocument} disabled={saving}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau document
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredDocuments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun document configuré pour ce type de démarche
                    </p>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <Card key={doc.id} className={!doc.actif ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <GripVertical className="w-5 h-5 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{doc.nom_document}</p>
                                  {!doc.actif && <Badge variant="secondary">Inactif</Badge>}
                                  {doc.obligatoire && <Badge variant="destructive">Obligatoire</Badge>}
                                  {doc.demarche_type_code && (
                                    <Badge variant="outline">{doc.demarche_type_code}</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">Ordre: {doc.ordre}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={doc.actif}
                                onCheckedChange={() => handleToggleDocActive(doc)}
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
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TARIFS GLOBAUX */}
          <TabsContent value="tarifs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tarifs globaux (calcul carte grise)</CardTitle>
                <CardDescription>
                  Ces tarifs sont utilisés pour calculer le prix de la carte grise régionale
                </CardDescription>
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
                  <Button onClick={handleSaveConfigs} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Enregistrement..." : "Enregistrer les tarifs"}
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
                <p>• <strong>Prix de base démarche :</strong> Ajouté selon le type de démarche sélectionné</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Type de démarche */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType?.id ? 'Modifier le type' : 'Nouveau type de démarche'}
            </DialogTitle>
            <DialogDescription>
              Configurez les détails du type de démarche
            </DialogDescription>
          </DialogHeader>

          {editingType && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={editingType.code}
                    onChange={(e) => setEditingType({ ...editingType, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: CG, DA, DC"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix">Prix de base (€ HT) *</Label>
                  <Input
                    id="prix"
                    type="number"
                    step="0.01"
                    value={editingType.prix_base}
                    onChange={(e) => setEditingType({ ...editingType, prix_base: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titre">Titre *</Label>
                <Input
                  id="titre"
                  value={editingType.titre}
                  onChange={(e) => setEditingType({ ...editingType, titre: e.target.value })}
                  placeholder="Ex: Carte Grise (Changement de titulaire)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingType.description || ''}
                  onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
                  placeholder="Description de la démarche..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordre">Ordre d'affichage</Label>
                <Input
                  id="ordre"
                  type="number"
                  value={editingType.ordre}
                  onChange={(e) => setEditingType({ ...editingType, ordre: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="require_vehicle"
                    checked={editingType.require_vehicle_info}
                    onCheckedChange={(checked) => setEditingType({ ...editingType, require_vehicle_info: checked })}
                  />
                  <Label htmlFor="require_vehicle">Nécessite les infos véhicule</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="require_cg_price"
                    checked={editingType.require_carte_grise_price}
                    onCheckedChange={(checked) => setEditingType({ ...editingType, require_carte_grise_price: checked })}
                  />
                  <Label htmlFor="require_cg_price">Inclut le prix carte grise (taxe régionale)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="actif"
                    checked={editingType.actif}
                    onCheckedChange={(checked) => setEditingType({ ...editingType, actif: checked })}
                  />
                  <Label htmlFor="actif">Type actif</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveType} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Document */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
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
                  placeholder="Ex: Carte d'identité (recto/verso)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_code">Type de démarche</Label>
                <Select 
                  value={editingDoc.demarche_type_code || ''} 
                  onValueChange={(value) => setEditingDoc({ ...editingDoc, demarche_type_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {demarcheTypes.map(type => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.code} - {type.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>
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