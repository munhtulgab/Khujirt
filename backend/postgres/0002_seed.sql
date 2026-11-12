-- Seed data: the Khujirt range as listed on gem.mn (GEM International), with the confirmed sizes:
-- PET water 330 мл / 500 мл / 1.5 л, Iodine+ 500 мл / 860 мл, glass bottles 330 мл / 600 мл.
-- Existing rows are left alone, so edits made in the database survive.

INSERT INTO products (slug, name_mn, name_en, description_mn, description_en, category, packaging, volumes, image_url, shop_url, sort_order) VALUES
('khujirt', 'Хужирт ус', 'Khujirt Natural Mineral Water',
 'Монгол орны цэвэр, байгалийн эрдэст ус.', 'Pure natural mineral water from Mongolia.',
 'still', 'pet', '["330 мл","500 мл","1.5 л"]',
 'https://cdnp.cody.mn/spree/images/2844879/large/Khujirt_pet___1.5L.png', 'https://www.gem.mn/mn/products/khujirt', 10),
('khujirt-bombolog', 'Хужирт хийжүүлсэн ус', 'Khujirt Sparkling',
 'Амны цангааг төгс тайлах хийжүүлсэн байгалийн эрдэст ус.', 'Sparkling natural mineral water that perfectly quenches thirst.',
 'sparkling', 'pet', '["330 мл","500 мл","1.5 л"]',
 'https://cdnp.cody.mn/spree/images/2844877/large/Khujirt_pet_Bumbulugtei_0.3.png', 'https://www.gem.mn/mn/products/khujirt-bombolog', 20),
('khujirt-yoda', 'Хужирт Йода+', 'Khujirt Iodine+',
 'Европын “Супер Йодис” технологиор биоидэвхт иодоор баяжуулсан байгалийн эрдэст ус.', 'Natural mineral water enriched with bioactive iodine using the European “Super Iodis” technology.',
 'iodine', 'pet', '["500 мл","860 мл"]',
 'https://cdnp.cody.mn/spree/images/3614445/large/khujirt_ioda_0.5.png', 'https://www.gem.mn/mn/products/khujirt-yoda', 30),
('khujirt-tsangis', 'Хужирт цангис амт', 'Khujirt Cranberry',
 'Цангисын зөөлөн, тааламжтай амт, үнэртэй хийжүүлсэн эрдэст ус. Тогтворжуулагч, будаг агуулаагүй.', 'Sparkling mineral water with a soft cranberry taste and aroma. No stabilisers or colourings.',
 'flavoured', 'glass', '["330 мл","600 мл"]',
 'https://cdnp.cody.mn/spree/images/2844818/large/Khujirt_glass_Natural_0.7.png', 'https://www.gem.mn/mn/products/khujirt-tsangis', 40),
('khujirt-shil', 'Хужирт ус, шилэн сав', 'Khujirt in Glass',
 'Эх булгаас нь шууд, агаар нэвтрэхгүй шилэн саванд савладаг тул усны бүтэц, чанар, амт хэвээр хадгалагдана.', 'Filled straight from the spring into airtight glass, so the water keeps its structure, quality and taste.',
 'still', 'glass', '["330 мл","600 мл"]',
 'https://cdnp.cody.mn/spree/images/3431083/large/Khujirt_glass_Natural_0.7.png', 'https://www.gem.mn/mn/products/khujirt-shil', 50),
('khuijrt-sparkling', 'Хужирт бөмбөлөгтэй, шилэн сав', 'Khujirt Sparkling in Glass',
 'Шилэн саванд савласан хийжүүлсэн байгалийн эрдэст ус.', 'Sparkling natural mineral water in glass bottles.',
 'sparkling', 'glass', '["330 мл","600 мл"]',
 'https://cdnp.cody.mn/spree/images/3431080/large/Khujirt_glass_Bumbulugtei_0.7.png', 'https://www.gem.mn/mn/products/khuijrt-sparkling', 60)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO facts (key, value) VALUES ('since', '2013'), ('mineral_count', '5'), ('additives', '0')
ON CONFLICT (key) DO NOTHING;
