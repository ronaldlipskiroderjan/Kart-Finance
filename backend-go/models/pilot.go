package models

import "time"

type Pilot struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	Category     string    `json:"category"`
	BaseFee      Money     `gorm:"type:numeric(14,2);not null;default:0" json:"baseFee"`
	Observations string    `gorm:"type:text" json:"observations"`
	ClosingDay   int       `gorm:"not null;default:10" json:"closingDay"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"createdAt"`

	Expenses         []Expense        `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"expenses,omitempty"`
	Reimbursements   []Reimbursement  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"reimbursements,omitempty"`
	ClosingHistories []ClosingHistory `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"closingHistories,omitempty"`
}
