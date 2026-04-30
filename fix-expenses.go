package main

import (
	"fmt"
	"kartfinance-api/repository"
	"kartfinance-api/models"
	"time"
)

func main() {
	repo := repository.NewAppRepository()
	
	// Let's find expenses created today and bump their created_at to May 1st 2026
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	
	var expenses []models.Expense
	repo.DB.Where("created_at >= ?", startOfDay).Find(&expenses)
	
	for _, e := range expenses {
		// If it was created today, let's bump it to the active month (which should be May if pilot closed April)
		// For safety, let's just push them all to May 1st 2026
		newTime := time.Date(2026, time.May, 1, e.CreatedAt.Hour(), e.CreatedAt.Minute(), e.CreatedAt.Second(), e.CreatedAt.Nanosecond(), e.CreatedAt.Location())
		repo.DB.Model(&e).Update("created_at", newTime)
		fmt.Println("Fixed expense:", e.ID, e.Description)
	}

	var reimbursements []models.Reimbursement
	repo.DB.Where("created_at >= ?", startOfDay).Find(&reimbursements)
	for _, r := range reimbursements {
		newTime := time.Date(2026, time.May, 1, r.CreatedAt.Hour(), r.CreatedAt.Minute(), r.CreatedAt.Second(), r.CreatedAt.Nanosecond(), r.CreatedAt.Location())
		repo.DB.Model(&r).Update("created_at", newTime)
		fmt.Println("Fixed reimbursement:", r.ID, r.Description)
	}
}
