START TRANSACTION;

INSERT INTO sources (name, domain, source_type, authority_level)
SELECT 'John Deere', 'deere.com', 'manufacturer', 'official'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE name='John Deere' AND domain='deere.com');

INSERT INTO spec_definitions (section, spec_key, label, value_type, canonical_unit, display_order)
VALUES
  ('Engine','engine.make','Engine manufacturer','text',NULL,5),
  ('Engine','engine.model','Engine model','text',NULL,6),
  ('Engine','engine.displacement','Engine displacement','decimal','L',20),
  ('Engine','engine.rated_power','Rated engine power','decimal','hp',10),
  ('Engine','engine.rated_speed','Rated engine speed','integer','rpm',30),
  ('Engine','engine.cylinders','Cylinders','integer',NULL,40),
  ('Engine','engine.aspiration','Aspiration','text',NULL,50),
  ('Engine','engine.emissions','Emissions','text',NULL,60),
  ('Transmission','transmission.standard','Standard transmission','text',NULL,10),
  ('PTO','pto.rated_power','PTO power','decimal','hp',10),
  ('Hydraulics','hydraulics.pump_rated_output','Pump rated output','decimal','L/min',10),
  ('Dimensions & Weight','weight.base_machine','Base machine weight','decimal','lb',10)
ON DUPLICATE KEY UPDATE section=VALUES(section), label=VALUES(label), value_type=VALUES(value_type), canonical_unit=VALUES(canonical_unit), display_order=VALUES(display_order);

INSERT INTO source_records (source_id, url, external_id, title)
SELECT s.id, 'https://www.deere.com/en-us/products-and-solutions/tractors/compact-tractors/1023e-sub-compact-tractor-mdi1m0xw', 'jd-1023e-us-current-2026-08', 'John Deere 1023E Sub-Compact Tractor - current US specifications'
FROM sources s WHERE s.name='John Deere' AND s.domain='deere.com'
AND NOT EXISTS (SELECT 1 FROM source_records sr WHERE sr.external_id='jd-1023e-us-current-2026-08') LIMIT 1;
INSERT INTO machine_versions (machine_id, slug, market_code, market_name, configuration, is_current, source_record_id, notes)
SELECT m.id, 'us-current-2026-08', 'US', 'United States', 'Current production specification', TRUE, sr.id, 'Current John Deere US specification page accessed August 2026. Model-year boundaries will be refined when year-specific literature is added.'
FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN source_records sr ON sr.external_id='jd-1023e-us-current-2026-08'
WHERE mf.slug='john-deere' AND m.slug='1023e'
ON DUPLICATE KEY UPDATE is_current=TRUE, source_record_id=VALUES(source_record_id), notes=VALUES(notes);

INSERT INTO source_records (source_id, url, external_id, title)
SELECT s.id, 'https://www.deere.com/en-us/products-and-solutions/tractors/compact-tractors/1025r-sub-compact-tractor-mdi4mexw', 'jd-1025r-us-current-2026-08', 'John Deere 1025R Sub-Compact Tractor - current US specifications'
FROM sources s WHERE s.name='John Deere' AND s.domain='deere.com'
AND NOT EXISTS (SELECT 1 FROM source_records sr WHERE sr.external_id='jd-1025r-us-current-2026-08') LIMIT 1;
INSERT INTO machine_versions (machine_id, slug, market_code, market_name, configuration, is_current, source_record_id, notes)
SELECT m.id, 'us-current-2026-08', 'US', 'United States', 'Current production specification', TRUE, sr.id, 'Current John Deere US specification page accessed August 2026. Model-year boundaries will be refined when year-specific literature is added.'
FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN source_records sr ON sr.external_id='jd-1025r-us-current-2026-08'
WHERE mf.slug='john-deere' AND m.slug='1025r'
ON DUPLICATE KEY UPDATE is_current=TRUE, source_record_id=VALUES(source_record_id), notes=VALUES(notes);

