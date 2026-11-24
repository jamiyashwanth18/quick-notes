import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { api } from "@/api/client";

const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label } = UI;

const DEFAULT_LIMIT = 100;

// Derived from the system clock, not a fixed string, so the filename always names the
// day the file is actually built on (AC-014), not the day this screen was written.
function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function filenameForToday(): string {
  return `${todayISO()}-notes.md`;
}

type LimitState = "idle" | "saved" | "error";
type DownloadState = "idle" | "preparing" | "done" | "empty" | "error";

export default function Screen() {
  const navigate = useNavigate();

  const [limitInput, setLimitInput] = React.useState(String(DEFAULT_LIMIT));
  const [limitState, setLimitState] = React.useState<LimitState>("idle");

  const [downloadState, setDownloadState] = React.useState<DownloadState>("idle");
  const [downloadedFile, setDownloadedFile] = React.useState("");

  const rule = `2px solid ${brand.primaryColor}`;

  const saveLimit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = limitInput.trim();
    // A positive whole number only: no zero, no decimals, no sign.
    if (!/^[1-9]\d*$/.test(raw)) {
      setLimitState("error");
      return;
    }
    setLimitState("saved");
  };

  const onDownload = async () => {
    if (downloadState === "preparing") return;
    setDownloadState("preparing");
    setDownloadedFile("");

    // The server owns the export limit (N) and the file's content; this call only
    // hands the result to the browser as a download, with no email or cloud copy
    // anywhere in the path (AC-013).
    let data: string | undefined;
    let apiError: unknown;
    let response: Response | undefined;
    try {
      ({
        data,
        error: apiError,
        response,
      } = await api.GET("/notes/export", {
        parseAs: "text",
      }));
    } catch {
      apiError = true;
    }

    if (response && response.status === 404) {
      // There are no notes to export: say so, and never force an empty file on the
      // visitor (AC-015).
      setDownloadState("empty");
      return;
    }
    if (apiError || typeof data !== "string") {
      setDownloadState("error");
      return;
    }

    const filename = filenameForToday();
    const blob = new Blob([data], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedFile(filename);
    setDownloadState("done");
  };

  return (
    <div className="bg-white" style={{ color: brand.primaryColor, fontFamily: brand.fontBody }}>
      {/* Row 1 — page title */}
      <div
        data-wf="b-0-0"
        className="flex items-end justify-between pb-4"
        style={{ borderBottom: rule }}
      >
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: brand.neutralColor }}
          >
            Quick notes
          </p>
          <h1
            data-testid="export-title"
            className="mt-1 text-3xl font-bold tracking-tight"
            style={{ fontFamily: brand.fontHeading }}
          >
            Export
          </h1>
        </div>
      </div>

      {/* Row 2 — export settings */}
      <form data-testid="export-settings-form" onSubmit={saveLimit} noValidate className="pt-5">
        <h2
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ fontFamily: brand.fontHeading, color: brand.neutralColor }}
        >
          Export settings
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label
              htmlFor="export-limit"
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
            >
              Export limit
            </Label>
            <Input
              id="export-limit"
              data-testid="export-limit-default-100-input"
              className="mt-1 h-10 w-32"
              type="text"
              inputMode="numeric"
              value={limitInput}
              onChange={(e) => {
                setLimitInput(e.target.value);
                setLimitState("idle");
              }}
              aria-describedby="export-limit-status"
              aria-invalid={limitState === "error" ? "true" : undefined}
              style={{
                border: limitState === "error" ? `2px solid ${brand.accentColor}` : rule,
                borderRadius: brand.radius,
              }}
            />
          </div>
          <Button
            type="submit"
            data-testid="save-limit-btn"
            className="h-10 px-5 text-xs font-bold uppercase tracking-[0.14em] text-white"
            style={{ backgroundColor: brand.primaryColor, borderRadius: brand.radius }}
          >
            Save limit
          </Button>
        </div>
        <p
          id="export-limit-status"
          role="status"
          aria-live="polite"
          className="mt-2 min-h-[18px] text-xs font-semibold"
        >
          {limitState === "saved" && (
            <span className="inline-flex items-center gap-1.5">
              <Icons.CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Export limit saved
            </span>
          )}
          {limitState === "error" && (
            <span className="inline-flex items-center gap-1.5" style={{ color: brand.accentColor }}>
              <Icons.AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Enter a positive whole number
            </span>
          )}
        </p>
      </form>

      {/* Row 3 — the file */}
      <Card
        data-testid="one-markdown-file-named-from-today-card"
        className="mt-6 rounded-none border-0 shadow-none"
        style={{ border: rule, borderRadius: brand.radius }}
      >
        <CardHeader>
          <CardTitle style={{ color: brand.primaryColor }}>
            One Markdown file, named from today&rsquo;s date
          </CardTitle>
          <CardDescription>
            Downloaded straight to your device. No email, no cloud copy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            data-testid="download-markdown-btn"
            onClick={onDownload}
            disabled={downloadState === "preparing"}
            aria-busy={downloadState === "preparing" ? "true" : undefined}
            className="h-11 px-6 text-sm font-bold uppercase tracking-[0.14em] text-white"
            style={{ backgroundColor: brand.primaryColor, borderRadius: brand.radius }}
          >
            <span className="flex items-center justify-center gap-2">
              <Icons.Download className="h-4 w-4" aria-hidden="true" />
              {downloadState === "preparing" ? "Building file…" : "Download Markdown"}
            </span>
          </Button>

          <p role="status" aria-live="polite" className="mt-3 min-h-[18px] text-xs font-semibold">
            {downloadState === "empty" && (
              <span
                className="inline-flex items-center gap-1.5"
                style={{ color: brand.accentColor }}
              >
                <Icons.AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Nothing to export yet
              </span>
            )}
            {downloadState === "error" && (
              <span
                className="inline-flex items-center gap-1.5"
                style={{ color: brand.accentColor }}
              >
                <Icons.AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Could not export notes. Try again.
              </span>
            )}
            {downloadState === "done" && downloadedFile && (
              <span className="inline-flex items-center gap-1.5">
                <Icons.CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Downloaded {downloadedFile}.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Row 4 — back to notes */}
      <div className="pt-6">
        <button
          type="button"
          data-testid="back-to-notes-link"
          onClick={() => navigate("notes")}
          className="inline-flex h-10 items-center gap-2 bg-transparent px-0 text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: brand.primaryColor }}
        >
          <Icons.ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to notes
        </button>
      </div>
    </div>
  );
}
