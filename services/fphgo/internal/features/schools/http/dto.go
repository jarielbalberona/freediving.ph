package http

import (
	"time"

	schoolsrepo "fphgo/internal/features/schools/repo"
	"fphgo/internal/shared/mediaurl"
)

func mapSchools(items []schoolsrepo.School) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapSchool(item))
	}
	return out
}

func mapSchool(item schoolsrepo.School) map[string]any {
	return map[string]any{
		"id": item.ID, "slug": item.Slug, "name": item.Name, "shortDescription": item.ShortDescription,
		"descriptionMarkdown": item.DescriptionMarkdown, "logoMediaId": item.LogoMediaID, "logoUrl": mediaurl.MaterializeWithDefault(item.LogoURL),
		"coverMediaId": item.CoverMediaID, "coverUrl": mediaurl.MaterializeWithDefault(item.CoverURL),
		"baseLocation": item.BaseLocation, "contactEmail": item.ContactEmail,
		"baseLocationLabel": item.BaseLocationLabel, "formattedAddress": item.FormattedAddress, "regionCode": item.RegionCode,
		"regionName": item.RegionName, "provinceCode": item.ProvinceCode, "provinceName": item.ProvinceName,
		"cityCode": item.CityCode, "cityName": item.CityName, "barangayCode": item.BarangayCode, "barangayName": item.BarangayName,
		"locationSource": item.LocationSource, "diveSiteId": item.DiveSiteID, "diveSiteName": item.DiveSiteName, "diveSiteSlug": item.DiveSiteSlug, "diveSiteArea": item.DiveSiteArea,
		"contactPhone": item.ContactPhone, "websiteUrl": item.WebsiteURL, "facebookUrl": item.FacebookURL, "instagramUrl": item.InstagramURL,
		"status": item.Status, "ownerUserId": item.OwnerUserID, "currentUserRole": item.CurrentUserRole, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
		"courseCount": item.CourseCount, "publishedCourseCount": item.PublishedCourseCount, "pendingBookingCount": item.PendingBookingCount,
		"upcomingSessionCount": item.UpcomingSessionCount, "paymentsToReviewCount": item.PaymentsToReviewCount,
	}
}

func mapPublicSchools(items []schoolsrepo.School) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapPublicSchool(item))
	}
	return out
}

func mapPublicSchool(item schoolsrepo.School) map[string]any {
	return map[string]any{
		"id": item.ID, "slug": item.Slug, "name": item.Name, "shortDescription": item.ShortDescription,
		"descriptionMarkdown": item.DescriptionMarkdown, "baseLocation": publicFirstNonEmpty(item.BaseLocationLabel, item.BaseLocation),
		"logoMediaId": item.LogoMediaID, "logoUrl": mediaurl.MaterializeWithDefault(item.LogoURL),
		"coverMediaId": item.CoverMediaID, "coverUrl": mediaurl.MaterializeWithDefault(item.CoverURL),
		"baseLocationLabel": item.BaseLocationLabel, "formattedAddress": item.FormattedAddress,
		"regionCode": item.RegionCode, "regionName": item.RegionName, "provinceCode": item.ProvinceCode, "provinceName": item.ProvinceName,
		"cityCode": item.CityCode, "cityName": item.CityName, "barangayCode": item.BarangayCode, "barangayName": item.BarangayName,
		"locationSource": item.LocationSource, "diveSiteId": item.DiveSiteID, "diveSiteName": item.DiveSiteName,
		"diveSiteSlug": item.DiveSiteSlug, "diveSiteArea": item.DiveSiteArea,
		"websiteUrl": item.WebsiteURL, "facebookUrl": item.FacebookURL, "instagramUrl": item.InstagramURL,
		"publishedCourseCount": item.PublishedCourseCount, "paymentMethods": mapPaymentMethods(item.PaymentMethods),
	}
}

func mapCourses(items []schoolsrepo.Course) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapCourse(item))
	}
	return out
}

func mapCourse(item schoolsrepo.Course) map[string]any {
	return map[string]any{
		"id": item.ID, "schoolId": item.SchoolID, "slug": item.Slug, "title": item.Title, "shortDescription": item.ShortDescription,
		"descriptionMarkdown": item.DescriptionMarkdown, "courseType": item.CourseType, "level": item.Level, "durationLabel": item.DurationLabel,
		"priceAmount": item.PriceAmount, "currency": item.Currency, "paymentRequired": item.PaymentRequired, "approvalRequired": item.ApprovalRequired,
		"allowSessionBooking": item.AllowSessionBooking, "allowPreferredDateRequest": item.AllowPreferredDateRequest,
		"locationMode": item.LocationMode, "locationLabel": item.LocationLabel, "locationNote": item.LocationNote,
		"formattedAddress": item.FormattedAddress, "regionCode": item.RegionCode, "regionName": item.RegionName,
		"provinceCode": item.ProvinceCode, "provinceName": item.ProvinceName, "cityCode": item.CityCode, "cityName": item.CityName,
		"barangayCode": item.BarangayCode, "barangayName": item.BarangayName, "locationSource": item.LocationSource,
		"diveSiteId": item.DiveSiteID, "includedMarkdown": item.IncludedMarkdown,
		"prerequisitesMarkdown": item.PrerequisitesMarkdown, "equipmentMarkdown": item.EquipmentMarkdown,
		"cancellationPolicyMarkdown": item.CancellationPolicyMarkdown, "availabilityNote": item.AvailabilityNote,
		"status": item.Status, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
		"upcomingSessionCount": item.UpcomingSessionCount, "pendingBookingCount": item.PendingBookingCount,
	}
}

