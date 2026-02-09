
-- Table for admin announcements displayed on garage dashboards
CREATE TABLE public.admin_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, error
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage announcements"
ON public.admin_announcements FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Garages can read active announcements
CREATE POLICY "Garages can read active announcements"
ON public.admin_announcements FOR SELECT
USING (public.has_role(auth.uid(), 'garage') AND active = true AND now() BETWEEN starts_at AND ends_at);

-- Trigger for updated_at
CREATE TRIGGER update_admin_announcements_updated_at
BEFORE UPDATE ON public.admin_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
