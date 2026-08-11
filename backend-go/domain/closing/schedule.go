package closing

import (
	"fmt"
	"time"
)

// Period identifies an accounting month and the instant when its automatic
// closing became due in the configured business timezone.
type Period struct {
	Year      int
	Month     time.Month
	ClosingAt time.Time
}

func (p Period) Reference() string {
	return fmt.Sprintf("%04d/%02d", p.Year, p.Month)
}

// DuePeriods returns every accounting period whose closing date has passed
// since the pilot was created. A closing day that does not exist in a month is
// moved to that month's last day.
func DuePeriods(createdAt time.Time, closingDay int, now time.Time, location *time.Location) []Period {
	if closingDay < 1 || closingDay > 31 || location == nil || createdAt.IsZero() {
		return nil
	}

	createdLocal := createdAt.In(location)
	nowLocal := now.In(location)
	createdDate := dateOnly(createdLocal, location)
	currentDate := dateOnly(nowLocal, location)
	monthCursor := time.Date(createdLocal.Year(), createdLocal.Month(), 1, 0, 0, 0, 0, location)
	lastMonth := time.Date(nowLocal.Year(), nowLocal.Month(), 1, 0, 0, 0, 0, location)

	periods := make([]Period, 0)
	for !monthCursor.After(lastMonth) {
		lastDay := time.Date(monthCursor.Year(), monthCursor.Month()+1, 0, 0, 0, 0, 0, location).Day()
		effectiveDay := min(closingDay, lastDay)
		closingAt := time.Date(monthCursor.Year(), monthCursor.Month(), effectiveDay, 0, 0, 0, 0, location)

		if !closingAt.Before(createdDate) && !closingAt.After(currentDate) {
			periods = append(periods, Period{
				Year:      monthCursor.Year(),
				Month:     monthCursor.Month(),
				ClosingAt: closingAt,
			})
		}
		monthCursor = monthCursor.AddDate(0, 1, 0)
	}

	return periods
}

func dateOnly(value time.Time, location *time.Location) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, location)
}
