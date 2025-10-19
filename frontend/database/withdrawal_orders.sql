-- Withdrawal Orders Table
CREATE TABLE public.withdrawal_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_method_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency character varying DEFAULT 'ETB'::character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  withdrawal_method character varying NOT NULL, -- 'bank_transfer', 'mobile_money', 'cash_pickup'
  withdrawal_details jsonb, -- Store method-specific details like account number, phone number, etc.
  processing_fee numeric DEFAULT 0,
  net_amount numeric NOT NULL, -- amount - processing_fee
  admin_notes text,
  processed_by uuid, -- admin who processed the withdrawal
  processed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT withdrawal_orders_pkey PRIMARY KEY (id),
  CONSTRAINT withdrawal_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT withdrawal_orders_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id),
  CONSTRAINT withdrawal_orders_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.admins(id)
);

-- Index for better performance
CREATE INDEX idx_withdrawal_orders_user_id ON public.withdrawal_orders(user_id);
CREATE INDEX idx_withdrawal_orders_status ON public.withdrawal_orders(status);
CREATE INDEX idx_withdrawal_orders_created_at ON public.withdrawal_orders(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE public.withdrawal_orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own withdrawal orders
CREATE POLICY "Users can view own withdrawal orders" ON public.withdrawal_orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own withdrawal orders
CREATE POLICY "Users can create own withdrawal orders" ON public.withdrawal_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own withdrawal orders (only if pending)
CREATE POLICY "Users can update own pending withdrawal orders" ON public.withdrawal_orders
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all withdrawal orders
CREATE POLICY "Admins can view all withdrawal orders" ON public.withdrawal_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Admins can update withdrawal orders
CREATE POLICY "Admins can update withdrawal orders" ON public.withdrawal_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );
