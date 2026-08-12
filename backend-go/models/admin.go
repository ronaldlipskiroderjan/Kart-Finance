package models

type Admin struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Name     string `gorm:"not null" json:"name"`
	Email    string `gorm:"unique;not null" json:"email"`
	Password string `gorm:"not null" json:"-"`
	PixKey   string `gorm:"type:varchar(255)" json:"pixKey"`
	Role     string `gorm:"type:varchar(50);default:'admin'" json:"role"`
}
