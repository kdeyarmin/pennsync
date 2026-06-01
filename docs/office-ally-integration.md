# Office Ally Integration — Seamless Roster Sync

This integration keeps your PennSync patient roster in step with **Office Ally**
(your practice-management / clearinghouse system) without manual data entry or
CSV header wrangling. An admin drops an Office Ally export into PennSync and the
**Integrations** hub does the rest: it figures out whether the file is a current
census or a discharge report, verifies each patient, and either adds new
patients or archives discharged ones.

It is intentionally lightweight — there is **nothing to install**, no API keys to
provision, and no webhook to register. The connector reuses the existing,
hardened `processPatientFileUpdate` backend.

## What it does

| Export from Office Ally | PennSync does |
|---|---|
| **Current patient census** | Adds patients that are **not already** in PennSync. Existing patients are left untouched. |
| **Discharged patient report** | Finds the matching patient and marks them **discharged + archived** so they drop off active rosters. |

Patients are verified **by MRN first**, then by **name + date of birth** when no
MRN is present. Rows that can't be safely verified, or that match more than one
existing record, are reported as "needs attention" rather than guessed at —
nothing ambiguous is ever written.

## How to use it

1. In Office Ally, run the report you want to sync and **export it as CSV**:
   - *Current census / active patient list* → adds new patients.
   - *Discharged patients report* → archives discharged patients.
2. In PennSync, go to **Admin → Integrations** (admins only).
3. Under **Office Ally**, drop the CSV onto the connector (or click to choose).
4. PennSync auto-detects the report type and shows it with a confidence badge.
   **Confirm or change** the selection, then click **Sync to PennSync**.
5. Review the summary — rows read, new patients added, matched/archived, and any
   rows that need attention.

> Tip: re-run the **census** sync whenever you onboard patients, and the
> **discharge** sync after your discharge cycle. Re-running is safe — the census
> only adds patients it hasn't seen, and the discharge sync skips anyone already
> archived.

## How auto-detection works

The connector decides census vs. discharge using, in order:

1. **File name** — e.g. `discharge`, `census`, `roster`, `admission`.
2. **Columns** — a discharge-specific column such as `Discharge Date`.
3. **Data sample** — the mix of values in the `Status` / `Current Admission
   Status` column across the first rows.

If it still can't tell, it **defaults to *current census*** (the safe choice,
since a census never archives anyone) and asks you to confirm. The detection
heuristics live in `src/components/integrations/integrationUtils.js` and are
unit-tested (`integrationUtils.test.js`).

## Recognized columns

The backend maps common Office Ally / export headers automatically. Helpful
columns to include in your export:

| Concept | Accepted headers (any of) |
|---|---|
| Name | `Patient` (`Last, First`), or `First Name` + `Last Name` |
| MRN | `MRN`, `Medical Record Number` |
| Date of birth | `DOB`, `Date of Birth` |
| Status | `Current Admission Status`, `Status` |
| Admission date | `Admitted Date`, `Admission Date` |
| Payor | `Primary Payor`, `Payor` |
| Diagnosis | `Primary Diagnosis`, `Secondary Diagnosis` |
| Phone | `Home Phone`, `Phone` |
| Address | `Addr 1 Care`/`Address`, `City`, `State`, `Zip Code` |

Fields with commas (like `Last, First` names) should be **quoted** in the CSV —
standard Office Ally exports already do this.

## Security & privacy

- The connector is **admin-only**, gated both in the UI and server-side
  (`processPatientFileUpdate` rejects non-admins).
- The CSV is read **in the browser** and sent to your own backend function over
  HTTPS; the connector itself stores nothing.
- When a file URL is used instead of inline content, the backend applies an
  **SSRF allow-list** (`FILE_URL_ALLOWED_HOSTS`) and refuses internal hosts.
- No Office Ally credentials are stored in PennSync — you export from Office
  Ally and bring the file in, so there are no third-party secrets to leak.

## Where it lives in the code

| Piece | File |
|---|---|
| Integrations hub page | `src/pages/Integrations.jsx` |
| Office Ally connector UI | `src/components/integrations/OfficeAllyConnector.jsx` |
| Report-type auto-detection | `src/components/integrations/integrationUtils.js` (+ test) |
| Reusable connection card | `src/components/integrations/IntegrationCard.jsx` |
| Backend roster processor | `functions/processPatientFileUpdate.ts` |
