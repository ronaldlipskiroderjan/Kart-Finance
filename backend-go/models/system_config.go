package models

type SystemConfig struct {
	ID     uint   `gorm:"primaryKey"`
	PixKey string `gorm:"type:varchar(255)"`
}
