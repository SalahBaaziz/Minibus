-- Add payment tracking columns to enquiries table
ALTER TABLE public.enquiries 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;