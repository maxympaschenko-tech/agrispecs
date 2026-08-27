CREATE TABLE manufacturers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  country_code CHAR(2) NULL,
  founded_year SMALLINT UNSIGNED NULL,
  discontinued_year SMALLINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE equipment_types (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE machine_series (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manufacturer_id BIGINT UNSIGNED NOT NULL,
  equipment_type_id SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  UNIQUE KEY uq_series (manufacturer_id, equipment_type_id, slug),
  CONSTRAINT fk_series_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
  CONSTRAINT fk_series_type FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE machines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manufacturer_id BIGINT UNSIGNED NOT NULL,
  equipment_type_id SMALLINT UNSIGNED NOT NULL,
  series_id BIGINT UNSIGNED NULL,
  model_name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  production_start_year SMALLINT UNSIGNED NULL,
  production_end_year SMALLINT UNSIGNED NULL,
  market_notes TEXT NULL,
  data_status ENUM('seed','partial','verified','review') NOT NULL DEFAULT 'seed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_machine (manufacturer_id, equipment_type_id, slug),
  KEY idx_machine_model (model_name),
  CONSTRAINT fk_machine_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
  CONSTRAINT fk_machine_type FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id),
  CONSTRAINT fk_machine_series FOREIGN KEY (series_id) REFERENCES machine_series(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_definitions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section VARCHAR(80) NOT NULL,
  spec_key VARCHAR(120) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  value_type ENUM('text','integer','decimal','boolean','range') NOT NULL DEFAULT 'text',
  canonical_unit VARCHAR(40) NULL,
  display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE machine_specs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id BIGINT UNSIGNED NOT NULL,
  spec_definition_id BIGINT UNSIGNED NOT NULL,
  value_text VARCHAR(500) NULL,
  value_number DECIMAL(18,6) NULL,
  unit VARCHAR(40) NULL,
  source_record_id BIGINT UNSIGNED NULL,
  confidence ENUM('official','high','medium','low') NOT NULL DEFAULT 'medium',
  UNIQUE KEY uq_machine_spec (machine_id, spec_definition_id),
  CONSTRAINT fk_spec_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
  CONSTRAINT fk_spec_definition FOREIGN KEY (spec_definition_id) REFERENCES spec_definitions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE part_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NULL,
  name VARCHAR(140) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  CONSTRAINT fk_part_category_parent FOREIGN KEY (parent_id) REFERENCES part_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manufacturer_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  part_number VARCHAR(160) NOT NULL,
  normalized_part_number VARCHAR(160) NOT NULL,
  name VARCHAR(255) NULL,
  description TEXT NULL,
  data_status ENUM('seed','partial','verified','review') NOT NULL DEFAULT 'seed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_part_number_brand (manufacturer_id, normalized_part_number),
  KEY idx_part_number (normalized_part_number),
  CONSTRAINT fk_part_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
  CONSTRAINT fk_part_category FOREIGN KEY (category_id) REFERENCES part_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE machine_parts (
  machine_id BIGINT UNSIGNED NOT NULL,
  part_id BIGINT UNSIGNED NOT NULL,
  fitment_note VARCHAR(255) NULL,
  quantity DECIMAL(10,2) NULL,
  source_record_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (machine_id, part_id),
  CONSTRAINT fk_machine_parts_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
  CONSTRAINT fk_machine_parts_part FOREIGN KEY (part_id) REFERENCES parts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE part_cross_references (
  part_id BIGINT UNSIGNED NOT NULL,
  cross_part_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('cross_reference','replaces','supersedes','alternative') NOT NULL DEFAULT 'cross_reference',
  source_record_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (part_id, cross_part_id, relation_type),
  CONSTRAINT fk_cross_part FOREIGN KEY (part_id) REFERENCES parts(id),
  CONSTRAINT fk_cross_part_target FOREIGN KEY (cross_part_id) REFERENCES parts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NULL,
  source_type ENUM('manufacturer','manual','test','supplier','government','reference','other') NOT NULL,
  authority_level ENUM('official','primary','secondary') NOT NULL DEFAULT 'secondary'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE source_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id BIGINT UNSIGNED NOT NULL,
  url TEXT NULL,
  external_id VARCHAR(255) NULL,
  title VARCHAR(500) NULL,
  published_date DATE NULL,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum CHAR(64) NULL,
  raw_reference JSON NULL,
  CONSTRAINT fk_source_record_source FOREIGN KEY (source_id) REFERENCES sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE machine_specs
  ADD CONSTRAINT fk_machine_spec_source_record FOREIGN KEY (source_record_id) REFERENCES source_records(id);

ALTER TABLE machine_parts
  ADD CONSTRAINT fk_machine_parts_source_record FOREIGN KEY (source_record_id) REFERENCES source_records(id);

ALTER TABLE part_cross_references
  ADD CONSTRAINT fk_part_cross_source_record FOREIGN KEY (source_record_id) REFERENCES source_records(id);
