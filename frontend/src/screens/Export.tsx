// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Empty } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Download } = Icons;

const TODAY = '2026-11-25';
const FILENAME = TODAY + '-notes.md';
const SYNCED_AT = '14:18';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const NOTES = [
  {
    id: 'nt_4821',
    title: 'Sprint review moved to Thursday 09:30',
    body: "Room B2 is booked all morning, so we're in the Lisbon room instead.\nBring the burndown printout. Maya dials in from Porto.",
    created_at: '2026-11-24T16:42:00'
  },
  {
    id: 'nt_4817',
    title: 'Postgres backup window — 02:00 to 02:40 UTC',
    body: 'Nightly dump covers the notes table only. If an export looks short,\ncheck whether it overlapped the window.',
    created_at: '2026-11-23T09:08:00'
  },
  {
    id: 'nt_4810',
    title: 'Kitchen: the good coffee is in the left cupboard',
    body: 'Beans from Fika on Rua Nova, grinder setting 14.\nPlease refill the water jug. — Tomas',
    created_at: '2026-11-21T18:27:00'
  }
];

const fmtStamp = (iso) => {
  const parts = String(iso).split('T');
  return parts[0] + ' ' + parts[1].slice(0, 5);
};

const buildMarkdown = (list) => {
  const lines = [
    '# Quick Notes',
    '',
    'Exported ' + TODAY + ' · ' + list.length + (list.length === 1 ? ' note' : ' notes'),
    ''
  ];
  list.forEach((n) => {
    lines.push('---', '', '## ' + n.title, '', '*' + fmtStamp(n.created_at) + '*', '');
    String(n.body).split('\n').forEach((l) => lines.push(l));
    lines.push('');
  });
  return lines.join('\n');
};

const clockNow = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

