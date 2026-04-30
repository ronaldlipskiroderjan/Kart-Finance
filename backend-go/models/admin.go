package models


type Admin struct {
	ID       uint   `gorm:"primaryKey"`
	Name     string `gorm:"not null"`
	Email    string `gorm:"unique;not null"`
	Password string `gorm:"not null"`
	PixKey   string `gorm:"type:varchar(255)"`
	Role     string `gorm:"type:varchar(50);default:'admin'"`
}