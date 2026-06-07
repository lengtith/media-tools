import { useState, useRef, useEffect } from "react";
import { useFFmpeg } from "@/hooks/useFFmpeg";

type Status = "idle" | "ready" | "merging" | "done" | "error";

interface MediaFile {
  id: string;
  file: File;
}

export default function MergePage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("merged");
  const inputRef = useRef<HTMLInputElement>(null);
  const { load, runMany, loadState, progress } = useFFmpeg();

  useEffect(() => {
    load();
  }, [load]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next: MediaFile[] = Array.from(incoming).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
    }));
    setFiles((prev) => {
      const updated = [...prev, ...next];
      if (updated.length >= 2) setStatus("ready");
      return updated;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      setStatus(updated.length >= 2 ? "ready" : "idle");
      return updated;
    });
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    if (files.length < 2 || loadState !== "ready") return;
    setStatus("merging");
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    const firstExt = files[0].file.name
      .slice(files[0].file.name.lastIndexOf(".") + 1)
      .toLowerCase();
    const outFile = `${outputName || "merged"}.${firstExt}`;
    const inputs = files.map(({ file }, i) => ({
      file,
      name: `input${i}.${file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()}`,
    }));
    const concatContent = inputs.map(({ name }) => `file '${name}'`).join("\n");

    try {
      const concatFile = new File(
        [new Blob([concatContent], { type: "text/plain" })],
        "concat.txt",
      );
      const blobs = await runMany(
        [{ file: concatFile, name: "concat.txt" }, ...inputs],
        [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          "concat.txt",
          "-c",
          "copy",
          outFile,
        ],
        [outFile],
      );
      if (!blobs[0]) throw new Error("No output");
      setDownloadUrl(URL.createObjectURL(blobs[0]));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFiles([]);
    setStatus("idle");
    setDownloadUrl(null);
    setOutputName("merged");
  }

  const ffmpegReady = loadState === "ready";
  const isLoading = loadState === "loading";
  const firstExt =
    files[0]?.file.name
      .slice(files[0].file.name.lastIndexOf(".") + 1)
      .toUpperCase() ?? "";

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
      <div className="w-full max-w-xl">
        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
          Tool
        </p>
        <h1 className="text-2xl font-bold text-white">Join Into One</h1>
      </div>

      <form
        onSubmit={handleMerge}
        className="w-full max-w-xl flex flex-col gap-4"
      >
        {/* File queue */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Queue — order matters
            </p>
            {files.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-700 px-4 py-2.5"
              >
                <span className="text-xs font-bold text-zinc-600 w-5 shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-zinc-100 truncate">
                  {item.file.name}
                </span>
                <span className="text-xs text-zinc-500 shrink-0">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors text-zinc-400 text-xs font-bold"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === files.length - 1}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors text-zinc-400 text-xs font-bold"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="w-7 h-7 flex items-center justify-center bg-red-950 hover:bg-red-500 hover:text-white transition-colors text-red-400 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 py-8 cursor-pointer transition-colors ${
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
          <span className="text-3xl text-zinc-700">⊕</span>
          <p className="text-sm text-zinc-400">
            {files.length === 0 ? (
              <>
                <span>Drop files here, or </span>
                <span className="text-indigo-400 font-bold">browse</span>
              </>
            ) : (
              <span className="text-indigo-400 font-bold">Add more files</span>
            )}
          </p>
          {files.length === 0 && (
            <p className="text-xs text-zinc-600">
              Add at least 2 files · order matters
            </p>
          )}
        </div>

        {/* Output filename */}
        {files.length >= 2 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Output Filename
            </label>
            <div className="flex border-2 border-zinc-700 focus-within:border-indigo-500 transition-colors bg-zinc-900">
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm bg-transparent text-zinc-100 outline-none"
              />
              {firstExt && (
                <span className="px-4 py-2.5 text-xs font-bold text-zinc-500 bg-zinc-800 border-l-2 border-zinc-700 flex items-center">
                  .{firstExt.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {status === "merging" && (
          <div className="flex flex-col gap-1">
            <div className="w-full h-2 bg-zinc-800">
              <div
                className="h-2 bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-zinc-500 text-right">
              {progress}%
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === "done" && downloadUrl ? (
            <a
              href={downloadUrl}
              download={`${outputName || "merged"}.${files[0]?.file.name.slice(files[0].file.name.lastIndexOf(".") + 1).toLowerCase() ?? "mp4"}`}
              className="flex-1 py-3 bg-emerald-500 text-white text-sm font-bold uppercase tracking-wide hover:bg-emerald-400 transition-colors text-center"
            >
              Download ↓
            </a>
          ) : (
            <button
              type="submit"
              disabled={status !== "ready" || !ffmpegReady}
              className="flex-1 py-3 bg-indigo-500 text-white text-sm font-bold uppercase tracking-wide hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
            >
              {status === "merging"
                ? "Merging…"
                : `Merge${files.length > 0 ? ` (${files.length})` : ""}`}
            </button>
          )}
          {files.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="px-5 py-3 border-2 border-zinc-700 text-zinc-400 text-sm font-bold uppercase tracking-wide hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {status === "error" && (
          <div className="bg-red-950 border-2 border-red-500 px-4 py-3">
            <p className="text-sm text-red-400 font-semibold">
              Merge failed. Files must be the same format and codec.
            </p>
          </div>
        )}
      </form>
    </main>
  );
}
