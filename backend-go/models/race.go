package models

import "time"

type RaceEntryStatus string

const (
	RaceStatusPendente RaceEntryStatus = "PENDENTE"
	RaceStatusPago     RaceEntryStatus = "PAGO"
	RaceStatusAtrasado RaceEntryStatus = "ATRASADO"
)

type RaceWeekend struct {
	ID          uint        `gorm:"primaryKey" json:"id"`
	Name        string      `gorm:"not null" json:"name"`
	Date        time.Time   `gorm:"not null" json:"date"`
	Description string      `json:"description"`
	CreatedAt   time.Time   `gorm:"autoCreateTime" json:"createdAt"`
	Entries     []RaceEntry `gorm:"foreignKey:RaceWeekendID" json:"entries,omitempty"`
}

// GuestPilot é um piloto avulso (só participa de corridas, sem mensalidade).
// O nome é salvo para reuso em corridas futuras.
type GuestPilot struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null;uniqueIndex" json:"name"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

type RaceEntry struct {
	ID             uint                     `gorm:"primaryKey" json:"id"`
	RaceWeekendID  uint                     `gorm:"not null" json:"raceWeekendId"`
	PilotID        *uint                    `json:"pilotId,omitempty"`
	GuestPilotID   *uint                    `json:"guestPilotId,omitempty"`
	Amount         Money                    `gorm:"type:numeric(14,2);not null" json:"amount"`
	Status         RaceEntryStatus          `gorm:"type:varchar(20);not null;default:'PENDENTE'" json:"status"`
	DueDate        time.Time                `json:"dueDate"`
	PaymentDate    *time.Time               `json:"paymentDate"`
	CreatedAt      time.Time                `gorm:"autoCreateTime" json:"createdAt"`
	Pilot          *Pilot                   `gorm:"foreignKey:PilotID" json:"pilot,omitempty"`
	GuestPilot     *GuestPilot              `gorm:"foreignKey:GuestPilotID" json:"guestPilot,omitempty"`
	RaceWeekend    RaceWeekend              `gorm:"foreignKey:RaceWeekendID" json:"raceWeekend,omitempty"`
	Extras         []RaceEntryExpense       `gorm:"foreignKey:RaceEntryID" json:"extras,omitempty"`
	Reimbursements []RaceEntryReimbursement `gorm:"foreignKey:RaceEntryID" json:"reimbursements,omitempty"`
}

type RaceEntryExpense struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	RaceEntryID uint      `gorm:"not null" json:"raceEntryId"`
	Description string    `gorm:"not null" json:"description"`
	Amount      Money     `gorm:"type:numeric(14,2);not null" json:"amount"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

type RaceEntryReimbursement struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	RaceEntryID uint      `gorm:"not null" json:"raceEntryId"`
	Description string    `gorm:"not null" json:"description"`
	Amount      Money     `gorm:"type:numeric(14,2);not null" json:"amount"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

// RaceAgenda é uma "caixinha" de controle de saldo por fim de semana de corrida.
// Não tem vínculo com pilotos ou cobranças — é apenas controle pessoal do organizador.
type RaceAgenda struct {
	ID            uint                `gorm:"primaryKey" json:"id"`
	RaceWeekendID uint                `gorm:"uniqueIndex;not null" json:"raceWeekendId"`
	Saldo         Money               `gorm:"type:numeric(14,2);not null;default:0" json:"saldo"`
	CreatedAt     time.Time           `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time           `gorm:"autoUpdateTime" json:"updatedAt"`
	Expenses      []RaceAgendaExpense `gorm:"foreignKey:RaceAgendaID" json:"expenses,omitempty"`
}

// RaceAgendaExpense é um gasto que subtrai do saldo da RaceAgenda.
type RaceAgendaExpense struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	RaceAgendaID uint      `gorm:"not null" json:"raceAgendaId"`
	Description  string    `gorm:"not null" json:"description"`
	Amount       Money     `gorm:"type:numeric(14,2);not null" json:"amount"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"createdAt"`
}
