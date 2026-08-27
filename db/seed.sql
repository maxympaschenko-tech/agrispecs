START TRANSACTION;

INSERT INTO equipment_types (name, slug)
VALUES ('Tractor', 'tractor')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO manufacturers (name, slug)
VALUES
  ('John Deere', 'john-deere'),
  ('Kubota', 'kubota'),
  ('Case IH', 'case-ih'),
  ('New Holland', 'new-holland'),
  ('Massey Ferguson', 'massey-ferguson')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machines (manufacturer_id, equipment_type_id, model_name, slug, data_status)
SELECT mf.id, et.id, '5075E', '5075e', 'seed'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE model_name = VALUES(model_name), data_status = VALUES(data_status);

INSERT INTO machines (manufacturer_id, equipment_type_id, model_name, slug, data_status)
SELECT mf.id, et.id, 'M7060', 'm7060', 'seed'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'kubota'
ON DUPLICATE KEY UPDATE model_name = VALUES(model_name), data_status = VALUES(data_status);

INSERT INTO machines (manufacturer_id, equipment_type_id, model_name, slug, data_status)
SELECT mf.id, et.id, 'Farmall 75A', 'farmall-75a', 'seed'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'case-ih'
ON DUPLICATE KEY UPDATE model_name = VALUES(model_name), data_status = VALUES(data_status);

INSERT INTO machines (manufacturer_id, equipment_type_id, model_name, slug, data_status)
SELECT mf.id, et.id, 'Workmaster 75', 'workmaster-75', 'seed'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'new-holland'
ON DUPLICATE KEY UPDATE model_name = VALUES(model_name), data_status = VALUES(data_status);

INSERT INTO machines (manufacturer_id, equipment_type_id, model_name, slug, data_status)
SELECT mf.id, et.id, '4707', '4707', 'seed'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'massey-ferguson'
ON DUPLICATE KEY UPDATE model_name = VALUES(model_name), data_status = VALUES(data_status);

COMMIT;
