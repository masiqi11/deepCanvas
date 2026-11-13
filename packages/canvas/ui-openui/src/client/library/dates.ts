/** Date reading for planning components: model-written days become calendar positions. */

const DAY_MS = 86_400_000
const WEEKDAYS = [
  ['1', 'mon', 'monday', '周一', '星期一', '一'],
  ['2', 'tue', 'tues', 'tuesday', '周二', '星期二', '二'],
  ['3', 'wed', 'wednesday', '周三', '星期三', '三'],
  ['4', 'thu', 'thur', 'thurs', 'thursday', '周四', '星期四', '四'],
  ['5', 'fri', 'friday', '周五', '星期五', '五'],
  ['6', 'sat', 'saturday', '周六', '星期六', '六'],
  ['7', '0', 'sun', 'sunday', '周日', '星期日', '周天', '星期天', '日'],
]

/**
 * Read a weekday: 1 (Monday) to 7 (Sunday), or a Chinese or English day name.
 * @param value - weekday as written.
 * @returns 0 (Monday) to 6 (Sunday), or -1 when it names no weekday.
 */
export function weekdayIndex(value: unknown): number {
  const text = String(value ?? '').trim().toLowerCase().replace(/\.$/, '')
  return WEEKDAYS.findIndex(names => names.includes(text))
}

/**
 * Read a calendar date written as YYYY-MM-DD, MM-DD, M/D or M月D日; a date without a year takes the reference year.
 * @param value - date as written.
 * @param reference - supplies the year when the text has none.
 * @returns local midnight of that date, or null when the text is no date.
 */
export function readDate(value: unknown, reference: Date): Date | null {
  const match = /^(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})日?$/.exec(String(value ?? '').trim())
  if (!match) return null
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Number(match[1] ?? reference.getFullYear()), month - 1, day)
  // The Date constructor rolls 11-31 over to 12-01; such text names no calendar day.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

/**
 * Local midnight of a moment.
 * @param moment - any time on the day.
 * @returns that day at 00:00 local time.
 */
export const startOfDay = (moment: Date): Date => new Date(moment.getFullYear(), moment.getMonth(), moment.getDate())

/**
 * Whole days from one day to another.
 * @param from - earlier day.
 * @param to - later day.
 * @returns the count, negative when `to` is before `from`.
 */
export const daysBetween = (from: Date, to: Date): number => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)

/**
 * A day some days after another.
 * @param from - starting day.
 * @param days - days to add.
 * @returns the later day at local midnight.
 */
export const addDays = (from: Date, days: number): Date => new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)

/**
 * Monday-based weekday of a date.
 * @param date - any date.
 * @returns 0 (Monday) to 6 (Sunday).
 */
export const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7
