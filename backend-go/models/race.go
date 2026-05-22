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

type RaceEntry struct {
	ID            uint               `gorm:"primaryKey"`
	RaceWeekendID uint               `gorm:"not null"`
	PilotID       uint               `gorm:"not null"`
	Amount        float64            `gorm:"not null"`
	Status        RaceEntryStatus    `gorm:"type:varchar(20);not null;default:'PENDENTE'"`
	DueDate       time.Time
	PaymentDate   *time.Time
	CreatedAt     time.Time          `gorm:"autoCreateTime"`
	Pilot         Pilot              `gorm:"foreignKey:PilotID"`
	RaceWeekend   RaceWeekend        `gorm:"foreignKey:RaceWeekendID"`
	Extras        []RaceEntryExpense `gorm:"foreignKey:RaceEntryID"`
}

type RaceEntryExpense struct {
	ID           uint      `gorm:"primaryKey"`
	RaceEntryID  uint      `gorm:"not null"`
	Description  string    `gorm:"not null"`
	Amount       float64   `gorm:"not null"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}
