-- Fix increment_batch_quantity(uuid, integer) security
CREATE OR REPLACE FUNCTION public.increment_batch_quantity(p_batch_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_current_quantity numeric;
BEGIN
  -- Lock row and get current quantity
  SELECT quantity INTO v_current_quantity
  FROM product_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch with id % not found', p_batch_id;
  END IF;

  UPDATE product_batches
  SET quantity = quantity + p_quantity
  WHERE id = p_batch_id;
END;
$function$;

-- Fix decrement_batch_quantity(uuid, integer) security
CREATE OR REPLACE FUNCTION public.decrement_batch_quantity(p_batch_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_current_quantity numeric;
BEGIN
  -- Get current quantity with row lock
  SELECT quantity INTO v_current_quantity
  FROM product_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  -- Check if batch exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch with id % not found', p_batch_id;
  END IF;

  -- Check if sufficient stock available
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in batch %. Available: %, Requested: %', 
      p_batch_id, v_current_quantity, p_quantity;
  END IF;

  -- Update the batch quantity
  UPDATE product_batches
  SET quantity = quantity - p_quantity
  WHERE id = p_batch_id;
END;
$function$;

-- Fix recalc_product_total_stock() security
CREATE OR REPLACE FUNCTION public.recalc_product_total_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_product_id uuid;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE products p
  SET total_stock = COALESCE((
    SELECT SUM(pb.quantity)
    FROM product_batches pb
    WHERE pb.product_id = v_product_id
  ), 0)
  WHERE p.id = v_product_id;

  RETURN NEW;
END;
$function$;

-- Fix update_product_total_stock() security
CREATE OR REPLACE FUNCTION public.update_product_total_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE products
  SET total_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM product_batches
    WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$function$;