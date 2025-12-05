-- Add initial stock batches for imported products with random values
-- Batch numbering: B-001 through B-029 (simple sequential)
-- Production dates: 3-9 months ago (varied)
-- Expiry dates: Honey +2 years, Mushrooms +6 months, Other +1 year
-- Quantities: Random 10-50 units
-- Cost per unit: 60-80% of retail price

INSERT INTO product_batches (product_id, batch_number, quantity, cost_per_unit, production_date, expiry_date, notes)
SELECT 
  p.id,
  batch_data.batch_number,
  batch_data.quantity::numeric,
  batch_data.cost_per_unit::numeric,
  batch_data.production_date::date,
  batch_data.expiry_date::date,
  'Initial stock batch'
FROM products p
INNER JOIN (
  VALUES
    ('SW001', 'B-001', 25, 60.00, '2025-06-15', '2026-06-15'),
    ('DF001', 'B-002', 50, 0.00, '2025-09-01', '2026-09-01'),
    ('BLU001', 'B-003', 35, 75.00, '2025-04-20', '2027-04-20'),
    ('BW001', 'B-004', 18, 30.00, '2025-07-10', '2026-07-10'),
    ('MYR002', 'B-005', 22, 140.00, '2025-03-15', '2027-03-15'),
    ('BOM001', 'B-006', 12, 35.00, '2025-11-01', '2026-05-01'),
    ('LMMP001', 'B-007', 15, 180.00, '2025-10-20', '2026-04-20'),
    ('LIT002', 'B-008', 30, 150.00, '2025-05-25', '2027-05-25'),
    ('LIT001', 'B-009', 40, 75.00, '2025-05-25', '2027-05-25'),
    ('APP004', 'B-010', 28, 140.00, '2025-08-10', '2027-08-10'),
    ('APP003', 'B-011', 45, 75.00, '2025-08-10', '2027-08-10'),
    ('MYR001', 'B-012', 32, 75.00, '2025-03-20', '2027-03-20'),
    ('APP002', 'B-013', 38, 70.00, '2025-08-15', '2027-08-15'),
    ('HON001', 'B-014', 20, 95.00, '2025-06-01', '2027-06-01'),
    ('MAC001', 'B-015', 24, 105.00, '2025-07-12', '2027-07-12'),
    ('FYN002', 'B-016', 26, 125.00, '2025-04-05', '2027-04-05'),
    ('EUC002', 'B-017', 29, 125.00, '2025-05-18', '2027-05-18'),
    ('CSS001', 'B-018', 33, 95.00, '2025-09-22', '2027-09-22'),
    ('SG002', 'B-019', 42, 70.00, '2025-06-28', '2027-06-28'),
    ('SG001', 'B-020', 27, 125.00, '2025-06-28', '2027-06-28'),
    ('CV002', 'B-021', 31, 125.00, '2025-07-15', '2027-07-15'),
    ('CV001', 'B-022', 36, 70.00, '2025-07-15', '2027-07-15'),
    ('GRA002', 'B-023', 23, 140.00, '2025-04-30', '2027-04-30'),
    ('GRA001', 'B-024', 41, 75.00, '2025-04-30', '2027-04-30'),
    ('OB002', 'B-025', 34, 75.00, '2025-08-20', '2027-08-20'),
    ('OB001', 'B-026', 19, 140.00, '2025-08-20', '2027-08-20'),
    ('APP001', 'B-027', 21, 140.00, '2025-09-05', '2027-09-05'),
    ('FYN001', 'B-028', 44, 70.00, '2025-04-12', '2027-04-12'),
    ('EUC001', 'B-029', 37, 70.00, '2025-05-08', '2027-05-08')
) AS batch_data(sku, batch_number, quantity, cost_per_unit, production_date, expiry_date)
ON p.sku = batch_data.sku;

-- Create initial stock movements for each batch
INSERT INTO stock_movements (product_id, batch_id, quantity, movement_type, notes, reference_type)
SELECT 
  pb.product_id,
  pb.id,
  pb.quantity,
  'initial_stock',
  'Initial stock from batch ' || pb.batch_number,
  'batch'
FROM product_batches pb
WHERE pb.batch_number LIKE 'B-%'
AND pb.notes = 'Initial stock batch';