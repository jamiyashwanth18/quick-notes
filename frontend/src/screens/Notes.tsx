// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { api } from "@/api/client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Label, Select } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Check, FileText, Trash, AlertCircle } = Icons;

const PRODUCT = "Quick notes";
const SCREEN = "Notes";
const TITLE_MAX = 100;
const BODY_MAX = 2000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mix = (colour, percent) => `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

const stamp = (d) =>
  `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ` +
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const toNote = (n) => ({
  id: n.id,
  title: n.title,
  body: n.body,
  created_at: stamp(new Date(n.createdAt || n.created_at)),
});

export default function Screen() {
  const [notes, setNotes] = React.useState([]);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [removed, setRemoved] = React.useState("");
  const [loadingList, setLoadingList] = React.useState(true);
  const [listError, setListError] = React.useState("");

  const timers = React.useRef([]);
  const titleRef = React.useRef(null);
  const deleteRef = React.useRef(null);
  const confirmRef = React.useRef(null);
  const cancelRef = React.useRef(null);

  const loadNotes = React.useCallback(async () => {
    setLoadingList(true);
    const { data, error: apiError } = await api.GET("/notes");
    setLoadingList(false);
    if (apiError || !data) {
      setListError("Could not load notes. Try again.");
      return;
    }
    setListError("");
    setNotes(data.map(toNote));
  }, []);

  React.useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  React.useEffect(() => {
    if (confirming && confirmRef.current) confirmRef.current.focus();
  }, [confirming]);

  const rule = `2px solid ${brand.primaryColor}`;
  const hair = `1px solid ${mix(brand.primaryColor, 16)}`;
  const selectedNote = notes.find((n) => n.id === selected) || null;

  const after = (ms, fn) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const draftTitle = title.trim();
    if (!draftTitle) {
      setError("Title is required");
      setSaved("");
      if (titleRef.current) titleRef.current.focus();
      return;
    }
    setError("");
    setSaved("");
    setRemoved("");
    setSaving(true);
    const draftBody = body.trim();
    const { data, error: apiError } = await api.POST("/notes", {
      body: { title: draftTitle, body: draftBody },
    });
    setSaving(false);
    if (apiError || !data) {
      setError("Could not save the note. Try again.");
      return;
    }
    const note = toNote(data);
    setNotes((prev) => [note, ...prev]);
    setTitle("");
    setBody("");
    setSaved(`Saved “${note.title}” to the shared notepad.`);
  };

  const closeDialog = () => {
    if (deleting) return;
    setConfirming(false);
    if (deleteRef.current) deleteRef.current.focus();
  };

  const confirmDelete = () => {
    if (!selectedNote || deleting) return;
    setDeleting(true);
    after(400, () => {
      setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      setDeleting(false);
      setConfirming(false);
      setSelected(null);
      setSaved("");
      setRemoved("Note deleted permanently. There is no undo.");
      if (deleteRef.current) deleteRef.current.focus();
    });
  };

  const trap = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeDialog();
      return;
    }
    if (e.key !== "Tab") return;
    const first = confirmRef.current;
    const last = cancelRef.current;
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const css = `
.qn-f:focus-visible { outline: 2px solid ${brand.accentColor}; outline-offset: 2px; }
.qn-row { animation: qn-in 240ms ease-out both; }
@keyframes qn-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.qn-scrim { animation: qn-fade 140ms ease-out both; }
@keyframes qn-fade { from { opacity: 0; } to { opacity: 1; } }
.qn-dialog { animation: qn-pop 160ms ease-out both; }
@keyframes qn-pop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .qn-row, .qn-scrim, .qn-dialog { animation: none; } }
`;

  const countStyle = (used, max) => ({
    color: used >= max ? brand.accentColor : brand.neutralColor,
    fontVariantNumeric: "tabular-nums",
  });

  return (
    <div className="bg-white" style={{ color: brand.primaryColor, fontFamily: brand.fontBody }}>
      <style>{css}</style>

      {/* Row 1 — page title */}
      <div data-wf="b-0-0" className="flex items-end justify-between pb-4" style={{ borderBottom: rule }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: brand.neutralColor }}>{PRODUCT}</p>
          <h1 data-testid="notes-title" className="mt-1 text-3xl font-bold tracking-tight" style={{ fontFamily: brand.fontHeading }}>{SCREEN}</h1>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: brand.neutralColor, fontVariantNumeric: "tabular-nums" }}>
          Shared notepad · {notes.length} {notes.length === 1 ? "note" : "notes"} · free, no sign-in
        </p>
      </div>

      <form data-testid="new-note-form" onSubmit={save} noValidate>
        {/* Row 2 — new note form */}
        <section data-wf="b-1-0" className="pt-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: brand.fontHeading, color: brand.neutralColor }}>New note</h2>

          <div className="mt-3 grid gap-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="note-title" className="text-[11px] font-bold uppercase tracking-[0.14em]">
                  Title <span style={{ color: brand.accentColor }}>*</span>
                </Label>
                <span className="text-[11px] font-semibold" style={countStyle(title.length, TITLE_MAX)}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                data-testid="title-required-max-100-characters-input"
                id="note-title"
                ref={titleRef}
                value={title}
                onChange={(e) => { setTitle(e.target.value.slice(0, TITLE_MAX)); if (error) setError(""); }}
                maxLength={TITLE_MAX}
                required
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "note-title-error note-rules" : "note-rules"}
                placeholder="Standup notes"
                className="qn-f mt-1 h-10 w-full bg-white px-3 text-sm outline-none"
                style={{ border: error ? `2px solid ${brand.accentColor}` : rule, borderRadius: brand.radius }}
              />
              {error ? (
                <p id="note-title-error" className="mt-2 flex items-start gap-1.5 text-xs font-semibold" style={{ color: brand.accentColor }}>
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : null}
            </div>

            <div className="md:col-span-7">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="note-body" className="text-[11px] font-bold uppercase tracking-[0.14em]">Body</Label>
                <span className="text-[11px] font-semibold" style={countStyle(body.length, BODY_MAX)}>
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <textarea
                data-testid="body-max-2-000-characters-input"
                id="note-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                maxLength={BODY_MAX}
                rows={4}
                aria-describedby="note-rules"
                placeholder="What should everyone know?"
                className="qn-f mt-1 w-full resize-y bg-white px-3 py-2 text-sm leading-relaxed outline-none"
                style={{ border: rule, borderRadius: brand.radius }}
              />
            </div>
          </div>
        </section>

        {/* Row 3 — rules + save */}
        <div className="grid items-start gap-4 pb-5 pt-4 md:grid-cols-12" style={{ borderBottom: rule }}>
          <p data-wf="b-2-0" id="note-rules" className="text-xs leading-relaxed md:col-span-9" style={{ color: brand.neutralColor, maxWidth: "68ch" }}>
            Title is required. Titles are limited to 100 characters and body text to 2,000 characters. Notes cannot be edited once saved.
          </p>
          <div className="md:col-span-3 md:justify-self-end">
            <button
              data-testid="save-note-btn"
              type="submit"
              disabled={saving}
              aria-busy={saving ? "true" : "false"}
              className="qn-f h-10 w-full px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-opacity duration-150 hover:opacity-85 active:opacity-70 disabled:opacity-40 md:w-auto"
              style={{ backgroundColor: brand.primaryColor, borderRadius: brand.radius }}
            >
              {saving ? "Saving note…" : "Save note"}
            </button>
          </div>
        </div>

        <p aria-live="polite" className="min-h-[18px] pt-3 text-xs font-semibold">
          {saved ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {saved}
            </span>
          ) : removed ? (
            <span className="inline-flex items-center gap-1.5" style={{ color: brand.accentColor }}>
              <Trash className="h-3.5 w-3.5" aria-hidden="true" />
              {removed}
            </span>
          ) : saving ? (
            <span style={{ color: brand.neutralColor }}>Writing to the shared notepad…</span>
          ) : null}
        </p>
      </form>

      {/* Row 4 — list intro */}
      <p data-wf="b-3-0" className="pt-4 text-sm font-semibold">
        All notes, newest first. Shared by everyone, on every device.
      </p>

      {/* Row 5 — shared notes list */}
      <section data-wf="b-4-0" className="pt-4">
        <div className="flex items-baseline justify-between pb-2" style={{ borderBottom: rule }}>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: brand.fontHeading, fontVariantNumeric: "tabular-nums" }}>
            Shared notes ({notes.length})
          </h2>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: brand.neutralColor }}>
            {selectedNote ? "1 selected" : "Select a note to delete"}
          </p>
        </div>

        {loadingList ? (
          <p className="py-6 text-xs font-semibold" style={{ color: brand.neutralColor }}>Loading notes…</p>
        ) : listError ? (
          <p role="alert" className="py-6 text-xs font-semibold" style={{ color: brand.accentColor }}>{listError}</p>
        ) : null}

        {!loadingList && !listError && notes.length > 0 ? (
          <ul data-testid="shared-notes-3-list" className="m-0 list-none p-0">
            {notes.map((n) => {
              const isOn = n.id === selected;
              return (
                <li
                  key={n.id}
                  className="qn-row flex gap-3 px-2 py-3 transition-colors duration-150 hover:bg-black/[0.03]"
                  style={{
                    borderBottom: hair,
                    borderLeft: isOn ? `2px solid ${brand.primaryColor}` : "2px solid transparent",
                    backgroundColor: isOn ? mix(brand.primaryColor, 6) : undefined,
                  }}
                >
                  <input
                    data-wf={`i-4-0-${notes.indexOf(n)}`}
                    type="radio"
                    name="note-select"
                    id={`note-${n.id}`}
                    checked={isOn}
                    onChange={() => { setSelected(n.id); setRemoved(""); }}
                    className="qn-f mt-1 h-4 w-4 shrink-0"
                    style={{ accentColor: brand.primaryColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <label htmlFor={`note-${n.id}`} className="cursor-pointer text-sm font-bold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
                        {n.title}
                      </label>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: brand.neutralColor, fontVariantNumeric: "tabular-nums" }}>
                        {isOn ? <span className="mr-3" style={{ color: brand.primaryColor }}>Selected</span> : null}
                        {n.created_at}
                      </span>
                    </div>
                    {n.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: brand.neutralColor, maxWidth: "74ch" }}>
                        {n.body}
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] italic" style={{ color: brand.neutralColor }}>Title only — no body text.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {/* Row 6 — delete action */}
      <div className="grid gap-3 pt-4 md:grid-cols-12 md:items-center">
        <div className="md:col-span-3">
          <button
            data-testid="delete-note-btn"
            type="button"
            ref={deleteRef}
            disabled={!selectedNote}
            onClick={() => { setConfirming(true); setRemoved(""); }}
            className="qn-f inline-flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors duration-150 hover:bg-black/[0.04] disabled:opacity-30 disabled:hover:bg-transparent md:w-auto"
            style={{ border: rule, borderRadius: brand.radius }}
          >
            <Trash className="h-3.5 w-3.5" aria-hidden="true" />
            Delete note
          </button>
        </div>
        <p className="text-xs md:col-span-9" style={{ color: brand.neutralColor }}>
          {selectedNote
            ? `Ready to delete “${selectedNote.title}”, created ${selectedNote.created_at}.`
            : "Deleting is permanent and affects everyone reading this notepad."}
        </p>
      </div>

      {/* Row 7 — empty state */}
      {notes.length === 0 && !loadingList && !listError ? (
        <div data-testid="no-notes-yet-write-the-first-one-a-empty" className="mt-4 px-6 py-12 text-center" style={{ border: rule, borderRadius: brand.radius }}>
          <FileText className="mx-auto h-6 w-6" aria-hidden="true" />
          <h3 className="mt-3 text-base font-bold tracking-tight" style={{ fontFamily: brand.fontHeading }}>No notes yet. Write the first one above.</h3>
          <p className="mx-auto mt-2 text-xs leading-relaxed" style={{ color: brand.neutralColor, maxWidth: "48ch" }}>
            This notepad is shared by everyone, on every device. Whatever you save here is what the next visitor reads.
          </p>
        </div>
      ) : null}

      {/* Row 8 — delete confirmation */}
      {confirming && selectedNote ? (
        <div
          data-testid="delete-this-note-this-cannot-be-un-modal"
          className="qn-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: mix(brand.primaryColor, 55) }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            onKeyDown={trap}
            className="qn-dialog w-full max-w-md bg-white p-6"
            style={{ border: rule, borderRadius: brand.radius, boxShadow: `0 16px 40px ${mix(brand.primaryColor, 22)}` }}
          >
            <h2 id="delete-title" className="text-lg font-bold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
              Delete this note? This cannot be undone.
            </h2>
            <p id="delete-desc" className="mt-2 text-xs leading-relaxed" style={{ color: brand.neutralColor }}>
              “{selectedNote.title}” — {selectedNote.created_at}. It disappears from the shared list for every visitor. There is no trash and no undo.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                data-wf="i-7-0-1"
                type="button"
                ref={cancelRef}
                onClick={closeDialog}
                disabled={deleting}
                className="qn-f h-10 px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors duration-150 hover:bg-black/[0.04] disabled:opacity-40"
                style={{ border: rule, borderRadius: brand.radius }}
              >
                Cancel
              </button>
              <button
                data-wf="i-7-0-0"
                type="button"
                ref={confirmRef}
                onClick={confirmDelete}
                disabled={deleting}
                aria-busy={deleting ? "true" : "false"}
                className="qn-f h-10 px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-opacity duration-150 hover:opacity-85 disabled:opacity-60"
                style={{ backgroundColor: brand.accentColor, borderRadius: brand.radius }}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
