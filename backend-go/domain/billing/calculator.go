package billing

import "kartfinance-api/models"

type Summary struct {
	BaseFee             models.Money
	TotalExpenses       models.Money
	TotalReimbursements models.Money
	CurrentPeriodAmount models.Money
	PreviousDebt        models.Money
	FinalAmount         models.Money
	UnpaidPeriodsCount  int
}

func Calculate(baseFee models.Money, expenses, reimbursements, overdue []models.Money) Summary {
	totalExpenses := models.SumMoney(expenses...)
	totalReimbursements := models.SumMoney(reimbursements...)
	previousDebt := models.SumMoney(overdue...)
	current := baseFee + totalExpenses - totalReimbursements

	return Summary{
		BaseFee:             baseFee,
		TotalExpenses:       totalExpenses,
		TotalReimbursements: totalReimbursements,
		CurrentPeriodAmount: current,
		PreviousDebt:        previousDebt,
		FinalAmount:         current + previousDebt,
		UnpaidPeriodsCount:  len(overdue),
	}
}
