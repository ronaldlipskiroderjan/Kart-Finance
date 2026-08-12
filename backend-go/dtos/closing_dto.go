package dtos

import "kartfinance-api/models"

type ClosingSummaryDTO struct {
	PilotName           string       `json:"pilotName"`
	BaseFee             models.Money `json:"baseFee"`
	TotalExpenses       models.Money `json:"totalExpenses"`
	TotalReimbursements models.Money `json:"totalReimbursements"`
	TotalAmount         models.Money `json:"totalAmount"` // Valor deste mês apenas
	PreviousDebt        models.Money `json:"previousDebt"`
	UnpaidMonthsCount   int          `json:"unpaidMonthsCount"`
	FinalAmount         models.Money `json:"finalAmount"` // totalAmount + previousDebt
	Year                int          `json:"year"`
	Month               int          `json:"month"`
}
