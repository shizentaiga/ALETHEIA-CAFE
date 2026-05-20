-- npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/add_tables/20260520_01_add_website_url.sql --local

ALTER TABLE services ADD COLUMN website_url TEXT;
