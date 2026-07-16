create table if not exists projects (
  user_id uuid not null,
  id text primary key,
  name text not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  unit text not null,
  temp_mode text not null,
  start_date date not null,
  end_date date not null,
  stitches_per_row integer not null,
  row_height integer not null,
  craft_type text not null,
  stitch_name text not null,
  preview_orientation text not null,
  notes text,
  allow_range_gaps boolean not null default false,
  preferred_yarn_brand_id text,
  recommendation_mode text not null,
  weather_source text not null,
  weather_source_label text not null,
  weather_status_message text,
  archived_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists temperature_ranges (
  user_id uuid not null,
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  min_temp integer not null,
  max_temp integer not null,
  hex_color text not null,
  label text not null,
  yarn_name text not null,
  notes text,
  recommended_yarn_color_id text,
  recommended_yarn_brand_id text,
  locked_to_recommended_yarn boolean default false,
  user_overrode_recommendation boolean default false,
  sort_order integer not null
);

create table if not exists temperature_days (
  user_id uuid not null,
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  date date not null,
  temp_high double precision,
  temp_low double precision,
  temp_avg double precision,
  selected_temp double precision,
  mapped_range_id text,
  mapped_color text,
  missing_data boolean default false
);

create table if not exists build_progress_rows (
  user_id uuid not null,
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  date date not null,
  row_number integer not null,
  completed boolean not null default false,
  completed_at timestamptz
);

create table if not exists weather_cache (
  user_id uuid not null,
  key text primary key,
  project_id text references projects(id) on delete cascade,
  fetched_at timestamptz not null,
  start_date date not null,
  end_date date not null,
  latitude double precision not null,
  longitude double precision not null,
  unit text not null,
  daily jsonb not null,
  source text not null,
  provider_label text not null,
  missing_days integer not null default 0,
  warning_message text,
  fallback_reason text
);
