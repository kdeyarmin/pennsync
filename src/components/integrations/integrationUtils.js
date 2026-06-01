/**
 * integrationUtils — shared, dependency-free helpers for the Integrations hub.
 *
 * The flagship connector (Office Ally) feeds the existing
 * `processPatientFileUpdate` backend, which distinguishes a *current census*
 * export (adds new patients) from a *discharge report* (archives discharged
 * patients) via its `report_type` argument. Historically an admin had to know
 * which kind of file they were holding and pick it from a dropdown. These
 * helpers auto-detect the report type from the file name and CSV contents so
 * the connection is one drop-and-go step. Detection is advisory — the UI always
 * lets the admin confirm or override before anything is written.
 *
 * Kept pure and unit-tested here so the heuristics are the source of truth and
 * stay aligned with the header names the backend actually reads.
 */

export const REPORT_TYPES = {
  active_census: {
    value: "active_census",
    label: "Current patient census",
    description: "Adds patients who are not already in PennSync (verified by MRN, then name + DOB).",
  },
  discharge_report: {
    value: "discharge_report",
    label: "Discharged patient report",
    description: "Matches existing patients and marks them discharged + archived.",
  },
};

/** Normalize a CSV header the same way the backend does, so detection lines up. */
export function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Minimal RFC-4180-ish single-line CSV parser (mirrors the backend parser). */
export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => String(value ?? "").replace(/\uFEFF/g, "").trim());
}

const DISCHARGE_HEADERS = new Set([
  "discharge_date",
  "discharged_date",
  "dc_date",
  "discharge_reason",
]);

const STATUS_HEADERS = new Set(["current_admission_status", "status", "admission_status"]);

/**
 * Decide whether a CSV is a current census or a discharge report.
 *
 * @param {{ fileName?: string, text?: string }} input
 * @returns {{ reportType: 'active_census'|'discharge_report', confidence: 'high'|'medium'|'low', reason: string }}
 */
export function detectReportType({ fileName = "", text = "" } = {}) {
  const name = String(fileName).toLowerCase();

  // 1) File name is the strongest, cheapest signal.
  if (/dischar|\bdc\b|discharg/.test(name)) {
    return {
      reportType: "discharge_report",
      confidence: "high",
      reason: "The file name looks like a discharge report.",
    };
  }
  if (/census|active|roster|admit|admission/.test(name)) {
    return {
      reportType: "active_census",
      confidence: "high",
      reason: "The file name looks like a current census/roster.",
    };
  }

  // 2) Fall back to the CSV header + a sample of rows.
  const lines = String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length >= 2) {
    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    const hasDischargeHeader = headers.some((h) => DISCHARGE_HEADERS.has(h));
    const statusIndex = headers.findIndex((h) => STATUS_HEADERS.has(h));

    if (statusIndex !== -1) {
      let discharged = 0;
      let total = 0;
      for (const line of lines.slice(1, 51)) {
        const cells = parseCsvLine(line);
        const status = (cells[statusIndex] || "").toLowerCase();
        if (!status) continue;
        total++;
        if (status.includes("dischar")) discharged++;
      }
      if (total > 0) {
        const ratio = discharged / total;
        if (ratio >= 0.6) {
          return {
            reportType: "discharge_report",
            confidence: ratio === 1 ? "high" : "medium",
            reason: `${Math.round(ratio * 100)}% of sampled rows are marked discharged.`,
          };
        }
        if (ratio === 0) {
          return {
            reportType: "active_census",
            confidence: "medium",
            reason: "No discharged rows were found in the sampled data.",
          };
        }
      }
    }

    if (hasDischargeHeader) {
      return {
        reportType: "discharge_report",
        confidence: "medium",
        reason: "A discharge-specific column is present in the file.",
      };
    }
  }

  // 3) Safe default: census never archives anyone, so it is the conservative pick.
  return {
    reportType: "active_census",
    confidence: "low",
    reason: "Could not auto-detect — defaulting to current census. Please confirm before syncing.",
  };
}
