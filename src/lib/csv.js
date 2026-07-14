/**
 * Minimal CSV parser: handles quoted fields (with embedded commas,
 * newlines, and "" escaped quotes), strips a UTF-8 BOM if present, and
 * accepts both CRLF and LF line endings. No external dependency.
 *
 * @param {string} text Raw file contents.
 * @returns {string[][]} Rows of raw string cells, header row included.
 */
export function parseCsvRows(text) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip; \n (here or following) ends the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const HEADER_ALIASES = {
  username: ['username', 'user', 'login'],
  display_name: ['displayname', 'fullname', 'name', 'student'],
};

/**
 * Normalizes a header cell for matching: lowercase, strip spaces and
 * underscores.
 * @param {string} h
 * @returns {string}
 */
function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * Parses a student-list CSV into objects with `username` and
 * `display_name` keys, using the header row to find those two columns
 * under a handful of common aliases (case/spacing-insensitive).
 *
 * @param {string} text Raw file contents.
 * @returns {{ rows: {username: string, display_name: string}[], error: string|null }}
 */
export function parseStudentCsv(text) {
  const rows = parseCsvRows(text);

  if (rows.length === 0) {
    return { rows: [], error: 'The file is empty' };
  }

  const headers = rows[0].map(normalizeHeader);
  const usernameIndex = headers.findIndex((h) => HEADER_ALIASES.username.includes(h));
  const displayNameIndex = headers.findIndex((h) => HEADER_ALIASES.display_name.includes(h));

  if (usernameIndex === -1 || displayNameIndex === -1) {
    return {
      rows: [],
      error: 'Could not find "username" and "display_name" columns in the header row',
    };
  }

  const dataRows = rows.slice(1).map((r) => ({
    username: (r[usernameIndex] ?? '').trim(),
    display_name: (r[displayNameIndex] ?? '').trim(),
  }));

  return { rows: dataRows.filter((r) => r.username !== '' || r.display_name !== ''), error: null };
}
