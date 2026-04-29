package models

import "time"

type ClosingStatus string

const (
	StatusPendente ClosingStatus = "PENDENTE"
	StatusPago     ClosingStatus = "PAGO"
	StatusAtrasado ClosingStatus = "ATRASADO"
)

type Expense struct {
	ID          uint      `gorm:"primaryKey"`
	Description string    `gorm:"not null"`
	Amount      float64   `gorm:"not null"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	PilotID     uint      `gorm:"not null"`
}

type Reimbursement struct {
	ID          uint      `gorm:"primaryKey"`
	Description string    `gorm:"not null"`
	Amount      float64   `gorm:"not null"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	PilotID     uint      `gorm:"not null"`
}

type ClosingHistory struct {
	ID                  uint          `gorm:"primaryKey"`
	PilotID             uint          `gorm:"not null"`
	MonthReference      string        `gorm:"not null"`
	TotalAmount         float64       `gorm:"not null"`
	BaseFee             float64
	TotalExpenses       float64
	TotalReimbursements float64
	PdfPath             string
	Status              ClosingStatus `gorm:"type:varchar(20);not null;default:'PENDENTE'"`
	DueDate             time.Time
	PaymentDate         *time.Time
	CreatedAt           time.Time     `gorm:"autoCreateTime"`
}