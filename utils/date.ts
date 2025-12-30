/**
 * Converts a date string (YYYY-MM-DD) to an ISO UTC string, assuming the input date is in Vietnam Time (UTC+07:00).
 * 
 * @param dateStr The date string in YYYY-MM-DD format.
 * @param isEnd If true, returns the end of the day (23:59:59.999). If false, returns the start of the day (00:00:00).
 * @returns ISO 8601 UTC string (e.g., "2023-10-04T17:00:00.000Z")
 */
export function getUTCRange(dateStr: string, isEnd: boolean = false): string {
    // Construct ISO string with explicit +07:00 offset
    // Start: YYYY-MM-DDT00:00:00+07:00
    // End:   YYYY-MM-DDT23:59:59.999+07:00
    const timePart = isEnd ? '23:59:59.999' : '00:00:00';
    const isoWithOffset = `${dateStr}T${timePart}+07:00`;

    // Convert to simplified ISO string (UTC)
    return new Date(isoWithOffset).toISOString();
}
