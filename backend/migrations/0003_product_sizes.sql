-- Bottle sizes and photos confirmed by Khujirt: PET still water 330 мл / 500 мл / 1.5 л,
-- glass bottles (still, sparkling, cranberry) 330 мл / 600 мл.

UPDATE products
SET volumes = '["330 мл","500 мл","1.5 л"]',
    image_url = 'https://cdnp.cody.mn/spree/images/2844879/large/Khujirt_pet___1.5L.png',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE slug = 'khujirt';

UPDATE products
SET volumes = '["330 мл","600 мл"]',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE slug IN ('khujirt-shil', 'khuijrt-sparkling', 'khujirt-tsangis');

UPDATE products
SET description_mn = 'Шилэн саванд савласан хийжүүлсэн байгалийн эрдэст ус.',
    description_en = 'Sparkling natural mineral water in glass bottles.',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE slug = 'khuijrt-sparkling';
