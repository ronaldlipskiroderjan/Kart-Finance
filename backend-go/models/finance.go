package models

import "time"

type ClosingStatus string

const (
	StatusPendente ClosingStatus = "PENDENTE"
	StatusPago     ClosingStatus = "PAGO"
	StatusAtrasado ClosingStatus = "ATRASADO"
)

type Expense struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Description     string    `gorm:"not null" json:"description"`
	Amount          Money     `gorm:"type:numeric(14,2);not null" json:"amount"`
	ReferencePeriod time.Time `gorm:"type:date;not null" json:"referencePeriod"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"createdAt"`
	PilotID         uint      `gorm:"not null" json:"pilotId"`
}

type Reimbursement struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Description     string    `gorm:"not null" json:"description"`
	Amount          Money     `gorm:"type:numeric(14,2);not null" json:"amount"`
	ReferencePeriod time.Time `gorm:"type:date;not null" json:"referencePeriod"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"createdAt"`
	PilotID         uint      `gorm:"not null" json:"pilotId"`
}

type ClosingHistory struct {
	ID                  uint          `gorm:"primaryKey" json:"id"`
	PilotID             uint          `gorm:"not null" json:"pilotId"`
	MonthReference      string        `gorm:"not null" json:"monthReference"`
	TotalAmount         Money         `gorm:"type:numeric(14,2);not null" json:"totalAmount"`
	BaseFee             Money         `gorm:"type:numeric(14,2);not null;default:0" json:"baseFee"`
	TotalExpenses       Money         `gorm:"type:numeric(14,2);not null;default:0" json:"totalExpenses"`
	TotalReimbursements Money         `gorm:"type:numeric(14,2);not null;default:0" json:"totalReimbursements"`
	PdfPath             string        `json:"pdfPath,omitempty"`
	Status              ClosingStatus `gorm:"type:varchar(20);not null;default:'PENDENTE'" json:"status"`
	DueDate             time.Time     `json:"dueDate"`
	PaymentDate         *time.Time    `json:"paymentDate"`
	CreatedAt           time.Time     `gorm:"autoCreateTime" json:"createdAt"`
}
