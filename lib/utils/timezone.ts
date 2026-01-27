import { DateTime } from 'luxon';

/**
 * Converts a UTC timestamp (from DB) to the tenant's timezone.
 * @param utcString ISO string from DB (e.g. '2023-10-27T10:00:00Z')
 * @param timezone Tenant's timezone (e.g. 'Africa/Lagos')
 * @returns DateTime object in tenant's timezone
 */
export function toTenantTime(utcString: string | Date, timezone: string): DateTime {
    return DateTime.fromJSDate(new Date(utcString)).setZone(timezone);
}

/**
 * Converts a tenant-local time to UTC for storage.
 * @param dateString ISO string or date part (e.g. '2023-10-27T10:00:00')
 * @param timezone Tenant's timezone
 * @returns ISO string in UTC
 */
export function toUTC(dateString: string, timezone: string): string {
    return DateTime.fromISO(dateString, { zone: timezone }).toUTC().toISO() || '';
}

/**
 * Gets the current time in the tenant's timezone.
 */
export function nowInTenantTime(timezone: string): DateTime {
    return DateTime.now().setZone(timezone);
}

/**
 * Parses a time string (HH:MM) and combines it with a date in the tenant's timezone.
 * @param timeString "09:00"
 * @param date DateTime object representing the day
 * @param timezone Tenant's timezone
 */
export function parseTimeOnDate(timeString: string, date: DateTime, timezone: string): DateTime {
    const [hours, minutes] = timeString.split(':').map(Number);
    return date.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 }).setZone(timezone);
}
