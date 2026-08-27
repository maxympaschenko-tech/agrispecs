START TRANSACTION;

CREATE TABLE machine_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(220) NOT NULL,
  market_code VARCHAR(32) NULL,
  market_name VARCHAR(120) NULL,
  model_year_start SMALLINT UNSIGNED NULL,
  model_year_end SMALLINT UNSIGNED NULL,
  configuration VARCHAR(180) NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  source_record_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_machine_version (machine_id, slug),
  KEY idx_machine_version_market_year (machine_id, market_code, model_year_start, model_year_end),
  CONSTRAINT fk_machine_version_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
  CONSTRAINT fk_machine_version_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE machine_specs
  ADD COLUMN machine_version_id BIGINT UNSIGNED NULL AFTER machine_id,
  DROP INDEX uq_machine_spec,
  ADD UNIQUE KEY uq_machine_version_spec (machine_id, machine_version_id, spec_definition_id),
  ADD KEY idx_machine_specs_version (machine_version_id),
  ADD CONSTRAINT fk_machine_spec_version FOREIGN KEY (machine_version_id) REFERENCES machine_versions(id);

ALTER TABLE machine_parts
  DROP PRIMARY KEY,
  ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN machine_version_id BIGINT UNSIGNED NULL AFTER machine_id,
  ADD KEY idx_machine_parts_machine_part (machine_id, part_id),
  ADD KEY idx_machine_parts_version (machine_version_id),
  ADD CONSTRAINT fk_machine_parts_version FOREIGN KEY (machine_version_id) REFERENCES machine_versions(id);

COMMIT;
