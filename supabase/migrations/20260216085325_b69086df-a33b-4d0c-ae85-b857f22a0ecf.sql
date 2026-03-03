
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS absent_day text;

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL, -- 'shop' or 'employee'
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

