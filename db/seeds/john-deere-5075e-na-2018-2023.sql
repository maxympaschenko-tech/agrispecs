START TRANSACTION;

INSERT INTO sources (name, domain, source_type, authority_level)
SELECT 'John Deere', 'deere.com', 'manufacturer', 'official'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE name = 'John Deere' AND domain = 'deere.com'
);

INSERT INTO source_records (source_id, url, external_id, title, published_date)
SELECT s.id,
  'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/Tractors_5045E_5055E_5065E_5075E_Jan2022.pdf',
  'jd-5075e-na-price-page-2022-01-01',
  'John Deere 5075E Utility Tractor - North America price page',
  '2022-01-01'
FROM sources s
WHERE s.name = 'John Deere' AND s.domain = 'deere.com'
  AND NOT EXISTS (
    SELECT 1 FROM source_records sr WHERE sr.external_id = 'jd-5075e-na-price-page-2022-01-01'
  )
LIMIT 1;

INSERT INTO machine_versions (
  machine_id, slug, market_code, market_name, model_year_start, model_year_end,
  configuration, is_current, source_record_id, notes
)
SELECT m.id,
  'north-america-my2018-my2023',
  'NA',
  'North America',
  2018,
  2023,
  'Utility Tractor - base specification with factory transmission options',
  FALSE,
  sr.id,
  'Specifications below are sourced from the official John Deere North America price page dated January 1, 2022.'
FROM machines m
JOIN manufacturers mf ON mf.id = m.manufacturer_id
JOIN source_records sr ON sr.external_id = 'jd-5075e-na-price-page-2022-01-01'
WHERE mf.slug = 'john-deere' AND m.slug = '5075e'
ON DUPLICATE KEY UPDATE
  source_record_id = VALUES(source_record_id),
  notes = VALUES(notes);

INSERT INTO spec_definitions (section, spec_key, label, value_type, canonical_unit, display_order)
VALUES
  ('Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'kW', 10),
  ('Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 20),
  ('Engine', 'engine.cylinders', 'Cylinders', 'integer', NULL, 30),
  ('Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 40),
  ('Engine', 'engine.aspiration', 'Aspiration', 'text', NULL, 50),
  ('Engine', 'engine.family', 'Engine', 'text', NULL, 60),
  ('Engine', 'engine.emissions', 'Emissions', 'text', NULL, 70),
  ('PTO', 'pto.rated_power', 'PTO power', 'decimal', 'kW', 10),
  ('Transmission', 'transmission.standard', 'Standard transmission', 'text', NULL, 10),
  ('Transmission', 'transmission.optional', 'Optional transmission', 'text', NULL, 20),
  ('Hydraulics', 'hydraulics.system_type', 'Hydraulic system', 'text', NULL, 10),
  ('Hydraulics', 'hydraulics.total_flow', 'Maximum total flow', 'decimal', 'L/min', 20),
  ('Hydraulics', 'hydraulics.steering_pump_flow', 'Steering pump flow', 'decimal', 'L/min', 30),
  ('Hydraulics', 'hydraulics.implement_pump_flow', 'Implement pump flow', 'decimal', 'L/min', 40),
  ('Capacities', 'capacities.fuel_tank', 'Fuel tank', 'decimal', 'L', 10),
  ('Steering & Brakes', 'steering.type', 'Steering', 'text', NULL, 10),
  ('Steering & Brakes', 'brakes.type', 'Brakes', 'text', NULL, 20),
  ('Electrical', 'electrical.system_voltage', 'Electrical system', 'integer', 'V', 10),
  ('Electrical', 'electrical.battery_cca', 'Battery', 'integer', 'CCA', 20),
  ('Electrical', 'electrical.alternator', 'Alternator', 'integer', 'A', 30)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  value_type = VALUES(value_type),
  canonical_unit = VALUES(canonical_unit),
  display_order = VALUES(display_order);

INSERT INTO machine_specs (machine_id, machine_version_id, spec_definition_id, value_number, unit, source_record_id, confidence)
SELECT m.id, mv.id, sd.id, vals.value_number, vals.unit, sr.id, 'official'
FROM machines m
JOIN manufacturers mf ON mf.id = m.manufacturer_id
JOIN machine_versions mv ON mv.machine_id = m.id AND mv.slug = 'north-america-my2018-my2023'
JOIN source_records sr ON sr.external_id = 'jd-5075e-na-price-page-2022-01-01'
JOIN (
  SELECT 'engine.rated_power' spec_key, 54.4 value_number, 'kW' unit UNION ALL
  SELECT 'engine.rated_speed', 2100, 'rpm' UNION ALL
  SELECT 'engine.cylinders', 3, NULL UNION ALL
  SELECT 'engine.displacement', 2.9, 'L' UNION ALL
  SELECT 'pto.rated_power', 42.5, 'kW' UNION ALL
  SELECT 'hydraulics.total_flow', 68.9, 'L/min' UNION ALL
  SELECT 'hydraulics.steering_pump_flow', 25.7, 'L/min' UNION ALL
  SELECT 'hydraulics.implement_pump_flow', 43.1, 'L/min' UNION ALL
  SELECT 'capacities.fuel_tank', 74, 'L' UNION ALL
  SELECT 'electrical.system_voltage', 12, 'V' UNION ALL
  SELECT 'electrical.battery_cca', 623, 'CCA' UNION ALL
  SELECT 'electrical.alternator', 40, 'A'
) vals
JOIN spec_definitions sd ON sd.spec_key = vals.spec_key
WHERE mf.slug = 'john-deere' AND m.slug = '5075e'
ON DUPLICATE KEY UPDATE
  value_number = VALUES(value_number),
  unit = VALUES(unit),
  source_record_id = VALUES(source_record_id),
  confidence = VALUES(confidence);

INSERT INTO machine_specs (machine_id, machine_version_id, spec_definition_id, value_text, source_record_id, confidence)
SELECT m.id, mv.id, sd.id, vals.value_text, sr.id, 'official'
FROM machines m
JOIN manufacturers mf ON mf.id = m.manufacturer_id
JOIN machine_versions mv ON mv.machine_id = m.id AND mv.slug = 'north-america-my2018-my2023'
JOIN source_records sr ON sr.external_id = 'jd-5075e-na-price-page-2022-01-01'
JOIN (
  SELECT 'engine.aspiration' spec_key, 'Turbocharged' value_text UNION ALL
  SELECT 'engine.family', 'John Deere PowerTech diesel' UNION ALL
  SELECT 'engine.emissions', 'EPA Final Tier 4 compliant' UNION ALL
  SELECT 'transmission.standard', '9F/3R SyncShuttle (TSS)' UNION ALL
  SELECT 'transmission.optional', '12F/12R PowrReverser with 540/540E PTO' UNION ALL
  SELECT 'hydraulics.system_type', 'Open center' UNION ALL
  SELECT 'steering.type', 'Hydrostatic power steering' UNION ALL
  SELECT 'brakes.type', 'Hydraulically actuated wet disk brakes'
) vals
JOIN spec_definitions sd ON sd.spec_key = vals.spec_key
WHERE mf.slug = 'john-deere' AND m.slug = '5075e'
ON DUPLICATE KEY UPDATE
  value_text = VALUES(value_text),
  source_record_id = VALUES(source_record_id),
  confidence = VALUES(confidence);

UPDATE machines m
JOIN manufacturers mf ON mf.id = m.manufacturer_id
SET m.data_status = 'partial'
WHERE mf.slug = 'john-deere' AND m.slug = '5075e';

COMMIT;