func mapPublicCourses(items []schoolsrepo.Course) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapPublicCourse(item))
	}
	return out
}

func mapPublicCourse(item schoolsrepo.Course) map[string]any {
	return map[string]any{
		"id": item.ID, "schoolId": item.SchoolID, "slug": item.Slug, "title": item.Title, "shortDescription": item.ShortDescription,
		"descriptionMarkdown": item.DescriptionMarkdown, "courseType": item.CourseType, "level": item.Level, "durationLabel": item.DurationLabel,
		"priceAmount": item.PriceAmount, "currency": item.Currency, "paymentRequired": item.PaymentRequired,
		"approvalRequired": item.ApprovalRequired, "allowSessionBooking": item.AllowSessionBooking,
		"allowPreferredDateRequest": item.AllowPreferredDateRequest, "locationMode": item.LocationMode, "locationLabel": item.LocationLabel,
		"locationNote": item.LocationNote, "formattedAddress": item.FormattedAddress, "regionCode": item.RegionCode,
		"regionName": item.RegionName, "provinceCode": item.ProvinceCode, "provinceName": item.ProvinceName,
		"cityCode": item.CityCode, "cityName": item.CityName, "barangayCode": item.BarangayCode,
		"barangayName": item.BarangayName, "locationSource": item.LocationSource, "diveSiteId": item.DiveSiteID,
		"includedMarkdown": item.IncludedMarkdown, "prerequisitesMarkdown": item.PrerequisitesMarkdown,
		"equipmentMarkdown": item.EquipmentMarkdown, "cancellationPolicyMarkdown": item.CancellationPolicyMarkdown,
		"availabilityNote": item.AvailabilityNote, "upcomingSessionCount": item.UpcomingSessionCount,
	}
}

func mapPaymentMethods(items []schoolsrepo.PaymentMethod) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapPaymentMethod(item))
	}
	return out
}

func mapPaymentMethod(item schoolsrepo.PaymentMethod) map[string]any {
	return map[string]any{
		"id": item.ID, "schoolId": item.SchoolID, "type": item.Type, "name": item.Name, "instructions": item.Instructions,
		"qrMediaId": item.QRMediaID, "qrImageUrl": mediaurl.MaterializeWithDefault(item.QRImageURL), "bankName": item.BankName, "accountName": item.AccountName, "accountNumber": item.AccountNumber,
		"isActive": item.IsActive, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
	}
}

func mapMembers(items []schoolsrepo.Member) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapMember(item))
	}
	return out
}

func mapMember(item schoolsrepo.Member) map[string]any {
	return map[string]any{
		"id": item.ID, "schoolId": item.SchoolID, "userId": item.UserID, "username": item.Username,
		"displayName": item.DisplayName, "avatarUrl": mediaurl.MaterializeWithDefault(item.AvatarURL),
		"instructorDisplayName": item.InstructorDisplayName, "instructorBio": item.InstructorBio,
		"role": item.Role, "status": item.Status, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
	}
}

func mapSessions(items []schoolsrepo.Session) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapSession(item))
	}
	return out
}

func mapSession(item schoolsrepo.Session) map[string]any {
	return map[string]any{
		"id": item.ID, "schoolId": item.SchoolID, "courseId": item.CourseID, "courseTitle": item.CourseTitle, "slug": item.Slug,
		"title": item.Title, "startsAt": item.StartsAt, "endsAt": item.EndsAt, "timezone": item.Timezone,
		"locationMode": item.LocationMode, "locationLabel": item.LocationLabel, "locationNote": item.LocationNote,
		"formattedAddress": item.FormattedAddress, "regionCode": item.RegionCode, "regionName": item.RegionName,
		"provinceCode": item.ProvinceCode, "provinceName": item.ProvinceName, "cityCode": item.CityCode, "cityName": item.CityName,
		"barangayCode": item.BarangayCode, "barangayName": item.BarangayName, "locationSource": item.LocationSource,
		"diveSiteId": item.DiveSiteID, "instructorUserId": item.InstructorUserID,
		"instructorDisplayName": item.InstructorDisplayName, "capacity": item.Capacity, "status": item.Status,
		"notesMarkdown": item.NotesMarkdown, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
		"cancelledAt": item.CancelledAt, "completedAt": item.CompletedAt, "assignedBookingCount": item.AssignedBookingCount,
	}
}

