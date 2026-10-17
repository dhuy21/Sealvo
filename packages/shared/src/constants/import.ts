/** Largest spreadsheet the import accepts, checked by the web form before upload and by the API */
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** How long a background job (import, bulk add) stays known to the server, and resumable by the web app */
export const JOB_TTL_SECONDS = 3600;
