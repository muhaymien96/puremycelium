-- drop extension if exists "pg_net";

alter table "public"."product_batches" drop constraint "product_batches_batch_number_key";

drop index if exists "public"."product_batches_batch_number_key";

alter table "public"."products" add column "cost_price" numeric(12,2);

CREATE UNIQUE INDEX product_batches_product_id_batch_number_key ON public.product_batches USING btree (product_id, batch_number);

alter table "public"."product_batches" add constraint "product_batches_product_id_batch_number_key" UNIQUE using index "product_batches_product_id_batch_number_key";


