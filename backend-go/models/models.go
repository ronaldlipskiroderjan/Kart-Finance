package models

import "time"

type ClosingStatus string 

const (
	StatusPendente ClosingStatus = "PENDENTE"
	StatusPago     ClosingStatus = "PAGO"
	StatusAtrasado ClosingStatus = "ATRASADO"
)

type Admin struct {
	ID		 uint   `gorm:"primaryKey"`
	Name 	 string
	Email 	 string `gorm:"unique"`
	Password string
}

type Pilot struct {
	ID 		          uint             `gorm:"primaryKey"`
	Name              string		   `gorm:"not null"`
	Category          string		   
	BaseFee           float64          `gorm:"not null;default:0"`
	Observations      string		   `gorm:"type:text;"`
	ClosingDay        int			   `gorm:"not null;default:10"`
	CreatedAt         time.Time        `gorm:"autoCreateTime"`
	Expenses          []Expense        `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Reimbursements    []Reimbursement  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	ClosingsHistories []ClosingHistory `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

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