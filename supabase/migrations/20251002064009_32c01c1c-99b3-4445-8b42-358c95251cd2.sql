-- Add checkout limit to categories table
ALTER TABLE categories 
ADD COLUMN checkout_limit integer DEFAULT 10;

COMMENT ON COLUMN categories.checkout_limit IS 'Maximum number of parts a user can checkout from this category at once';