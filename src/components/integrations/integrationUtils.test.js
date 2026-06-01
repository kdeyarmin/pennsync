import { test } from "node:test";
import assert from "node:assert/strict";
import { detectReportType, normalizeHeader, parseCsvLine, REPORT_TYPES } from "./integrationUtils.js";

test("normalizeHeader matches the backend normalization", () => {
  assert.equal(normalizeHeader("  Medical Record # "), "medical_record");
  assert.equal(normalizeHeader("Current Admission Status"), "current_admission_status");
  assert.equal(normalizeHeader("﻿Patient"), "patient");
});

test("parseCsvLine handles quotes, commas and trimming", () => {
  assert.deepEqual(parseCsvLine('Doe, John,12345, "active"'), ["Doe", "John", "12345", "active"]);
  assert.deepEqual(parseCsvLine('"Smith, Jr., Bob",MRN1'), ["Smith, Jr., Bob", "MRN1"]);
});

test("detectReportType: file name with 'discharge' wins immediately", () => {
  const r = detectReportType({ fileName: "OfficeAlly_Discharge_2026-06.csv", text: "" });
  assert.equal(r.reportType, "discharge_report");
  assert.equal(r.confidence, "high");
});

test("detectReportType: census/roster file name is recognized", () => {
  const r = detectReportType({ fileName: "active_census_export.csv" });
  assert.equal(r.reportType, "active_census");
  assert.equal(r.confidence, "high");
});

test("detectReportType: status column dominated by discharged rows => discharge", () => {
  const text = [
    "Patient,MRN,Current Admission Status",
    '"Doe, John",1,Discharged',
    '"Roe, Jane",2,Discharged',
    '"Poe, Sam",3,discharged',
  ].join("\n");
  const r = detectReportType({ fileName: "export.csv", text });
  assert.equal(r.reportType, "discharge_report");
  assert.equal(r.confidence, "high");
});

test("detectReportType: status column all active => census", () => {
  const text = [
    "Patient,MRN,Status",
    '"Doe, John",1,Active',
    '"Roe, Jane",2,Active',
  ].join("\n");
  const r = detectReportType({ fileName: "export.csv", text });
  assert.equal(r.reportType, "active_census");
  assert.equal(r.confidence, "medium");
});

test("detectReportType: discharge-specific header without status column", () => {
  const text = ["Patient,MRN,Discharge Date", '"Doe, John",1,2026-05-01'].join("\n");
  const r = detectReportType({ fileName: "export.csv", text });
  assert.equal(r.reportType, "discharge_report");
  assert.equal(r.confidence, "medium");
});

test("detectReportType: ambiguous input defaults to census with low confidence", () => {
  const r = detectReportType({ fileName: "export.csv", text: "Patient,MRN\nDoe John,1" });
  assert.equal(r.reportType, "active_census");
  assert.equal(r.confidence, "low");
});

test("detectReportType: handles empty/garbage input safely", () => {
  const r = detectReportType({});
  assert.equal(r.reportType, "active_census");
  assert.equal(r.confidence, "low");
  assert.ok(REPORT_TYPES[r.reportType]);
});
