-- Allow garages to delete their own rejected verification documents
CREATE POLICY "Garages can delete their own rejected verification documents"
ON public.verification_documents
FOR DELETE
USING (
  status = 'rejected' 
  AND garage_id IN (
    SELECT id FROM garages WHERE user_id = auth.uid()
  )
);