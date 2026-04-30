package main

import (
	"encoding/json"
	"fmt"
)

type Expense struct {
	PilotID uint
	Amount float64
	Description string
}

func main() {
	jsonData := []byte(`{"pilotId": 14, "amount": 100, "description": "test"}`)
	var e Expense
	err := json.Unmarshal(jsonData, &e)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("%+v\n", e)
}