INSERT INTO source_records (source_id, url, external_id, title)
SELECT s.id, 'https://www.deere.com/en-us/products-and-solutions/tractors/compact-tractors/2025r-compact-tractor-mtuxmuxw', 'jd-2025r-us-current-2026-08', 'John Deere 2025R Compact Tractor - current US specifications'
FROM sources s WHERE s.name='John Deere' AND s.domain='deere.com'
AND NOT EXISTS (SELECT 1 FROM source_records sr WHERE sr.external_id='jd-2025r-us-current-2026-08') LIMIT 1;
INSERT INTO machine_versions (machine_id, slug, market_code, market_name, configuration, is_current, source_record_id, notes)
SELECT m.id, 'us-current-2026-08', 'US', 'United States', 'Current production specification', TRUE, sr.id, 'Current John Deere US specification page accessed August 2026. Model-year boundaries will be refined when year-specific literature is added.'
FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN source_records sr ON sr.external_id='jd-2025r-us-current-2026-08'
WHERE mf.slug='john-deere' AND m.slug='2025r'
ON DUPLICATE KEY UPDATE is_current=TRUE, source_record_id=VALUES(source_record_id), notes=VALUES(notes);

INSERT INTO source_records (source_id, url, external_id, title)
SELECT s.id, 'https://www.deere.com/en-us/products-and-solutions/tractors/compact-tractors/2032r-compact-tractor-mtuzquxw', 'jd-2032r-us-current-2026-08', 'John Deere 2032R Compact Tractor - current US specifications'
FROM sources s WHERE s.name='John Deere' AND s.domain='deere.com'
AND NOT EXISTS (SELECT 1 FROM source_records sr WHERE sr.external_id='jd-2032r-us-current-2026-08') LIMIT 1;
INSERT INTO machine_versions (machine_id, slug, market_code, market_name, configuration, is_current, source_record_id, notes)
SELECT m.id, 'us-current-2026-08', 'US', 'United States', 'Current production specification', TRUE, sr.id, 'Current John Deere US specification page accessed August 2026. Model-year boundaries will be refined when year-specific literature is added.'
FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN source_records sr ON sr.external_id='jd-2032r-us-current-2026-08'
WHERE mf.slug='john-deere' AND m.slug='2032r'
ON DUPLICATE KEY UPDATE is_current=TRUE, source_record_id=VALUES(source_record_id), notes=VALUES(notes);

INSERT INTO source_records (source_id, url, external_id, title)
SELECT s.id, 'https://www.deere.com/en/tractors/compact-tractors/2-series-compact-tractors/2032r/', 'jd-2038r-us-current-2026-08', 'John Deere 2038R Compact Tractor - current US specifications'
FROM sources s WHERE s.name='John Deere' AND s.domain='deere.com'
AND NOT EXISTS (SELECT 1 FROM source_records sr WHERE sr.external_id='jd-2038r-us-current-2026-08') LIMIT 1;
INSERT INTO machine_versions (machine_id, slug, market_code, market_name, configuration, is_current, source_record_id, notes)
SELECT m.id, 'us-current-2026-08', 'US', 'United States', 'Current production specification', TRUE, sr.id, 'Current John Deere US specification page accessed August 2026. Model-year boundaries will be refined when year-specific literature is added.'
FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN source_records sr ON sr.external_id='jd-2038r-us-current-2026-08'
WHERE mf.slug='john-deere' AND m.slug='2038r'
ON DUPLICATE KEY UPDATE is_current=TRUE, source_record_id=VALUES(source_record_id), notes=VALUES(notes);

-- 1023E numeric specs
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_number,v.unit,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-1023e-us-current-2026-08' JOIN (SELECT 'engine.displacement' spec_key,0.993 value_number,'L' unit UNION ALL SELECT 'engine.rated_power',21,'hp' UNION ALL SELECT 'engine.rated_speed',3200,'rpm' UNION ALL SELECT 'engine.cylinders',3,NULL UNION ALL SELECT 'pto.rated_power',16,'hp' UNION ALL SELECT 'hydraulics.pump_rated_output',24,'L/min' UNION ALL SELECT 'weight.base_machine',1446,'lb') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='1023e'
ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official';
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_text,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-1023e-us-current-2026-08' JOIN (SELECT 'engine.make' spec_key,'Yanmar' value_text UNION ALL SELECT 'engine.model','3TNM74F-NCJT' UNION ALL SELECT 'engine.aspiration','Natural' UNION ALL SELECT 'engine.emissions','Final Tier 4' UNION ALL SELECT 'transmission.standard','Hydrostatic - two range') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='1023e'
ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),source_record_id=VALUES(source_record_id),confidence='official';

