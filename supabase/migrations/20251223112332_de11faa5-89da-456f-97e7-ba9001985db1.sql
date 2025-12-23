-- Table pour les questions liées aux actions
CREATE TABLE public.action_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions_rapides(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  blocking_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les options de réponse aux questions
CREATE TABLE public.action_question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.action_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  blocking_message TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les documents conditionnels basés sur les réponses
CREATE TABLE public.action_conditional_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES public.action_question_options(id) ON DELETE CASCADE,
  nom_document TEXT NOT NULL,
  obligatoire BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_conditional_documents ENABLE ROW LEVEL SECURITY;

-- Policies pour action_questions
CREATE POLICY "Admins can manage questions" ON public.action_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view questions for active actions" ON public.action_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM actions_rapides WHERE actions_rapides.id = action_questions.action_id AND (actions_rapides.actif = true OR has_role(auth.uid(), 'admin'::app_role)))
);

-- Policies pour action_question_options
CREATE POLICY "Admins can manage options" ON public.action_question_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view options" ON public.action_question_options FOR SELECT USING (true);

-- Policies pour action_conditional_documents
CREATE POLICY "Admins can manage conditional docs" ON public.action_conditional_documents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view conditional docs" ON public.action_conditional_documents FOR SELECT USING (true);