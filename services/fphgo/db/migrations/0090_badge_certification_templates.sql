-- +goose Up
-- +goose StatementBegin
WITH active_certifications(slug, name, display_order) AS (
  VALUES
    ('molchanovs-wave-1', 'Molchanovs Wave 1', 210),
    ('molchanovs-wave-2', 'Molchanovs Wave 2', 220),
    ('molchanovs-wave-3', 'Molchanovs Wave 3', 230),
    ('molchanovs-wave-4', 'Molchanovs Wave 4', 240),
    ('molchanovs-wave-2i', 'Molchanovs Wave 2I', 250),
    ('molchanovs-wave-3i', 'Molchanovs Wave 3I', 260),
    ('molchanovs-wave-4i', 'Molchanovs Wave 4I', 270),
    ('molchanovs-wave-3it', 'Molchanovs Wave 3IT', 280),
    ('molchanovs-wave-4it', 'Molchanovs Wave 4IT', 290),
    ('aida-1', 'AIDA 1', 310),
    ('aida-2', 'AIDA 2', 320),
    ('aida-3', 'AIDA 3', 330),
    ('aida-4', 'AIDA 4', 340),
    ('aida-monofin-freediver', 'AIDA Monofin Freediver', 350),
    ('aida-f-emerg-med-responder', 'AIDA F. Emerg. Med. Responder', 360),
    ('aida-competition-freediver', 'AIDA Competition Freediver', 370),
    ('aida-instructor', 'AIDA Instructor', 380),
    ('aida-master-instructor', 'AIDA Master Instructor', 390),
    ('aida-instructor-trainer', 'AIDA Instructor Trainer', 400),
    ('aida-instructor-judge', 'AIDA Instructor Judge', 410),
    ('aida-instructor-youth', 'AIDA Instructor Youth', 420),
    ('ssi-freediver', 'SSI Freediver', 510),
    ('ssi-advanced-freediver', 'SSI Advanced Freediver', 520),
    ('ssi-performance-freediver', 'SSI Performance Freediver', 530),
    ('ssi-instructor', 'SSI Instructor', 540),
    ('ssi-performance-instructor', 'SSI Performance Instructor', 550),
    ('ssi-instructor-trainer', 'SSI Instructor Trainer', 560),
    ('padi-freediver', 'PADI Freediver', 610),
    ('padi-advanced-freediver', 'PADI Advanced Freediver', 620),
    ('padi-master-freediver', 'PADI Master Freediver', 630),
    ('padi-instructor', 'PADI Instructor', 640),
    ('padi-advanced-instructor', 'PADI Advanced Instructor', 650),
    ('padi-master-instructor', 'PADI Master Instructor', 660)
)
INSERT INTO badge_templates (
  slug,
  name,
  category,
  value_type,
  unit,
  icon,
  description,
  is_system,
  display_order,
  rarity,
  is_public,
  is_repeatable,
  source_module,
  metadata_json
)
SELECT
  slug,
  name,
  'certification',
  'none',
  NULL,
  'badge-check',
  NULL,
  FALSE,
  display_order,
  'common',
  TRUE,
  FALSE,
  'profile',
  '{}'::jsonb
FROM active_certifications
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  value_type = EXCLUDED.value_type,
  unit = EXCLUDED.unit,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  display_order = EXCLUDED.display_order,
  rarity = EXCLUDED.rarity,
  is_public = EXCLUDED.is_public,
  is_repeatable = EXCLUDED.is_repeatable,
  source_module = EXCLUDED.source_module,
  metadata_json = EXCLUDED.metadata_json,
  updated_at = NOW();

UPDATE badge_templates
SET
  is_public = FALSE,
  updated_at = NOW()
WHERE category = 'certification'
  AND slug NOT IN (
    'molchanovs-wave-1',
    'molchanovs-wave-2',
    'molchanovs-wave-3',
    'molchanovs-wave-4',
    'molchanovs-wave-2i',
    'molchanovs-wave-3i',
    'molchanovs-wave-4i',
    'molchanovs-wave-3it',
    'molchanovs-wave-4it',
    'aida-1',
    'aida-2',
    'aida-3',
    'aida-4',
    'aida-monofin-freediver',
    'aida-f-emerg-med-responder',
    'aida-competition-freediver',
    'aida-instructor',
    'aida-master-instructor',
    'aida-instructor-trainer',
    'aida-instructor-judge',
    'aida-instructor-youth',
    'ssi-freediver',
    'ssi-advanced-freediver',
    'ssi-performance-freediver',
    'ssi-instructor',
    'ssi-performance-instructor',
    'ssi-instructor-trainer',
    'padi-freediver',
    'padi-advanced-freediver',
    'padi-master-freediver',
    'padi-instructor',
    'padi-advanced-instructor',
    'padi-master-instructor'
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE badge_templates
SET
  is_public = TRUE,
  updated_at = NOW()
WHERE slug IN (
  'molchanovs-lap-1',
  'molchanovs-lap-2',
  'molchanovs-instructor'
);

UPDATE badge_templates
SET
  is_public = FALSE,
  updated_at = NOW()
WHERE slug IN (
  'molchanovs-wave-2i',
  'molchanovs-wave-3i',
  'molchanovs-wave-4i',
  'molchanovs-wave-3it',
  'molchanovs-wave-4it',
  'aida-monofin-freediver',
  'aida-f-emerg-med-responder',
  'aida-competition-freediver',
  'aida-master-instructor',
  'aida-instructor-trainer',
  'aida-instructor-judge',
  'aida-instructor-youth',
  'ssi-performance-instructor',
  'ssi-instructor-trainer',
  'padi-advanced-instructor',
  'padi-master-instructor'
);
-- +goose StatementEnd
