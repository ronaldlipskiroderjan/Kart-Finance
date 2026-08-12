package models

type SystemConfig struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	PixKey string `gorm:"type:varchar(255)" json:"pixKey"`
}
