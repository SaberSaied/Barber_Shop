CREATE POLICY "Allow full access to admin users"
ON expenses
FOR ALL
TO authenticated
USING (
  (SELECT has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (SELECT has_role(auth.uid(), 'admin'))
);

ALTER TABLE public.bills
ADD COLUMN barber_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;