START TRANSACTION;

INSERT INTO equipment_types (name, slug) VALUES ('Tractor', 'tractor') ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO manufacturers (name, slug) VALUES ('John Deere', 'john-deere') ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '1 Series', '1-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '2 Series', '2-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '3D Series', '3d-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '3E Series', '3e-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '3R Series', '3r-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '4M Series', '4m-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '4R Series', '4r-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '5E Series', '5e-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '5M Series', '5m-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '6M Series', '6m-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machine_series (manufacturer_id, equipment_type_id, name, slug)
SELECT mf.id, et.id, '6R Series', '6r-series'
FROM manufacturers mf
JOIN equipment_types et ON et.slug = 'tractor'
WHERE mf.slug = 'john-deere'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '1023E', '1023e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='1-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '1025R', '1025r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='1-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '2025R', '2025r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='2-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '2032R', '2032r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='2-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '2038R', '2038r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='2-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3025D', '3025d', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3d-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3035D', '3035d', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3d-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3043D', '3043d', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3d-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3025E', '3025e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3032E', '3032e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3038E', '3038e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3033R', '3033r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3039R', '3039r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '3046R', '3046r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='3r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4044M', '4044m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4052M', '4052m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4066M', '4066m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4044R', '4044r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4052R', '4052r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4066R', '4066r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '4075R', '4075r', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='4r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5045E', '5045e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5055E', '5055e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5065E', '5065e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5075E', '5075e', 'partial' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5090E', '5090e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5100E', '5100e', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5e-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5075M', '5075m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5090M', '5090m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5095M', '5095m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5100M', '5100m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5105M', '5105m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5115M', '5115m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5120M', '5120m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5125M', '5125m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '5130M', '5130m', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='5m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 95', '6m-95', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 105', '6m-105', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 115', '6m-115', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 125', '6m-125', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 130', '6m-130', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 140', '6m-140', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6M 150', '6m-150', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6m-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 110', '6r-110', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 120', '6r-120', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 130', '6r-130', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 140', '6r-140', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 150', '6r-150', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 175', '6r-175', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));
INSERT INTO machines (manufacturer_id, equipment_type_id, series_id, model_name, slug, data_status)
SELECT mf.id, et.id, ser.id, '6R 195', '6r-195', 'seed' FROM manufacturers mf JOIN equipment_types et ON et.slug='tractor' JOIN machine_series ser ON ser.manufacturer_id=mf.id AND ser.equipment_type_id=et.id AND ser.slug='6r-series' WHERE mf.slug='john-deere'
ON DUPLICATE KEY UPDATE series_id=VALUES(series_id), model_name=VALUES(model_name), data_status=IF(data_status IN ('partial','verified','review'),data_status,VALUES(data_status));

COMMIT;
