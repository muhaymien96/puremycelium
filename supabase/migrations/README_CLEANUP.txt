Migration cleanup:
- Keep: 20251128_remove_product_cost_price.sql (removes cost_price from products)
- Remove: consolidated-migrations.sql (not used by Supabase CLI)
- Optional: Remove 20251128170000_add_cost_price.sql if you do not need to support rolling back to a state with cost_price

This keeps your migration history clean and clear for future development.