func mapPublicSessions(items []schoolsrepo.Session) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapPublicSession(item))
	}
	return out
}

func mapPublicSession(item schoolsrepo.Session) map[string]any {
	var slotsLeft *int
	isFull := false
	if item.Capacity != nil {
		left := *item.Capacity - item.AssignedBookingCount
		if left < 0 {
			left = 0
		}
		slotsLeft = &left
		isFull = left == 0
	}
	return map[string]any{
		"id": item.ID, "slug": item.Slug, "courseId": item.CourseID, "title": item.Title,
		"startsAt": item.StartsAt, "endsAt": item.EndsAt, "timezone": item.Timezone,
		"locationLabel": item.LocationLabel, "formattedAddress": item.FormattedAddress,
		"diveSiteId": item.DiveSiteID, "instructorDisplayName": item.InstructorDisplayName,
		"capacity": item.Capacity, "bookedCount": item.AssignedBookingCount,
		"slotsLeft": slotsLeft, "isFull": isFull,
	}
}

func mapBookings(items []schoolsrepo.Booking) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapBooking(item))
	}
	return out
}

func mapBooking(item schoolsrepo.Booking) map[string]any {
	return map[string]any{
		"id": item.ID, "courseId": item.CourseID, "courseTitle": item.CourseTitle, "schoolId": item.SchoolID,
		"sessionId": item.SessionID, "sessionTitle": item.SessionTitle, "studentUserId": item.StudentUserID,
		"studentName": item.StudentName, "studentEmail": item.StudentEmail, "studentPhone": item.StudentPhone,
		"bookingMode": item.BookingMode, "preferredDate": dateString(item.PreferredDate), "alternateDate": datePtr(item.AlternateDate),
		"status": item.Status, "studentNote": item.StudentNote, "experienceLevel": item.ExperienceLevel,
		"certificationLevel": item.CertificationLevel, "equipmentNeeds": item.EquipmentNeeds, "adminNotes": item.AdminNotes,
		"createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt, "reviewedAt": item.ReviewedAt, "reviewedBy": item.ReviewedBy,
		"scheduledAt": item.ScheduledAt, "cancelledAt": item.CancelledAt, "completedAt": item.CompletedAt, "payment": mapBookingPaymentPtr(item.Payment),
	}
}

func mapMyBookings(items []schoolsrepo.Booking) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, mapMyBooking(item))
	}
	return out
}

func mapMyBooking(item schoolsrepo.Booking) map[string]any {
	return map[string]any{
		"id": item.ID, "courseId": item.CourseID, "courseTitle": item.CourseTitle, "schoolId": item.SchoolID,
		"sessionId": item.SessionID, "sessionTitle": item.SessionTitle, "studentName": item.StudentName,
		"studentEmail": item.StudentEmail, "studentPhone": item.StudentPhone, "bookingMode": item.BookingMode, "preferredDate": dateString(item.PreferredDate),
		"alternateDate": datePtr(item.AlternateDate), "status": item.Status, "studentNote": item.StudentNote,
		"experienceLevel": item.ExperienceLevel, "certificationLevel": item.CertificationLevel, "equipmentNeeds": item.EquipmentNeeds,
		"createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt, "scheduledAt": item.ScheduledAt,
		"cancelledAt": item.CancelledAt, "completedAt": item.CompletedAt, "payment": mapStudentBookingPaymentPtr(item.Payment),
	}
}

func mapBookingPaymentPtr(item *schoolsrepo.BookingPayment) map[string]any {
	if item == nil {
		return nil
	}
	return mapBookingPayment(*item)
}

func mapStudentBookingPaymentPtr(item *schoolsrepo.BookingPayment) map[string]any {
	if item == nil {
		return nil
	}
	return map[string]any{
		"id": item.ID, "bookingId": item.BookingID, "courseId": item.CourseID, "schoolId": item.SchoolID,
		"studentUserId": item.StudentUserID, "paymentMethodId": item.PaymentMethodID, "amount": item.Amount,
		"currency": item.Currency, "proofMediaId": item.ProofMediaID, "referenceNumber": item.ReferenceNumber,
		"status": item.Status, "reviewedAt": item.ReviewedAt, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
	}
}

func mapBookingPayment(item schoolsrepo.BookingPayment) map[string]any {
	return map[string]any{
		"id": item.ID, "bookingId": item.BookingID, "courseId": item.CourseID, "schoolId": item.SchoolID,
		"studentUserId": item.StudentUserID, "paymentMethodId": item.PaymentMethodID, "amount": item.Amount,
		"currency": item.Currency, "proofMediaId": item.ProofMediaID, "referenceNumber": item.ReferenceNumber,
		"status": item.Status, "reviewedBy": item.ReviewedBy, "reviewedAt": item.ReviewedAt,
		"reviewNotes": item.ReviewNotes, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
	}
}

func datePtr(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.Format("2006-01-02")
}

func dateString(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.Format("2006-01-02")
}

func publicFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
