-- Autorise un particulier connecté à lire les documents de SES propres commandes.
-- Nécessaire pour la pastille "Document refusé" dans MonEspace (requête directe
-- sur guest_order_documents filtrée sur validation_status='rejected').
-- Sans elle, un utilisateur authenticated non-admin ne voit AUCUN document.
CREATE POLICY "Owners can view their guest order documents"
ON public.guest_order_documents
FOR SELECT
TO authenticated
USING (
  order_id IN (SELECT id FROM public.guest_orders WHERE user_id = auth.uid())
);
