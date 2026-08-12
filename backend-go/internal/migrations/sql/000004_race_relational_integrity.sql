ALTER TABLE race_entries
    DROP CONSTRAINT IF EXISTS race_entries_race_weekend_id_fkey;
ALTER TABLE race_entries
    ADD CONSTRAINT race_entries_race_weekend_id_fkey
    FOREIGN KEY (race_weekend_id) REFERENCES race_weekends(id) ON DELETE CASCADE;

ALTER TABLE race_entry_reimbursements
    DROP CONSTRAINT IF EXISTS race_entry_reimbursements_race_entry_id_fkey;
ALTER TABLE race_entry_reimbursements
    ADD CONSTRAINT race_entry_reimbursements_race_entry_id_fkey
    FOREIGN KEY (race_entry_id) REFERENCES race_entries(id) ON DELETE CASCADE;

ALTER TABLE race_agendas
    DROP CONSTRAINT IF EXISTS race_agendas_race_weekend_id_fkey;
ALTER TABLE race_agendas
    ADD CONSTRAINT race_agendas_race_weekend_id_fkey
    FOREIGN KEY (race_weekend_id) REFERENCES race_weekends(id) ON DELETE CASCADE;

ALTER TABLE race_agenda_expenses
    DROP CONSTRAINT IF EXISTS race_agenda_expenses_race_agenda_id_fkey;
ALTER TABLE race_agenda_expenses
    ADD CONSTRAINT race_agenda_expenses_race_agenda_id_fkey
    FOREIGN KEY (race_agenda_id) REFERENCES race_agendas(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_entries_status_check') THEN
        ALTER TABLE race_entries ADD CONSTRAINT race_entries_status_check
            CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'closing_histories_status_check') THEN
        ALTER TABLE closing_histories ADD CONSTRAINT closing_histories_status_check
            CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_agendas_saldo_check') THEN
        ALTER TABLE race_agendas ADD CONSTRAINT race_agendas_saldo_check CHECK (saldo >= 0);
    END IF;
END $$;
