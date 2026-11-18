import { MIN_BOOKING_DAYS, minBookingDate } from "./bookingRules";
test("requires three calendar days in Vietnam, including the midnight boundary", () => {
  expect(MIN_BOOKING_DAYS).toBe(3);
  expect(minBookingDate(Date.parse("2026-11-17T16:59:59Z"))).toBe("2026-11-20");
  expect(minBookingDate(Date.parse("2026-11-17T17:00:00Z"))).toBe("2026-11-21");
  expect(minBookingDate(Date.parse("2026-12-30T10:00:00Z"))).toBe("2027-01-02");
});
