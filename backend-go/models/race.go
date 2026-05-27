package models

import "time"

type RaceEntryStatus string

const (
	RaceStatusPendente RaceEntryStatus = "PENDENTE"
	RaceStatusPago     RaceEntryStatus = "PAGO"
	RaceStatusAtrasado RaceEntryStatus = "ATRASADO"
)

type RaceWeekend struct {
	ID          uint        `gorm:"primaryKey"`
	Name        string      `gorm:"not null"`
	Date        time.Time   `gorm:"not null"`
	Description string
	CreatedAt   time.Time   `gorm:"autoCreateTime"`
	Entries     []RaceEntry `gorm:"foreignKey:RaceWeekendID"`
}

// GuestPilot é um piloto avulso (só participa de corridas, sem mensalidade).
// O nome é salvo para reuso em corridas futuras.
type GuestPilot struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"not null;uniqueIndex"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

type RaceEntry struct {
	ID             uint                     `gorm:"primaryKey"`
	RaceWeekendID  uint                     `gorm:"not null"`
	PilotID        *uint                    // nullable — nil quando for piloto convidado
	GuestPilotID   *uint                    // nullable — nil quando for piloto mensal
	Amount         float64                  `gorm:"not null"`
	Status         RaceEntryStatus          `gorm:"type:varchar(20);not null;default:'PENDENTE'"`
	DueDate        time.Time
	PaymentDate    *time.Time
	CreatedAt      time.Time                `gorm:"autoCreateTime"`
	Pilot          *Pilot                   `gorm:"foreignKey:PilotID"`
	GuestPilot     *GuestPilot              `gorm:"foreignKey:GuestPilotID"`
	RaceWeekend    RaceWeekend              `gorm:"foreignKey:RaceWeekendID"`
	Extras         []RaceEntryExpense       `gorm:"foreignKey:RaceEntryID"`
	Reimbursements []RaceEntryReimbursement `gorm:"foreignKey:RaceEntryID"`
}

type RaceEntryExpense struct {
	ID           uint      `gorm:"primaryKey"`
	RaceEntryID  uint      `gorm:"not null"`
	Description  string    `gorm:"not null"`
	Amount       float64   `gorm:"not null"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

type RaceEntryReimbursement struct {
	ID           uint      `gorm:"primaryKey"`
	RaceEntryID  uint      `gorm:"not null"`
	Description  string    `gorm:"not null"`
	Amount       float64   `gorm:"not null"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

// RaceAgenda é uma "caixinha" de controle de saldo por fim de semana de corrida.
// Não tem vínculo com pilotos ou cobranças — é apenas controle pessoal do organizador.
type RaceAgenda struct {
	ID            uint                `gorm:"primaryKey"`
	RaceWeekendID uint                `gorm:"uniqueIndex;not null"`
	Saldo         float64             `gorm:"not null;default:0"`
	CreatedAt     time.Time           `gorm:"autoCreateTime"`
	UpdatedAt     time.Time           `gorm:"autoUpdateTime"`
	Expenses      []RaceAgendaExpense `gorm:"foreignKey:RaceAgendaID"`
}

// RaceAgendaExpense é um gasto que subtrai do saldo da RaceAgenda.
type RaceAgendaExpense struct {
	ID           uint      `gorm:"primaryKey"`
	RaceAgendaID uint      `gorm:"not null"`
	Description  string    `gorm:"not null"`
	Amount       float64   `gorm:"not null"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}
