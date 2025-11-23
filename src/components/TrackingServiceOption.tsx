import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, CheckCircle, Zap, FileCheck } from "lucide-react";
interface TrackingServiceOptionProps {
  demarcheId: string;
  garageId: string;
  onPriceChange?: (price: number) => void;
}
export function TrackingServiceOption({
  demarcheId,
  garageId,
  onPriceChange
}: TrackingServiceOptionProps) {
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const {
    toast
  } = useToast();

  // Load existing services on mount
  useEffect(() => {
    const loadExistingServices = async () => {
      const {
        data
      } = await supabase.from('tracking_services').select('service_type, price').eq('demarche_id', demarcheId);
      if (data && data.length > 0) {
        setSelectedServices(data.map(s => s.service_type));
        const totalPrice = data.reduce((sum, s) => sum + (s.price || 0), 0);
        if (onPriceChange) {
          onPriceChange(totalPrice);
        }
      }
    };
    if (demarcheId) {
      loadExistingServices();
    }
  }, [demarcheId, onPriceChange]);
  const services = [{
    type: 'dossier_prioritaire',
    name: 'Dossier prioritaire',
    price: 5,
    icon: Zap,
    description: 'Traitement accéléré de votre dossier'
  }, {
    type: 'certificat_non_gage',
    name: 'Certificat de non gage',
    price: 10,
    icon: FileCheck,
    description: 'Obtention du certificat de non gage'
  }, {
    type: 'email',
    name: 'Suivi par email',
    price: 5,
    icon: Mail,
    description: 'Notifications à chaque étape par email'
  }, {
    type: 'phone',
    name: 'Suivi par SMS',
    price: 15,
    icon: Phone,
    description: 'SMS à chaque étape'
  }, {
    type: 'email_phone',
    name: 'Suivi complet',
    price: 18,
    icon: CheckCircle,
    description: 'Email + SMS'
  }];
  const handleSubscribe = async (serviceType: string, price: number) => {
    setLoading(true);
    try {
      // Insert new service
      const {
        error
      } = await supabase.from('tracking_services').insert({
        demarche_id: demarcheId,
        service_type: serviceType,
        price: price,
        status: 'pending'
      });
      if (error) throw error;
      
      const newSelectedServices = [...selectedServices, serviceType];
      setSelectedServices(newSelectedServices);

      // Calculate total price
      const totalPrice = services
        .filter(s => newSelectedServices.includes(s.type))
        .reduce((sum, s) => sum + s.price, 0);
      
      if (onPriceChange) {
        onPriceChange(totalPrice);
      }
      
      toast({
        title: "Service ajouté",
        description: "Le service de suivi a été ajouté à votre démarche"
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le service",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleRemove = async (serviceType: string) => {
    setLoading(true);
    try {
      // Delete the specific tracking service
      const {
        error
      } = await supabase.from('tracking_services').delete()
        .eq('demarche_id', demarcheId)
        .eq('service_type', serviceType);
      if (error) throw error;
      
      const newSelectedServices = selectedServices.filter(s => s !== serviceType);
      setSelectedServices(newSelectedServices);

      // Calculate new total price
      const totalPrice = services
        .filter(s => newSelectedServices.includes(s.type))
        .reduce((sum, s) => sum + s.price, 0);
      
      if (onPriceChange) {
        onPriceChange(totalPrice);
      }
      
      toast({
        title: "Service retiré",
        description: "Le service de suivi a été retiré"
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le service",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Card className="border-2 border-accent">
      <CardHeader>
        <CardTitle className="text-xl">Options</CardTitle>
        <CardDescription>
          Ajoutez des services optionnels à votre démarche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {services.map(service => {
            const Icon = service.icon;
            const isSelected = selectedServices.includes(service.type);
            return <div key={service.type} className={`border rounded-lg p-3 transition-all ${isSelected ? 'border-accent bg-accent/10' : 'border-border'}`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <Icon className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-0.5">{service.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-base">{service.price}€</p>
                      {isSelected ? <div className="flex items-center gap-1">
                          <Badge variant="default" className="text-xs">Activé</Badge>
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleRemove(service.type)} disabled={loading} className="h-7 text-xs px-2">
                            Retirer
                          </Button>
                        </div> : <Button type="button" size="sm" variant="outline" onClick={() => handleSubscribe(service.type, service.price)} disabled={loading} className="h-7 text-xs px-3">
                          Ajouter
                        </Button>}
                    </div>
                  </div>
                </div>;
          })}
        </div>
      </CardContent>
    </Card>;
}