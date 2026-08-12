ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS guest_pilot_id BIGINT REFERENCES guest_pilots(id) ON DELETE SET NULL;
ALTER TABLE race_entries ALTER COLUMN pilot_id DROP NOT NULL;


ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference_period DATE;
UPDATE expenses
SET reference_period = DATE_TRUNC('month', created_at)::date
WHERE reference_period IS NULL;
ALTER TABLE expenses ALTER COLUMN reference_period SET NOT NULL;

ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS reference_period DATE;
UPDATE reimbursements
SET reference_period = DATE_TRUNC('month', created_at)::date
WHERE reference_period IS NULL;
ALTER TABLE reimbursements ALTER COLUMN reference_period SET NOT NULL;

ALTER TABLE pilots ALTER COLUMN base_fee TYPE NUMERIC(14,2) USING ROUND(base_fee::numeric, 2);
ALTER TABLE expenses ALTER COLUMN amount TYPE NUMERIC(14,2) USING ROUND(amount::numeric, 2);
ALTER TABLE reimbursements ALTER COLUMN amount TYPE NUMERIC(14,2) USING ROUND(amount::numeric, 2);
ALTER TABLE closing_histories ALTER COLUMN total_amount TYPE NUMERIC(14,2) USING ROUND(total_amount::numeric, 2);
ALTER TABLE closing_histories ALTER COLUMN base_fee TYPE NUMERIC(14,2) USING ROUND(base_fee::numeric, 2);
ALTER TABLE closing_histories ALTER COLUMN total_expenses TYPE NUMERIC(14,2) USING ROUND(total_expenses::numeric, 2);
ALTER TABLE closing_histories ALTER COLUMN total_reimbursements TYPE NUMERIC(14,2) USING ROUND(total_reimbursements::numeric, 2);
ALTER TABLE race_entries ALTER COLUMN amount TYPE NUMERIC(14,2) USING ROUND(amount::numeric, 2);
ALTER TABLE race_entry_expenses ALTER COLUMN amount TYPE NUMERIC(14,2) USING ROUND(amount::numeric, 2);
ALTER TABLE race_entry_reimbursements ALTER COLUMN amount TYPE NUMERIC(14,2) USING ROUND(amount::numeric, 2);
ALTER TABLE race_agendas ALTER COLUMN saldo TYPE NUMERIC(14,2) USING ROUND(saldo::numeric, 2);
ALTER TABLE race_agenda_expenses ALTER COLUMN amount TYPE NUMERIC(14,2) USING ROUND(amount::numeric, 2);

CREATE UNIQUE INDEX IF NOT EXISTS closing_histories_pilot_period_uidx
    ON closing_histories (pilot_id, month_reference);
CREATE UNIQUE INDEX IF NOT EXISTS race_entries_weekend_pilot_uidx
    ON race_entries (race_weekend_id, pilot_id) WHERE pilot_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS race_entries_weekend_guest_uidx
    ON race_entries (race_weekend_id, guest_pilot_id) WHERE guest_pilot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_pilot_period_idx ON expenses (pilot_id, reference_period);
CREATE INDEX IF NOT EXISTS reimbursements_pilot_period_idx ON reimbursements (pilot_id, reference_period);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pilots_closing_day_check') THEN
        ALTER TABLE pilots ADD CONSTRAINT pilots_closing_day_check CHECK (closing_day BETWEEN 1 AND 31);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entries_pilot_type_check') THEN
        ALTER TABLE race_entries ADD CONSTRAINT race_entries_pilot_type_check
            CHECK ((pilot_id IS NOT NULL) <> (guest_pilot_id IS NOT NULL));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entries_amount_check') THEN
        ALTER TABLE race_entries ADD CONSTRAINT race_entries_amount_check CHECK (amount >= 0);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entries_pilot_id_fkey') THEN
        ALTER TABLE race_entries DROP CONSTRAINT race_entries_pilot_id_fkey;
    END IF;
    ALTER TABLE race_entries ADD CONSTRAINT race_entries_pilot_id_fkey
        FOREIGN KEY (pilot_id) REFERENCES pilots(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entry_expenses_race_entry_id_fkey') THEN
        ALTER TABLE race_entry_expenses DROP CONSTRAINT race_entry_expenses_race_entry_id_fkey;
    END IF;
    ALTER TABLE race_entry_expenses ADD CONSTRAINT race_entry_expenses_race_entry_id_fkey
        FOREIGN KEY (race_entry_id) REFERENCES race_entries(id) ON DELETE CASCADE;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_check') THEN
        ALTER TABLE expenses ADD CONSTRAINT expenses_amount_check CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reimbursements_amount_check') THEN
        ALTER TABLE reimbursements ADD CONSTRAINT reimbursements_amount_check CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entry_expenses_amount_check') THEN
        ALTER TABLE race_entry_expenses ADD CONSTRAINT race_entry_expenses_amount_check CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entry_reimbursements_amount_check') THEN
        ALTER TABLE race_entry_reimbursements ADD CONSTRAINT race_entry_reimbursements_amount_check CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_agenda_expenses_amount_check') THEN
        ALTER TABLE race_agenda_expenses ADD CONSTRAINT race_agenda_expenses_amount_check CHECK (amount > 0);
    END IF;

END $$;