-- 1025R numeric specs
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_number,v.unit,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-1025r-us-current-2026-08' JOIN (SELECT 'engine.displacement' spec_key,1.267 value_number,'L' unit UNION ALL SELECT 'engine.rated_power',23.9,'hp' UNION ALL SELECT 'engine.rated_speed',3200,'rpm' UNION ALL SELECT 'engine.cylinders',3,NULL UNION ALL SELECT 'pto.rated_power',18.2,'hp' UNION ALL SELECT 'hydraulics.pump_rated_output',24,'L/min' UNION ALL SELECT 'weight.base_machine',1556,'lb') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='1025r'
ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official';
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_text,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-1025r-us-current-2026-08' JOIN (SELECT 'engine.make' spec_key,'Yanmar' value_text UNION ALL SELECT 'engine.model','3TNV80F-NCJT' UNION ALL SELECT 'engine.aspiration','Natural' UNION ALL SELECT 'engine.emissions','Final Tier 4' UNION ALL SELECT 'transmission.standard','Hydrostatic - two range') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='1025r'
ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),source_record_id=VALUES(source_record_id),confidence='official';

-- 2025R numeric specs
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_number,v.unit,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-2025r-us-current-2026-08' JOIN (SELECT 'engine.displacement' spec_key,1.267 value_number,'L' unit UNION ALL SELECT 'engine.rated_power',23.9,'hp' UNION ALL SELECT 'engine.rated_speed',3200,'rpm' UNION ALL SELECT 'engine.cylinders',3,NULL UNION ALL SELECT 'pto.rated_power',18,'hp' UNION ALL SELECT 'hydraulics.pump_rated_output',24,'L/min') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='2025r'
ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official';
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_text,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-2025r-us-current-2026-08' JOIN (SELECT 'engine.make' spec_key,'Yanmar' value_text UNION ALL SELECT 'engine.model','3TNV80F-NCJT' UNION ALL SELECT 'engine.aspiration','Natural' UNION ALL SELECT 'engine.emissions','Final Tier 4' UNION ALL SELECT 'transmission.standard','Hydrostatic - two range') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='2025r'
ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),source_record_id=VALUES(source_record_id),confidence='official';

-- 2032R numeric specs
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_number,v.unit,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-2032r-us-current-2026-08' JOIN (SELECT 'engine.displacement' spec_key,1.642 value_number,'L' unit UNION ALL SELECT 'engine.rated_power',30.7,'hp' UNION ALL SELECT 'engine.rated_speed',2500,'rpm' UNION ALL SELECT 'engine.cylinders',3,NULL UNION ALL SELECT 'pto.rated_power',24.2,'hp') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='2032r'
ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official';
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_text,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-2032r-us-current-2026-08' JOIN (SELECT 'engine.make' spec_key,'Yanmar' value_text UNION ALL SELECT 'engine.model','3TNV88C-NJT2' UNION ALL SELECT 'engine.aspiration','Natural' UNION ALL SELECT 'engine.emissions','Final Tier 4' UNION ALL SELECT 'transmission.standard','Hydrostatic transmission (HST)') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='2032r'
ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),source_record_id=VALUES(source_record_id),confidence='official';

-- 2038R numeric specs
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_number,v.unit,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-2038r-us-current-2026-08' JOIN (SELECT 'engine.displacement' spec_key,1.568 value_number,'L' unit UNION ALL SELECT 'engine.rated_power',36.7,'hp' UNION ALL SELECT 'engine.rated_speed',2500,'rpm' UNION ALL SELECT 'engine.cylinders',3,NULL UNION ALL SELECT 'pto.rated_power',30.4,'hp') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='2038r'
ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official';
INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,source_record_id,confidence)
SELECT m.id,mv.id,sd.id,v.value_text,sr.id,'official' FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.machine_id=m.id AND mv.slug='us-current-2026-08' JOIN source_records sr ON sr.external_id='jd-2038r-us-current-2026-08' JOIN (SELECT 'engine.make' spec_key,'Yanmar' value_text UNION ALL SELECT 'engine.model','3TNV86T-NJT' UNION ALL SELECT 'engine.aspiration','Turbocharged' UNION ALL SELECT 'engine.emissions','Final Tier 4' UNION ALL SELECT 'transmission.standard','Hydrostatic transmission (HST)') v JOIN spec_definitions sd ON sd.spec_key=v.spec_key WHERE mf.slug='john-deere' AND m.slug='2038r'
ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),source_record_id=VALUES(source_record_id),confidence='official';

UPDATE machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id SET m.data_status='partial' WHERE mf.slug='john-deere' AND m.slug IN ('1023e','1025r','2025r','2032r','2038r');

COMMIT;
