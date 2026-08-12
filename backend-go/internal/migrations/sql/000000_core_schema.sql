CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    pix_key VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS pilots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    base_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    observations TEXT,
    closing_day INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    reference_period DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pilot_id BIGINT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reimbursements (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    reference_period DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pilot_id BIGINT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS closing_histories (
    id BIGSERIAL PRIMARY KEY,
    pilot_id BIGINT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
    month_reference VARCHAR(7) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    base_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_reimbursements NUMERIC(14,2) NOT NULL DEFAULT 0,
    pdf_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    due_date TIMESTAMPTZ,
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_configs (
    id BIGSERIAL PRIMARY KEY,
    pix_key VARCHAR(255)
);

