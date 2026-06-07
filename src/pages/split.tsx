import { useState, useRef, useEffect } from "react";
import { useFFmpeg } from "@/hooks/useFFmpeg";

type Mode = "time" | "chapters";
type Status = "idle" | "ready" | "splitting" | "done" | "error";

interface OutputBlob {
  name: string;
  url: string;
}

function ext(filename: string) {
  return filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
}

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("time");
  const [status, setStatus] = useState<Status>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [outputs, setOutputs] = useState<OutputBlob[]>([]);
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("00:00:30");
  const [chapters, setChapters] = useState("00:00:00, 00:01:00, 00:03:00");

  const inputRef = useRef<HTMLInputElement>(null);
  const { load, runMany, loadState, progress } = useFFmpeg();

  useEffect(() => {
    load();
  }, [load]);

  function handleFile(f: File) {
    setFile(f);
    setOutputs([]);
    setStatus("ready");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleSplit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || loadState !== "ready") return;
    setStatus("splitting");
    setOutputs([]);
    const fileExt = ext(file.name);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    try {
      let args: string[];
      let outputNames: string[];
      if (mode === "time") {
        const outName = `${baseName}_clip.${fileExt}`;
        args = [
          "-i",
          file.name,
          "-ss",
          startTime,
          "-to",
          endTime,
          "-c",
          "copy",
          outName,
        ];
        outputNames = [outName];
      } else {
        const points = chapters
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const segArgs: string[] = ["-i", file.name];
        outputNames = [];
        points.forEach((start, i) => {
          const end = points[i + 1] ?? "99:59:59";
          const outName = `${baseName}_part${i + 1}.${fileExt}`;
          outputNames.push(outName);
          segArgs.push("-ss", start, "-to", end, "-c", "copy", outName);
        });
        args = segArgs;
      }
      const blobs = await runMany(
        [{ file, name: file.name }],
        args,
        outputNames,
      );
      setOutputs(
        blobs.map((blob, i) => ({
          name: outputNames[i],
          url: URL.createObjectURL(blob),
        })),
      );
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    outputs.forEach((o) => URL.revokeObjectURL(o.url));
    setFile(null);
    setOutputs([]);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const ffmpegReady = loadState === "ready";
  const isLoading = loadState === "loading";

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
        <h1 className="text-2xl font-bold text-white">Cut With Precision</h1>
      </div>

      <form
        onSubmit={handleSplit}
        className="w-full max-w-xl flex flex-col gap-4"
      >
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 border-2 py-10 cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-950"
              : file
                ? "border-indigo-500 bg-zinc-900"
                : "border-dashed border-zinc-700 bg-zinc-900 hover:border-indigo-500 hover:bg-indigo-950"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileInput}
            className="hidden"
          />
          {file ? (
            <>
              <span className="text-3xl text-indigo-400">⌿</span>
              <p className="text-sm font-semibold text-zinc-100 truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-zinc-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <span className="text-3xl text-zinc-700">⌿</span>
              <p className="text-sm text-zinc-400">
                Drop a file here, or{" "}
                <span className="text-indigo-400 font-bold">browse</span>
              </p>
              <p className="text-xs text-zinc-600">
                Video &amp; audio files supported
              </p>
            </>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Split By
          </p>
          <div className="flex">
            {(["time", "chapters"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide border-2 transition-colors ${
                  mode === m
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : "border-zinc-700 text-zinc-400 hover:border-indigo-500"
                } ${m === "chapters" ? "-ml-[2px]" : ""}`}
              >
                {m === "time" ? "Time Range" : "Split Points"}
              </button>
            ))}
          </div>
        </div>

        {mode === "time" && (
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Start
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="00:00:00"
                className="border-2 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none px-4 py-2.5 text-sm font-mono"
              />
            </div>
            <span className="text-zinc-600 pb-2.5 font-bold">→</span>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                End
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="00:00:30"
                className="border-2 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none px-4 py-2.5 text-sm font-mono"
              />
            </div>
          </div>
        )}

        {mode === "chapters" && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Split Points (comma-separated)
            </label>
            <input
              type="text"
              value={chapters}
              onChange={(e) => setChapters(e.target.value)}
              placeholder="00:00:00, 00:01:00, 00:03:00"
              className="border-2 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 outline-none px-4 py-2.5 text-sm font-mono"
            />
            <p className="text-xs text-zinc-600">
              Each timestamp marks the start of a new segment
            </p>
          </div>
        )}

        {/* Progress */}
        {status === "splitting" && (
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

        {/* Download list */}
        {status === "done" && outputs.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {outputs.length} segment{outputs.length > 1 ? "s" : ""} ready
            </p>
            {outputs.map((o) => (
              <a
                key={o.name}
                href={o.url}
                download={o.name}
                className="flex items-center justify-between px-4 py-3 bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
              >
                <span className="text-sm font-semibold truncate">{o.name}</span>
                <span className="text-xs font-bold shrink-0 ml-3">
                  Download ↓
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={status !== "ready" || !ffmpegReady}
            className="flex-1 py-3 bg-indigo-500 text-white text-sm font-bold uppercase tracking-wide hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
          >
            {status === "splitting" ? "Splitting…" : "Split"}
          </button>
          {file && (
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
              Split failed. Please try again.
            </p>
          </div>
        )}
      </form>
    </main>
  );
}
