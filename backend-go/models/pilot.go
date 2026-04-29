package models

import "time"

type Pilot struct {
	ID               uint             `gorm:"primaryKey"`
	Name             string           `gorm:"not null"`
	Category         string           
	BaseFee          float64          `gorm:"not null;default:0"`
	Observations     string           `gorm:"type:text"`
	ClosingDay       int              `gorm:"not null;default:10"`
	CreatedAt        time.Time        `gorm:"autoCreateTime"`
	
	Expenses         []Expense        `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Reimbursements   []Reimbursement  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	ClosingHistories []ClosingHistory `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}