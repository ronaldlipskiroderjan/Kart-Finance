package dtos

type ClosingSummaryDTO struct {
	PilotName            string  `json:"pilotName"`
	BaseFee              float64 `json:"baseFee"`
	TotalExpenses        float64 `json:"totalExpenses"`
	TotalReimbursements  float64 `json:"totalReimbursements"`
	TotalAmount          float64 `json:"totalAmount"`
	Year                 int `json:"year"`
	Month                int `json:"month"`
}