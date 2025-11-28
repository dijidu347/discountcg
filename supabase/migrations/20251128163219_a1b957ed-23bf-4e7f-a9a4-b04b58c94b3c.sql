-- Create department_tariffs table to store editable department tariffs
CREATE TABLE public.department_tariffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  tarif NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.department_tariffs ENABLE ROW LEVEL SECURITY;

-- Everyone can view tariffs
CREATE POLICY "Everyone can view department tariffs" 
ON public.department_tariffs 
FOR SELECT 
USING (true);

-- Admins can manage tariffs
CREATE POLICY "Admins can manage department tariffs" 
ON public.department_tariffs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert all department tariffs
INSERT INTO public.department_tariffs (code, label, tarif) VALUES
('01', 'Ain', 43.00),
('02', 'Aisne', 42.00),
('03', 'Allier', 43.00),
('04', 'Alpes-de-Haute-Provence', 59.00),
('05', 'Hautes-Alpes', 59.00),
('06', 'Alpes-Maritimes', 59.00),
('07', 'Ardèche', 43.00),
('08', 'Ardennes', 60.00),
('09', 'Ariège', 59.50),
('10', 'Aube', 60.00),
('11', 'Aude', 59.50),
('12', 'Aveyron', 59.50),
('13', 'Bouches-du-Rhône', 59.00),
('14', 'Calvados', 60.00),
('15', 'Cantal', 43.00),
('16', 'Charente', 53.00),
('17', 'Charente-Maritime', 53.00),
('18', 'Cher', 60.00),
('19', 'Corrèze', 53.00),
('2A', 'Corse-du-Sud', 43.00),
('2B', 'Haute-Corse', 43.00),
('21', 'Côte-d''Or', 60.00),
('22', 'Côtes-d''Armor', 60.00),
('23', 'Creuse', 53.00),
('24', 'Dordogne', 53.00),
('25', 'Doubs', 60.00),
('26', 'Drôme', 43.00),
('27', 'Eure', 60.00),
('28', 'Eure-et-Loir', 60.00),
('29', 'Finistère', 60.00),
('30', 'Gard', 59.50),
('31', 'Haute-Garonne', 59.50),
('32', 'Gers', 59.50),
('33', 'Gironde', 53.00),
('34', 'Hérault', 59.50),
('35', 'Ille-et-Vilaine', 60.00),
('36', 'Indre', 60.00),
('37', 'Indre-et-Loire', 60.00),
('38', 'Isère', 43.00),
('39', 'Jura', 60.00),
('40', 'Landes', 53.00),
('41', 'Loir-et-Cher', 60.00),
('42', 'Loire', 43.00),
('43', 'Haute-Loire', 43.00),
('44', 'Loire-Atlantique', 51.00),
('45', 'Loiret', 60.00),
('46', 'Lot', 59.50),
('47', 'Lot-et-Garonne', 53.00),
('48', 'Lozère', 59.50),
('49', 'Maine-et-Loire', 51.00),
('50', 'Manche', 60.00),
('51', 'Marne', 60.00),
('52', 'Haute-Marne', 60.00),
('53', 'Mayenne', 51.00),
('54', 'Meurthe-et-Moselle', 60.00),
('55', 'Meuse', 60.00),
('56', 'Morbihan', 60.00),
('57', 'Moselle', 60.00),
('58', 'Nièvre', 60.00),
('59', 'Nord', 42.00),
('60', 'Oise', 42.00),
('61', 'Orne', 60.00),
('62', 'Pas-de-Calais', 42.00),
('63', 'Puy-de-Dôme', 43.00),
('64', 'Pyrénées-Atlantiques', 53.00),
('65', 'Hautes-Pyrénées', 59.50),
('66', 'Pyrénées-Orientales', 59.50),
('67', 'Bas-Rhin', 60.00),
('68', 'Haut-Rhin', 60.00),
('69', 'Rhône', 43.00),
('70', 'Haute-Saône', 60.00),
('71', 'Saône-et-Loire', 60.00),
('72', 'Sarthe', 51.00),
('73', 'Savoie', 43.00),
('74', 'Haute-Savoie', 43.00),
('75', 'Paris', 54.95),
('76', 'Seine-Maritime', 60.00),
('77', 'Seine-et-Marne', 54.95),
('78', 'Yvelines', 54.95),
('79', 'Deux-Sèvres', 53.00),
('80', 'Somme', 42.00),
('81', 'Tarn', 59.50),
('82', 'Tarn-et-Garonne', 59.50),
('83', 'Var', 59.00),
('84', 'Vaucluse', 59.00),
('85', 'Vendée', 51.00),
('86', 'Vienne', 53.00),
('87', 'Haute-Vienne', 53.00),
('88', 'Vosges', 60.00),
('89', 'Yonne', 60.00),
('90', 'Territoire de Belfort', 60.00),
('91', 'Essonne', 54.95),
('92', 'Hauts-de-Seine', 54.95),
('93', 'Seine-Saint-Denis', 54.95),
('94', 'Val-de-Marne', 54.95),
('95', 'Val-d''Oise', 54.95),
('971', 'Guadeloupe', 41.00),
('972', 'Martinique', 53.00),
('973', 'Guyane', 42.50),
('974', 'La Réunion', 57.00),
('976', 'Mayotte', 30.00);

-- Delete the old useless pricing configs
DELETE FROM public.pricing_config WHERE config_key IN ('acheminement', 'frais_dossier_default', 'prix_par_cv', 'taxe_co2_par_g', 'seuil_co2', 'taxe_gestion');