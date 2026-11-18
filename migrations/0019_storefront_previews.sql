-- Optional creator-supplied release previews.
-- Preserve all inventory, prices, ownership, and native settlement data.
ALTER TABLE digital_products ADD COLUMN preview_video_url TEXT;
ALTER TABLE digital_products ADD COLUMN gallery_images_json TEXT NOT NULL DEFAULT '[]';
