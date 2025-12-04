-- Ajouter la politique RLS pour permettre aux admins de modifier les garages
CREATE POLICY "Admins can update all garages"
ON public.garages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));