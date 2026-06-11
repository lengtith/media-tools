import { useState, useRef, useEffect, useCallback } from "react";
import { useFFmpeg } from "@/hooks/useFFmpeg";

const VIDEO_FORMATS = ["MP4", "MKV", "WEBM", "AVI", "MOV"];
const AUDIO_FORMATS = ["MP3", "WAV", "AAC", "FLAC", "OGG"];

const EXT: Record<string, string> = {
  MP4: "mp4", MKV: "mkv", WEBM: "webm", AVI: "avi", MOV: "mov",
  MP3: "mp3", WAV: "wav", AAC: "aac", FLAC: "flac", OGG: "ogg",
};

type FileStatus = "pending" | "converting" | "done" | "error";

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  downloadUrl: string | null;
}

type QueueStatus = "idle" | "running" | "done";

export default function ConvertPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [outputFormat, setOutputFormat] = useState("MP4");
  const [isDragging, setIsDragging] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const { load, run, loadState, progress } = useFFmpeg();
  const currentIndexRef = useRef<number>(-1);

  const allFormats = [...VIDEO_FORMATS, ...AUDIO_FORMATS];

  useEffect(() => {
    load();
  }, [load]);

  // Sync FFmpeg progress into the currently-converting item
  useEffect(() => {
    const idx = currentIndexRef.current;
    if (idx < 0) return;
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, progress } : it))
    );
  }, [progress]);

  function addFiles(files: FileList | File[]) {
    const next: FileItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "pending",
      progress: 0,
      downloadUrl: null,
    }));
    setItems((prev) => [...prev, ...next]);
    setQueueStatus("idle");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.downloadUrl) URL.revokeObjectURL(item.downloadUrl);
      return prev.filter((it) => it.id !== id);
    });
  }

  function resetAll() {
    setItems((prev) => {
      prev.forEach((it) => { if (it.downloadUrl) URL.revokeObjectURL(it.downloadUrl); });
      return [];
    });
    setQueueStatus("idle");
    currentIndexRef.current = -1;
  }

  const handleConvert = useCallback(async () => {
    if (loadState !== "ready") return;
    const pending = items.filter((it) => it.status === "pending");
    if (!pending.length) return;

    setQueueStatus("running");
    const ext = EXT[outputFormat];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status !== "pending") continue;

      currentIndexRef.current = i;
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "converting", progress: 0 } : it))
      );

      const outputName = `output.${ext}`;
      try {
        const blob = await run(["-i", item.file.name, outputName], item.file, outputName);
        if (!blob) throw new Error("No output");
        const url = URL.createObjectURL(blob);
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "done", progress: 100, downloadUrl: url } : it
          )
        );
      } catch {
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: "error" } : it))
        );
      }
    }

    currentIndexRef.current = -1;
    setQueueStatus("done");
  }, [items, outputFormat, loadState, run]);

  const isLoading = loadState === "loading";
  const ffmpegReady = loadState === "ready";
  const hasPending = items.some((it) => it.status === "pending");
  const isRunning = queueStatus === "running";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 animate-pulse">
          Loading FFmpeg…
        </p>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 gap-6 overflow-y-auto py-8 bg-zinc-950">
      <div className="w-full max-w-2xl">
        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Tool</p>
        <h1 className="text-2xl font-bold text-white">Change Your Format</h1>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 border-2 py-10 cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-950"
              : "border-dashed border-zinc-700 bg-zinc-900 hover:border-indigo-500 hover:bg-indigo-950"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*,audio/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <span className="text-3xl text-zinc-700">⇄</span>
          <p className="text-sm text-zinc-400">
            Drop files here, or <span className="text-indigo-400 font-bold">browse</span>
          </p>
          <p className="text-xs text-zinc-600">Video &amp; audio files supported · multiple files allowed</p>
        </div>

        {/* File list */}
        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((item, i) => {
              const baseName = item.file.name.replace(/\.[^.]+$/, "");
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 border-2 ${
                    item.status === "done"
                      ? "border-emerald-700 bg-zinc-900"
                      : item.status === "error"
                        ? "border-red-700 bg-zinc-900"
                        : item.status === "converting"
                          ? "border-indigo-500 bg-zinc-900"
                          : "border-zinc-700 bg-zinc-900"
                  }`}
                >
                  {/* Status icon */}
                  <span className="text-lg w-5 shrink-0 text-center">
                    {item.status === "done" && <span className="text-emerald-400">✓</span>}
                    {item.status === "error" && <span className="text-red-400">✕</span>}
                    {item.status === "converting" && <span className="text-indigo-400 animate-pulse">…</span>}
                    {item.status === "pending" && <span className="text-zinc-600">○</span>}
                  </span>

                  {/* File info + progress */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{item.file.name}</p>
                    <p className="text-xs text-zinc-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    {item.status === "converting" && (
                      <div className="mt-1.5 w-full h-1 bg-zinc-800">
                        <div
                          className="h-1 bg-indigo-500 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Download or remove */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "done" && item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        download={`${baseName}.${EXT[outputFormat]}`}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wide hover:bg-emerald-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Download ↓
                      </a>
                    )}
                    {item.status === "converting" && (
                      <span className="text-xs font-bold text-indigo-400">{item.progress}%</span>
                    )}
                    {!isRunning && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none px-1"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Format selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Output Format</p>
          <div className="flex flex-wrap gap-2">
            {allFormats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setOutputFormat(fmt)}
                disabled={isRunning}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-colors disabled:opacity-40 ${
                  outputFormat === fmt
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : "border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConvert}
            disabled={!hasPending || !ffmpegReady || isRunning}
            className="flex-1 py-3 bg-indigo-500 text-white text-sm font-bold uppercase tracking-wide hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
          >
            {isRunning
              ? `Converting… (${items.filter((it) => it.status === "done" || it.status === "error").length}/${items.length})`
              : items.length > 1
                ? `Convert All (${items.filter((it) => it.status === "pending").length})`
                : "Convert"}
          </button>
          {items.length > 0 && !isRunning && (
            <button
              type="button"
              onClick={resetAll}
              className="px-5 py-3 border-2 border-zinc-700 text-zinc-400 text-sm font-bold uppercase tracking-wide hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
