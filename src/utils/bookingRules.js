export const MIN_BOOKING_DAYS = 3;
export const minBookingDate = (now = Date.now()) => new Date(now + MIN_BOOKING_DAYS * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
