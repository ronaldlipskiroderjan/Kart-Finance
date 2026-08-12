package models

import "time"

type AdminSession struct {
	ID         string    `gorm:"type:uuid;primaryKey" json:"-"`
	AdminID    uint      `gorm:"not null;index" json:"-"`
	TokenHash  string    `gorm:"type:char(64);not null;uniqueIndex" json:"-"`
	CSRFToken  string    `gorm:"type:char(64);not null" json:"-"`
	ExpiresAt  time.Time `gorm:"not null;index" json:"-"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"-"`
	LastSeenAt time.Time `gorm:"not null" json:"-"`
	Admin      Admin     `gorm:"foreignKey:AdminID" json:"-"`
}
