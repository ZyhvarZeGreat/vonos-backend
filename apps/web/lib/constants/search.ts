/**
 * Shared typedown debounce for list search bars and async searchable selects.
 * Short enough to feel instant; long enough to avoid a request per keystroke.
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Filter dropdowns with this many options (or more) use a searchable panel
 * instead of a native `<select>`. Short status lists stay native.
 */
export const FILTER_SEARCHABLE_MIN_OPTIONS = 8;
