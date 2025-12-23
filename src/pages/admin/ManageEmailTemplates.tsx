import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save, Mail } from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  html_content: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const ManageEmailTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("type");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      toast.error("Erreur lors du chargement des templates");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedContent(template.html_content);
    setEditedDescription(template.description || "");
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: editedSubject,
          html_content: editedContent,
          description: editedDescription,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template mis à jour avec succès");
      loadTemplates();
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error("Error updating template:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    // Replace variables with example data for preview
    let html = template.html_content;
    const replacements = {
      "{{tracking_number}}": "TRK-2025-000123",
      "{{prenom}}": "Jean",
      "{{nom}}": "Dupont",
      "{{immatriculation}}": "AB-123-CD",
      "{{montant_ttc}}": "149.90",
      "{{marque}}": "Renault",
      "{{modele}}": "Clio",
      "{{tracking_url}}": "https://votresite.fr/suivi/TRK-2025-000123",
    };

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(key, "g"), value);
    });

    setPreviewHtml(html);
  };

  const getTemplateLabel = (type: string) => {
    const labels: Record<string, string> = {
      order_confirmation: "Confirmation de commande",
      payment_confirmed: "Paiement confirmé",
      documents_received: "Documents reçus",
      processing: "En traitement",
      completed: "Dossier finalisé",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gestion des Templates Email</h1>
              <p className="text-muted-foreground">
                Personnalisez les emails envoyés automatiquement
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {getTemplateLabel(template.type)}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Sujet</Label>
                  <p className="text-sm font-medium truncate">{template.subject}</p>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Prévisualiser
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Prévisualisation - {getTemplateLabel(template.type)}</DialogTitle>
                        <DialogDescription>
                          Aperçu avec des données d'exemple
                        </DialogDescription>
                      </DialogHeader>
                      <div
                        className="border rounded-lg p-4 bg-white"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                      />
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={selectedTemplate?.id === template.id}
                    onOpenChange={(open) => !open && setSelectedTemplate(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(template)}
                      >
                        Modifier
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Modifier le template - {getTemplateLabel(template.type)}</DialogTitle>
                        <DialogDescription>
                          Utilisez les variables : {"{"}
                          {"{"}tracking_number{"}"}
                          {"}"}, {"{"}
                          {"{"}prenom{"}"}
                          {"}"}, {"{"}
                          {"{"}nom{"}"}
                          {"}"}, {"{"}
                          {"{"}immatriculation{"}"}
                          {"}"}, {"{"}
                          {"{"}montant_ttc{"}"}
                          {"}"}, {"{"}
                          {"{"}marque{"}"}
                          {"}"}, {"{"}
                          {"{"}modele{"}"}
                          {"}"}, {"{"}
                          {"{"}tracking_url{"}"}
                          {"}"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            placeholder="Description du template"
                          />
                        </div>
                        <div>
                          <Label>Sujet de l'email</Label>
                          <Input
                            value={editedSubject}
                            onChange={(e) => setEditedSubject(e.target.value)}
                            placeholder="Sujet de l'email"
                          />
                        </div>
                        <div>
                          <Label>Contenu HTML</Label>
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder="Contenu HTML de l'email"
                            className="min-h-[400px] font-mono text-sm"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                            Annuler
                          </Button>
                          <Button onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Variables disponibles</CardTitle>
            <CardDescription>
              Utilisez ces variables dans vos templates pour personnaliser les emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { var: "{{tracking_number}}", desc: "Numéro de suivi" },
                { var: "{{prenom}}", desc: "Prénom du client" },
                { var: "{{nom}}", desc: "Nom du client" },
                { var: "{{immatriculation}}", desc: "Immatriculation" },
                { var: "{{montant_ttc}}", desc: "Montant TTC" },
                { var: "{{marque}}", desc: "Marque du véhicule" },
                { var: "{{modele}}", desc: "Modèle du véhicule" },
                { var: "{{tracking_url}}", desc: "URL de suivi" },
              ].map((item) => (
                <div key={item.var} className="space-y-1">
                  <code className="text-xs bg-background px-2 py-1 rounded">{item.var}</code>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageEmailTemplates;
