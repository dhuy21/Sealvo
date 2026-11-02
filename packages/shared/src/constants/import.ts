/** Largest spreadsheet the import accepts, checked by the web form before upload and by the API */
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Most words one spreadsheet import or one bulk add may contain */
export const MAX_IMPORT_ROWS = 500;

/** How long a background job (import, bulk add) stays known to the server, and resumable by the web app */
export const JOB_TTL_SECONDS = 3600;
