"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type AttachmentMeta = { id: string; fileName: string; sizeBytes: number };

const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AttachmentUploader({
  value,
  onChange,
}: {
  value: AttachmentMeta[];
  onChange: (v: AttachmentMeta[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const isPasteActive = useRef(false);

  const upload = useCallback(
    async (files: File[]) => {
      setUploading(true);
      const results: AttachmentMeta[] = [];
      for (const file of files) {
        if (file.size > MAX_BYTES) {
          alert(`${file.name} is te groot (max 10 MB).`);
          continue;
        }
        const data = await toBase64(file);
        const res = await fetch("/api/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, data }),
        });
        if (res.ok) results.push(await res.json());
      }
      onChange([...value, ...results]);
      setUploading(false);
    },
    [value, onChange]
  );

  // Document-level paste — only active when this zone is hovered/focused
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!isPasteActive.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) upload(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [upload]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    upload(Array.from(e.dataTransfer.files));
  }

  async function remove(id: string) {
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    onChange(value.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div
        ref={zoneRef}
        tabIndex={0}
        onMouseEnter={() => { isPasteActive.current = true; }}
        onMouseLeave={() => { isPasteActive.current = false; }}
        onFocus={() => { isPasteActive.current = true; }}
        onBlur={() => { isPasteActive.current = false; }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors select-none outline-none focus:ring-2 focus:ring-primary-300 ${
          dragging
            ? "border-primary-400 bg-primary-50"
            : "border-slate-200 hover:border-primary-300 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        {uploading ? (
          <div className="text-center text-sm text-slate-500">Uploaden...</div>
        ) : (
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Sleep bestanden hierheen
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">
                plak met <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-mono text-slate-600">Ctrl+V</kbd>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-primary-600 underline font-medium">klik om te bladeren</span>
            </div>
            <div className="text-xs text-slate-400">Afbeeldingen, PDF, Word, Excel — max 10 MB per bestand</div>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) upload(files);
          e.target.value = "";
        }}
      />
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 shadow-sm"
            >
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="max-w-[160px] truncate font-medium">{a.fileName}</span>
              <span className="text-slate-400">({formatSize(a.sizeBytes)})</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(a.id); }}
                className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors text-base leading-none"
                title="Verwijderen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttachmentList({ attachments }: { attachments: AttachmentMeta[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <a
          key={a.id}
          href={`/api/attachments/${a.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span className="max-w-[200px] truncate">{a.fileName}</span>
          <span className="text-slate-400">({formatSize(a.sizeBytes)})</span>
        </a>
      ))}
    </div>
  );
}
