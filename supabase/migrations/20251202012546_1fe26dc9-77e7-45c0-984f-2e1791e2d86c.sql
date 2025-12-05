-- Import 29 products from CSV with category mapping and unit_of_measure detection
-- Category mapping: Honey jars → honey, Medicinal Mushrooms → mushroom, empty → other
-- Unit detection: Category contains "kg"/"KG" → kg, contains "ml" → ml, otherwise → unit

INSERT INTO products (name, description, unit_price, category, sku, cost_price, unit_of_measure, is_active, total_stock) VALUES
('Spring wildflower', '', 100, 'other', 'SW001', NULL, 'unit', true, 0),
('Delivery fee', '', 50, 'other', 'DF001', NULL, 'unit', true, 0),
('Blueberry', '', 110, 'honey', 'BLU001', NULL, 'ml', true, 0),
('Bee''s Wax', '', 50, 'other', 'BW001', NULL, 'unit', true, 0),
('Myrtle', '', 200, 'honey', 'MYR002', NULL, 'kg', true, 0),
('Brown Oyster Mushrooms', '', 55, 'mushroom', 'BOM001', NULL, 'unit', true, 0),
('Lions Maine Mushroom Powder', '', 250, 'mushroom', 'LMMP001', NULL, 'unit', true, 0),
('Litchi', '', 200, 'honey', 'LIT002', NULL, 'kg', true, 0),
('Litchi', '', 110, 'honey', 'LIT001', NULL, 'ml', true, 0),
('Apple/Pear', '', 200, 'honey', 'APP004', NULL, 'kg', true, 0),
('Apple/Pear', '', 110, 'honey', 'APP003', NULL, 'ml', true, 0),
('Myrtle', '', 110, 'honey', 'MYR001', NULL, 'ml', true, 0),
('Apple', '', 110, 'honey', 'APP002', NULL, 'ml', true, 0),
('Honeycomb', '', 140, 'honey', 'HON001', NULL, 'ml', true, 0),
('Macadamia', '', 150, 'honey', 'MAC001', NULL, 'ml', true, 0),
('Fynbos', '', 180, 'honey', 'FYN002', NULL, 'kg', true, 0),
('Eucalyptus', '', 180, 'honey', 'EUC002', NULL, 'kg', true, 0),
('Creamed Soft Set', '', 140, 'honey', 'CSS001', NULL, 'ml', true, 0),
('Sugar Gum', '', 100, 'honey', 'SG002', NULL, 'ml', true, 0),
('Sugar Gum', '', 180, 'honey', 'SG001', NULL, 'kg', true, 0),
('Constantia Valley', '', 180, 'honey', 'CV002', NULL, 'kg', true, 0),
('Constantia Valley', '', 100, 'honey', 'CV001', NULL, 'ml', true, 0),
('Grape', '', 200, 'honey', 'GRA002', NULL, 'kg', true, 0),
('Grape', '', 110, 'honey', 'GRA001', NULL, 'ml', true, 0),
('Orange Blossom', '', 110, 'honey', 'OB002', NULL, 'ml', true, 0),
('Orange Blossom', '', 200, 'honey', 'OB001', NULL, 'kg', true, 0),
('Apple', '', 200, 'honey', 'APP001', NULL, 'kg', true, 0),
('Fynbos', '', 100, 'honey', 'FYN001', NULL, 'ml', true, 0),
('Eucalyptus', '', 100, 'honey', 'EUC001', NULL, 'ml', true, 0);