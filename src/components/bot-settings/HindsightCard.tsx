import { useEffect, useRef, useState } from "react";

import type { HindsightConfigView, HindsightOperationStatus, HindsightView } from "../../../shared/hindsight";
import { api } from "@/state/store";
import { Switch } from "../SettingsPrimitives";
import { Field, inputCls } from "./field";

const emptyConfig: HindsightConfigView = { enabled: false, baseUrl: "", bankId: "", apiKeyConfigured: false };
const buttonCls = "rounded-lg bg-control px-3 py-1.5 text-[13px] text-ink hover:bg-raised-hover disabled:opacity-50";

function OperationStatus({ label, status }: { label: string; status?: HindsightOperationStatus }) {
  return (
    <div className="text-[12px] text-ink-secondary">
      {label}: {status ? (
        <>
          <span className={status.ok ? "text-success" : "text-danger"}>{status.ok ? "Succeeded" : "Failed"}</span>
          {" · "}<time dateTime={status.at}>{new Date(status.at).toLocaleString()}</time>
          {status.message && <span className="mt-0.5 block break-words">{status.message}</span>}
        </>
      ) : "Not run yet"}
    </div>
  );
}

/** A new bot gets a fresh form, including its write-only key and requests. */
export function HindsightCard({ botId }: { botId: string }) {
  return <HindsightForm key={botId} botId={botId} />;
}

function HindsightForm({ botId }: { botId: string }) {
  const [saved, setSaved] = useState<HindsightView | null>(null);
  const [draft, setDraft] = useState(emptyConfig);
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState<"load" | "save" | "test" | null>("load");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const path = `/api/bots/${encodeURIComponent(botId)}/hindsight`;

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void api(path, { signal: controller.signal }).then((view: HindsightView) => {
      if (controller.signal.aborted) return;
      setSaved(view);
      setDraft(view);
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(null);
    });
    return () => request.current?.abort();
  }, [path]);

  const destinationChanged = Boolean(saved && (draft.baseUrl.trim() !== saved.baseUrl || draft.bankId.trim() !== saved.bankId));
  const dirty = Boolean(saved && (destinationChanged || draft.enabled !== saved.enabled || apiKey || clearKey));

  const run = async (action: "load" | "save" | "test") => {
    // Test always uses the saved destination and key. Keep the fields frozen
    // until it finishes so the result cannot look like it tested a new draft.
    if (busy || (action !== "save" && dirty)) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const view: HindsightView = await api(action === "test" ? `${path}/test` : path, {
        signal: controller.signal,
        ...(action === "test" ? { method: "POST" } : {}),
        ...(action === "save" ? {
          method: "PUT",
          body: JSON.stringify({
            enabled: draft.enabled,
            baseUrl: draft.baseUrl.trim(),
            bankId: draft.bankId.trim(),
            ...(clearKey ? { apiKey: null } : apiKey ? { apiKey } : {}),
          }),
        } : {}),
      });
      if (controller.signal.aborted) return;
      setSaved(view);
      setDraft(view);
      setApiKey("");
      setClearKey(false);
      if (action === "save") setNotice("Saved. Changes apply to new turns.");
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  };

  return (
    <div className="rounded-xl bg-card p-4">
      <div className="text-[15px] font-medium text-ink">Hindsight</div>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">
        Connect this bot to an existing Hindsight memory bank. Local notes above stay available.
      </p>
      <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (dirty) void run("save"); }}>
        <fieldset disabled={Boolean(busy) || !saved} className="space-y-3 disabled:opacity-60">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] text-ink">Use Hindsight for this bot</span>
            <Switch checked={draft.enabled} aria-label="Use Hindsight for this bot" onClick={() => setDraft({ ...draft, enabled: !draft.enabled })} />
          </div>
          <p className="text-[12px] leading-relaxed text-ink-secondary">
            When enabled, memories are recalled before direct chats. Your message and the bot’s completed reply
            are sent to this service automatically. Groups, delegations and routines are excluded.
          </p>
          <Field label="Service URL">
            <input type="url" className={inputCls} placeholder="https://hindsight.example.com" value={draft.baseUrl}
              autoComplete="off" spellCheck={false} required={draft.enabled}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
          </Field>
          <Field label="Memory bank ID">
            <input className={inputCls} placeholder="Existing bank for this bot" value={draft.bankId}
              autoComplete="off" spellCheck={false} required={draft.enabled}
              onChange={(e) => setDraft({ ...draft, bankId: e.target.value })} />
          </Field>
          <p className="text-[12px] leading-relaxed text-ink-secondary">
            Link an existing bank reserved for this bot. A bank can only be linked to one bot in this app.
          </p>
          <Field label="API key (optional)">
            <input type="password" className={inputCls} value={apiKey} disabled={clearKey}
              autoComplete="new-password" spellCheck={false}
              placeholder={saved?.apiKeyConfigured && !destinationChanged ? "Key saved — leave blank to keep it" : "Enter a key if the service requires one"}
              onChange={(e) => setApiKey(e.target.value)} />
          </Field>
          {saved?.apiKeyConfigured && (
            <label className="flex items-center gap-2 text-[12px] text-ink-secondary">
              <input type="checkbox" checked={clearKey} onChange={(e) => { setClearKey(e.target.checked); setApiKey(""); }} />
              Clear saved API key on save
            </label>
          )}
          {destinationChanged && saved?.apiKeyConfigured && (
            <p className="text-[12px] text-ink-secondary">
              Changing the service or bank clears the saved key. Enter a replacement if needed.
            </p>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={buttonCls} disabled={Boolean(busy) || !dirty}>
            {busy === "save" ? "Saving…" : "Save Hindsight"}
          </button>
          <button type="button" className={buttonCls} disabled={Boolean(busy) || dirty || !saved?.baseUrl || !saved?.bankId}
            onClick={() => void run("test")}>
            {busy === "test" ? "Testing…" : "Test saved connection"}
          </button>
          <button type="button" className={buttonCls} disabled={Boolean(busy) || dirty} onClick={() => void run("load")}>
            {busy === "load" ? "Loading…" : "Refresh status"}
          </button>
        </div>
        {dirty && <p className="text-[12px] text-ink-secondary">Save changes before testing or refreshing.</p>}
      </form>
      <div className="mt-3 space-y-1" aria-live="polite">
        {notice && <p className="text-[12px] text-success">{notice}</p>}
        {error && <p role="alert" className="break-words text-[12px] text-danger">{error}</p>}
        {saved && <>
          <OperationStatus label="Connection test" status={saved.connection} />
          <OperationStatus label="Last recall" status={saved.recall} />
          <OperationStatus label="Last submission to memory" status={saved.retain} />
        </>}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
        Disabling Hindsight or deleting this bot does not delete the remote bank. Manage stored memories in Hindsight.
      </p>
    </div>
  );
}
