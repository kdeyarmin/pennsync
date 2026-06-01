import { useCallback, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Archive,
  Users,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { detectReportType, REPORT_TYPES } from "./integrationUtils";

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * OfficeAllyConnector — the seamless, one-step roster sync.
 *
 * Drop an Office Ally export (current census or discharge report) and the
 * connector reads it locally, auto-detects which kind it is, and lets the admin
 * confirm with a single click. CSV text is posted straight to the existing
 * `processPatientFileUpdate` backend (no intermediate upload round-trip), then a
 * clean summary of what changed is shown.
 */
export default function OfficeAllyConnector() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState("");
  const [detection, setDetection] = useState(null);
  const [reportType, setReportType] = useState("active_census");
  const [isDragging, setIsDragging] = useState(false);
  const [results, setResults] = useState(null);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("processPatientFileUpdate", {
        file_content: fileText,
        report_type: reportType,
      });
      const payload = response?.data || response;
      if (!payload?.success) {
        throw new Error(payload?.error || "Office Ally sync failed");
      }
      return payload.results;
    },
    onSuccess: (res) => {
      setResults(res);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Office Ally roster synced");
    },
    onError: (err) => toast.error(err?.message || "Office Ally sync failed"),
  });

  const ingestFile = useCallback((selected) => {
    if (!selected) return;
    if (!/\.csv$/i.test(selected.name)) {
      toast.error("Please choose a .csv export from Office Ally");
      return;
    }
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const detected = detectReportType({ fileName: selected.name, text });
      setFile(selected);
      setFileText(text);
      setDetection(detected);
      setReportType(detected.reportType);
    };
    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsText(selected);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      ingestFile(event.dataTransfer?.files?.[0]);
    },
    [ingestFile],
  );

  const reset = () => {
    setFile(null);
    setFileText("");
    setDetection(null);
    setResults(null);
    setReportType("active_census");
    if (inputRef.current) inputRef.current.value = "";
  };

  const isSyncing = syncMutation.isPending;

  const summaryCards = results
    ? [
        { key: "processed", label: "Rows read", value: results.processed || 0, className: "bg-blue-50 text-blue-700", icon: FileSpreadsheet },
        { key: "created", label: "New patients added", value: results.created || 0, className: "bg-green-50 text-green-700", icon: Users },
        {
          key: "matched",
          label: reportType === "discharge_report" ? "Matched in system" : "Already in system",
          value: results.matchedExisting || 0,
          className: "bg-amber-50 text-amber-700",
          icon: CheckCircle2,
        },
        { key: "archived", label: "Discharged + archived", value: results.archived || results.discharged || 0, className: "bg-slate-50 text-slate-700", icon: Archive },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            id="office-ally-file"
            onChange={(e) => ingestFile(e.target.files?.[0])}
          />
          <label htmlFor="office-ally-file" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto mb-3 text-blue-500" />
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Drop your Office Ally export here, or click to choose
            </p>
            <p className="text-xs text-gray-500">
              Works with both the current census and the discharge report. We detect which is which for you.
            </p>
          </label>
        </div>
      )}

      {/* Detected file + confirm */}
      {file && !results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} disabled={isSyncing}>
              Change
            </Button>
          </div>

          {detection && (
            <Alert className={CONFIDENCE_STYLES[detection.confidence]}>
              <Sparkles className="w-4 h-4" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">Detected: {REPORT_TYPES[detection.reportType].label}.</span>{" "}
                {detection.reason}
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Confirm what to do with this file</p>
            <RadioGroup value={reportType} onValueChange={setReportType} className="space-y-2" disabled={isSyncing}>
              {Object.values(REPORT_TYPES).map((rt) => (
                <label
                  key={rt.value}
                  htmlFor={`oa-${rt.value}`}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    reportType === rt.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem value={rt.value} id={`oa-${rt.value}`} className="mt-0.5" />
                  <div>
                    <Label htmlFor={`oa-${rt.value}`} className="text-sm font-medium cursor-pointer">
                      {rt.label}
                    </Label>
                    <p className="text-xs text-gray-500">{rt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Verifying and syncing patients…
              </div>
              <Progress value={66} className="h-2" />
            </div>
          )}

          <Button onClick={() => syncMutation.mutate()} disabled={isSyncing} className="w-full bg-blue-600 hover:bg-blue-700">
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync to PennSync
          </Button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={`rounded-lg p-4 ${card.className}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold opacity-80">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <Icon className="w-6 h-6 opacity-80" />
                  </div>
                </div>
              );
            })}
          </div>

          {results.skippedInFileDuplicates > 0 && (
            <Alert>
              <AlertDescription>
                {results.skippedInFileDuplicates} duplicate row
                {results.skippedInFileDuplicates === 1 ? " was" : "s were"} skipped because the same patient appeared more
                than once in the file.
              </AlertDescription>
            </Alert>
          )}

          {results.errors?.length > 0 ? (
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Needs attention ({results.errors.length})</h3>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-3 space-y-2">
                  {results.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        <span className="font-semibold">{error.patient}</span>
                        {error.row ? ` • row ${error.row}` : ""}
                        {`: ${error.error}`}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Sync completed with no conflicts.
              </AlertDescription>
            </Alert>
          )}

          <Button variant="outline" className="w-full" onClick={reset}>
            Sync another file
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Badge variant="outline" className="text-[10px]">PHI</Badge>
        Files are read in your browser and processed by your secure backend — nothing is stored by the connector itself.
      </p>
    </div>
  );
}
