/** Prefix of every notice this plugin shows. */
export const NOTICE_PREFIX = "WakaTime Box: ";

/**
 * Page where users copy their personal OAuth token.
 *
 * WakaTime only accepts API keys from plugins that *write* activity; reading
 * stats with an API key is refused (HTTP 403) and requires an OAuth token.
 */
export const TOKEN_URL = "https://wakatime.com/oauth";

/** How often the stats of the current day are refreshed automatically. */
export const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

/** Date format used for every WakaTime request and daily note lookup. */
export const DATE_FORMAT = "YYYY-MM-DD";