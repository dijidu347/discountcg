import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, CheckCircle } from "lucide-react";

interface TrackingServiceOptionProps {
  demarcheId: string;
  garageId: string;
  onPriceChange?: (price: number) => void;
}

export function TrackingServiceOption({ demarcheId, garageId, onPriceChange }: TrackingServiceOptionProps) {
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { toast } = useToast();

  // Load existing service on mount
  useEffect(() => {
    const loadExistingService = async () => {
      const { data } = await supabase
        .from('tracking_services')
        .select('service_type, price')
        .eq('demarche_id', demarcheId)
        .maybeSingle();

      if (data) {
        setSelectedService(data.service_type);
        if (onPriceChange && data.price) {
          onPriceChange(data.price);
        }
      }
    };

    if (demarcheId) {
      loadExistingService();
    }
  }, [demarcheId, onPriceChange]);

  const services = [
    { 
      type: 'email', 
      name: 'Suivi par email', 
      price: 5, 
      icon: Mail,
      description: 'Notifications quotidiennes par email' 
    },
    { 
      type: 'phone', 
      name: 'Suivi par téléphone', 
      price: 15, 
      icon: Phone,
      description: 'Appel de suivi personnalisé' 
    },
    { 
      type: 'email_phone', 
      name: 'Suivi complet', 
      price: 18, 
      icon: CheckCircle,
      description: 'Email + téléphone' 
    },
  ];

  const handleSubscribe = async (serviceType: string, price: number) => {
    setLoading(true);

    try {
      // Check if a service already exists for this demarche
      const { data: existingService } = await supabase
        .from('tracking_services')
        .select('id')
        .eq('demarche_id', demarcheId)
        .maybeSingle();

      if (existingService) {
        // Update existing service
        const { error } = await supabase
          .from('tracking_services')
          .update({
            service_type: serviceType,
            price: price,
            status: 'pending'
          })
          .eq('id', existingService.id);

        if (error) throw error;
      } else {
        // Insert new service
        const { error } = await supabase
          .from('tracking_services')
          .insert({
            demarche_id: demarcheId,
            service_type: serviceType,
            price: price,
            status: 'pending'
          });

        if (error) throw error;
      }

      setSelectedService(serviceType);
      
      // Notify parent of price change
      if (onPriceChange) {
        onPriceChange(price);
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

  const handleRemove = async () => {
    setLoading(true);

    try {
      // Delete the tracking service
      const { error } = await supabase
        .from('tracking_services')
        .delete()
        .eq('demarche_id', demarcheId);

      if (error) throw error;

      setSelectedService(null);
      
      // Reset price to 0
      if (onPriceChange) {
        onPriceChange(0);
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

  return (
    <Card className="border-2 border-accent">
      <CardHeader>
        <CardTitle className="text-xl">Ventes additionnelles</CardTitle>
        <CardDescription>
          Ajoutez des services optionnels à votre démarche
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.type}
              className={`border rounded-lg p-4 transition-all ${
                selectedService === service.type ? 'border-accent bg-accent/10' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">{service.name}</h4>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col gap-2">
                  <p className="font-bold text-lg">{service.price}€</p>
                  {selectedService === service.type ? (
                    <div className="flex flex-col gap-1">
                      <Badge className="bg-accent">Activé</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleRemove}
                        disabled={loading}
                      >
                        Retirer
                      </Button>
                    </div>
                  ) : (
                  <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubscribe(service.type, service.price)}
                      disabled={loading}
                    >
                      Ajouter
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