export default function Screen() {
  const navigate = useNavigate();
  const notes = NOTES;

  const [savedLimit, setSavedLimit] = React.useState(DEFAULT_LIMIT);
  const [limitInput, setLimitInput] = React.useState(String(DEFAULT_LIMIT));
  const [saveState, setSaveState] = React.useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = React.useState('');
  const [downloadState, setDownloadState] = React.useState('idle'); // idle | preparing | done
  const [receipt, setReceipt] = React.useState(null);

  const timers = React.useRef([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const ink = brand.primaryColor;
  const muted = brand.neutralColor;
  const accent = brand.accentColor;
  const paper = brand.backgroundColor;

  const included = Math.min(notes.length, savedLimit);
  const excluded = Math.max(0, notes.length - savedLimit);
  const exportList = notes.slice(0, savedLimit);
  const markdown = React.useMemo(() => buildMarkdown(exportList), [savedLimit, notes]);
  const sizeKb = (markdown.length / 1024).toFixed(1);
  const lines = markdown.split('\n');
  const previewLines = lines.slice(0, 14);

  const dirty = limitInput.trim() !== String(savedLimit);

  const onSave = (e) => {
    e.preventDefault();
    const raw = limitInput.trim();
    if (!raw) {
      setSaveError('Enter an export limit. The default is ' + DEFAULT_LIMIT + '.');
      setSaveState('error');
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setSaveError('Whole numbers only — enter 25, not 25.5 or "twenty-five".');
      setSaveState('error');
      return;
    }
    const n = parseInt(raw, 10);
    if (n < 1) {
      setSaveError('The limit must be at least 1 note. An export of nothing is just an empty file.');
      setSaveState('error');
      return;
    }
    if (n > MAX_LIMIT) {
      setSaveError(MAX_LIMIT.toLocaleString() + ' notes is the most one file can hold. Try a lower limit.');
      setSaveState('error');
      return;
    }
    setSaveError('');
    setSaveState('saving');
    later(() => {
      setSavedLimit(n);
      setSaveState('saved');
    }, 650);
  };

  const onDownload = () => {
    if (notes.length === 0 || downloadState === 'preparing') return;
    setDownloadState('preparing');
    later(() => {
      setReceipt({
        file: FILENAME,
        count: Math.min(notes.length, savedLimit),
        size: (buildMarkdown(notes.slice(0, savedLimit)).length / 1024).toFixed(1),
        at: clockNow()
      });
      setDownloadState('done');
    }, 900);
  };

  const label = 'text-[11px] font-bold uppercase tracking-[0.18em]';
  const box = { border: '2px solid ' + ink, borderRadius: brand.radius, backgroundColor: paper };

  return (
    <div
      className="min-h-full px-6 py-8 sm:px-10 sm:py-10"
      style={{
        backgroundColor: paper,
        color: ink,
        fontFamily: brand.fontBody,
        ['--qn-ink']: ink,
        ['--qn-bg']: paper,
        ['--qn-accent']: accent
      }}
    >
      <style>{`
        .qn-f:focus-visible { outline: 2px solid var(--qn-accent); outline-offset: 2px; }
        .qn-primary { background: var(--qn-ink); color: var(--qn-bg); }
        .qn-primary:hover:not(:disabled) { background: #000; }
        .qn-primary:active:not(:disabled) { transform: translateY(1px); }
        .qn-primary:disabled { background: var(--qn-bg); color: #8a8a8a; border: 2px solid #d4d4d4; cursor: not-allowed; }
        .qn-outline { background: var(--qn-bg); color: var(--qn-ink); border: 2px solid var(--qn-ink); }
        .qn-outline:hover:not(:disabled) { background: var(--qn-ink); color: var(--qn-bg); }
        .qn-outline:disabled { border-color: #d4d4d4; color: #8a8a8a; cursor: not-allowed; }
        .qn-ghost:hover { text-decoration: underline; text-underline-offset: 4px; }
        .qn-rise { animation: qn-rise .18s ease-out both; }
        @keyframes qn-rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .qn-pulse { animation: qn-pulse 1s ease-in-out infinite; }
        @keyframes qn-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
        @media (prefers-reduced-motion: reduce) {
          .qn-rise, .qn-pulse { animation: none; }
          .qn-primary:active:not(:disabled) { transform: none; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-4xl">

        {/* Row 1 — page title */}
        <header data-wf="b-0-0" className="pb-4" style={{ borderBottom: '2px solid ' + ink }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={label} style={{ color: muted }}>Shared notepad · Markdown</p>
              <h1
                className="mt-2 text-[36px] font-bold leading-none tracking-[-0.03em]"
                style={{ fontFamily: brand.fontHeading }}
              >
                Export
              </h1>
            </div>
            <p className="flex items-center gap-2 text-[12px]" style={{ color: muted, fontVariantNumeric: 'tabular-nums' }}>
              <Icons.Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Shared list synced {SYNCED_AT} · GET /notes
            </p>
          </div>
        </header>

        {/* Row 2 — export settings + save */}
        <form onSubmit={onSave} className="mt-8 grid grid-cols-12 gap-6" noValidate>
          <section data-wf="b-1-0" className="col-span-12 md:col-span-8">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em]" style={{ fontFamily: brand.fontHeading }}>
              Export settings
            </h2>
            <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.55]" style={{ color: muted }}>
              There is no sign-in, so any visitor can view and change this limit. It applies to every export from now on.
            </p>

            <div className="mt-4">
              <Label htmlFor="export_limit" className={label} style={{ color: ink }}>
                Export limit
              </Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="export_limit"
                  name="export_limit"
                  data-wf="i-1-0-0"
                  className="qn-f w-32 px-3 py-2 text-[16px] font-semibold"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={limitInput}
                  onChange={(e) => {
                    setLimitInput(e.target.value);
                    if (saveState !== 'saving') setSaveState('idle');
                  }}
                  aria-describedby="limit_help limit_status"
                  aria-invalid={saveState === 'error' ? 'true' : undefined}
                  style={{
                    border: '2px solid ' + (saveState === 'error' ? accent : ink),
                    borderRadius: brand.radius,
                    backgroundColor: paper,
                    color: ink,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                />
                <span className="text-[13px]" style={{ color: muted }}>
                  notes per file · default {DEFAULT_LIMIT}
                </span>
              </div>
              <p id="limit_help" className="mt-2 text-[12px]" style={{ color: muted }}>
                Whole number from 1 to {MAX_LIMIT.toLocaleString()}. Saved value: {savedLimit}.
              </p>
            </div>
          </section>

          <div className="col-span-12 flex md:col-span-4 md:items-end md:justify-end">
            <Button
              type="submit"
              data-wf="b-1-1"
              className="qn-f qn-outline h-11 w-full px-5 text-[14px] font-semibold tracking-[0.02em] md:w-auto"
              style={{ borderRadius: brand.radius }}
              disabled={saveState === 'saving' || !dirty}
              aria-busy={saveState === 'saving' ? 'true' : undefined}
            >
              {saveState === 'saving' ? <span className="qn-pulse">Saving limit…</span> : 'Save limit'}
            </Button>
          </div>

          <div className="col-span-12 -mt-2" id="limit_status" role="status" aria-live="polite">
            {saveState === 'saving' && (
              <p className="qn-rise text-[13px]" style={{ color: muted }}>
                Writing the new limit · PUT /settings
              </p>
            )}
            {saveState === 'saved' && (
              <p className="qn-rise flex items-center gap-2 text-[13px] font-semibold">
                <Icons.CheckCircle className="h-4 w-4" aria-hidden="true" />
                Limit saved. Exports now include up to {savedLimit} {savedLimit === 1 ? 'note' : 'notes'}.
              </p>
            )}
            {saveState === 'error' && (
              <p
                className="qn-rise flex items-start gap-2 px-3 py-2 text-[13px] font-semibold"
                style={{ border: '2px solid ' + accent, borderRadius: brand.radius, color: accent }}
              >
                <Icons.AlertCircle className="mt-[1px] h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Limit not saved. {saveError} Your entry is still in the field.
                </span>
              </p>
            )}
          </div>
        </form>

        {/* Row 3 — what the export will contain */}
        <p
          data-wf="b-2-0"
          className="mt-6 max-w-[70ch] text-[15px] leading-[1.6]"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          Exports include the most recent notes, up to the limit above.{' '}
          {notes.length === 0 ? (
            <span style={{ color: muted }}>There are no notes in the shared list yet.</span>
          ) : excluded === 0 ? (
            <strong className="font-semibold">
              {included} {included === 1 ? 'note' : 'notes'} will be included.
            </strong>
          ) : (
            <>
              <strong className="font-semibold">
                The {included} most recent {included === 1 ? 'note' : 'notes'} will be included
              </strong>{' '}
              — <span style={{ color: accent }}>{excluded} older {excluded === 1 ? 'note is' : 'notes are'} left out.</span>
            </>
          )}
          {dirty && saveState !== 'saving' && (
            <span style={{ color: muted }}> Based on the saved limit of {savedLimit}; save {limitInput.trim() || 'the field'} to use it.</span>
          )}
        </p>

        {/* Row 4 — the file */}
        <Card
          data-wf="b-3-0"
          className="mt-6 rounded-none border-0 shadow-none"
          style={{ ...box }}
        >
          <CardHeader className="px-5 pb-4 pt-5">
            <CardTitle
              className="text-[18px] font-semibold tracking-[-0.01em]"
              style={{ fontFamily: brand.fontHeading, color: ink }}
            >
              One Markdown file, named from today&rsquo;s date
            </CardTitle>
            <CardDescription className="text-[13px]" style={{ color: muted }}>
              Downloaded straight to your device. No email, no cloud copy.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {notes.length === 0 ? (
              <Empty
                title="Nothing to export yet"
                description="The shared notepad is empty, so there is no file to build. Write a note and it will be picked up by the next export."
                action={
                  <Button
                    className="qn-f qn-outline h-10 px-4 text-[14px] font-semibold"
                    style={{ borderRadius: brand.radius }}
                    onClick={() => navigate('notes')}
                  >
                    Write the first note
                  </Button>
                }
              />
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4 pb-4" style={{ borderBottom: '2px solid ' + ink }}>
                  <p className="flex items-center gap-3 text-[22px] font-bold tracking-[-0.02em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Icons.FileText className="h-5 w-5" aria-hidden="true" />
                    {FILENAME}
                  </p>
                  <dl className="flex gap-8 text-[13px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <div>
                      <dt className={label} style={{ color: muted }}>Notes</dt>
                      <dd className="mt-1 font-semibold">{included} of {notes.length}</dd>
                    </div>
                    <div>
                      <dt className={label} style={{ color: muted }}>Size</dt>
                      <dd className="mt-1 font-semibold">{sizeKb} KB</dd>
                    </div>
                    <div>
                      <dt className={label} style={{ color: muted }}>Lines</dt>
                      <dd className="mt-1 font-semibold">{lines.length}</dd>
                    </div>
                  </dl>
                </div>

                <h3 className={label + ' mt-4'} style={{ color: muted }}>File preview</h3>
                <ol
                  className="mt-2 overflow-hidden text-[12.5px] leading-[1.6]"
                  aria-label={'First ' + previewLines.length + ' lines of ' + FILENAME}
                  style={{ borderLeft: '2px solid ' + ink, fontVariantNumeric: 'tabular-nums' }}
                >
                  {previewLines.map((l, i) => (
                    <li key={i} className="flex gap-4 py-0.5 pl-3">
                      <span aria-hidden="true" className="w-5 shrink-0 text-right" style={{ color: '#9a9a9a' }}>
                        {i + 1}
                      </span>
                      <span className="whitespace-pre-wrap break-words">{l || ' '}</span>
                    </li>
                  ))}
                </ol>
                {lines.length > previewLines.length && (
                  <p className="mt-2 pl-3 text-[12px]" style={{ color: muted, fontVariantNumeric: 'tabular-nums' }}>
                    + {lines.length - previewLines.length} more lines in the file.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Row 5 — download + back */}
        <div className="mt-8 grid grid-cols-12 items-center gap-6">
          <div className="col-span-12 md:col-span-4">
            <Button
              data-wf="b-4-0"
              className="qn-f qn-primary h-12 w-full px-6 text-[15px] font-bold tracking-[0.02em]"
              style={{ borderRadius: brand.radius }}
              onClick={onDownload}
              disabled={notes.length === 0 || downloadState === 'preparing'}
              aria-busy={downloadState === 'preparing' ? 'true' : undefined}
            >
              <span className="flex items-center justify-center gap-2">
                <Icons.Download className="h-4 w-4" aria-hidden="true" />
                {downloadState === 'preparing' ? <span className="qn-pulse">Building file…</span> : 'Download Markdown'}
              </span>
            </Button>
          </div>

          <div className="col-span-12 md:col-span-4">
            <Button
              data-wf="b-4-1"
              className="qn-f qn-ghost h-11 bg-transparent px-0 text-[14px] font-semibold"
              style={{ color: ink, borderRadius: brand.radius }}
              onClick={() => navigate('notes')}
            >
              <span className="flex items-center gap-2">
                <Icons.ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to notes
              </span>
            </Button>
          </div>

          <div className="col-span-12 md:col-span-4" role="status" aria-live="polite">
            {downloadState === 'preparing' && (
              <p className="qn-rise text-[13px] md:text-right" style={{ color: muted }}>
                Collecting the most recent {included} · GET /notes/export
              </p>
            )}
            {downloadState === 'done' && receipt && (
              <p
                className="qn-rise flex items-start gap-2 text-[13px] md:justify-end"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <Icons.CheckCircle className="mt-[1px] h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">{receipt.file}</strong> saved at {receipt.at} · {receipt.count}{' '}
                  {receipt.count === 1 ? 'note' : 'notes'} · {receipt.size} KB
                </span>
              </p>
            )}
            {downloadState === 'idle' && notes.length === 0 && (
              <p className="text-[13px] md:text-right" style={{ color: accent }}>
                Nothing to export — no empty file is created.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
