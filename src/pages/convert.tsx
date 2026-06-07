import { useState, useRef, useEffect } from "react";
import { useFFmpeg } from "@/hooks/useFFmpeg";

const VIDEO_FORMATS = ["MP4", "MKV", "WEBM", "AVI", "MOV"];
const AUDIO_FORMATS = ["MP3", "WAV", "AAC", "FLAC", "OGG"];

const EXT: Record<string, string> = {
  MP4: "mp4",
  MKV: "mkv",
  WEBM: "webm",
  AVI: "avi",
  MOV: "mov",
  MP3: "mp3",
  WAV: "wav",
  AAC: "aac",
  FLAC: "flac",
  OGG: "ogg",
};

type Status = "idle" | "ready" | "converting" | "done" | "error";

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("MP4");
  const [status, setStatus] = useState<Status>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { load, run, loadState, progress } = useFFmpeg();

  const allFormats = [...VIDEO_FORMATS, ...AUDIO_FORMATS];

  useEffect(() => {
    load();
  }, [load]);

  function handleFile(f: File) {
    setFile(f);
    setDownloadUrl(null);
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

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!file || loadState !== "ready") return;
    setStatus("converting");
    setDownloadUrl(null);
    const ext = EXT[outputFormat];
    const outputName = `output.${ext}`;
    try {
      const blob = await run(["-i", file.name, outputName], file, outputName);
      if (!blob) throw new Error("No output");
      setDownloadUrl(URL.createObjectURL(blob));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setStatus("idle");
    setOutputFormat("MP4");
    setDownloadUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "output";
  const isLoading = loadState === "loading";
  const ffmpegReady = loadState === "ready";

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
        <h1 className="text-2xl font-bold text-white">Change Your Format</h1>
      </div>

      <form
        onSubmit={handleConvert}
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
              <span className="text-3xl text-indigo-400">▣</span>
              <p className="text-sm font-semibold text-zinc-100 truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-zinc-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <span className="text-3xl text-zinc-700">⇄</span>
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

        {/* Format selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Output Format
          </p>
          <div className="flex flex-wrap gap-2">
            {allFormats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setOutputFormat(fmt)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-colors ${
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

        {/* Progress */}
        {status === "converting" && (
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
              download={`${baseName}.${EXT[outputFormat]}`}
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
              {status === "converting" ? "Converting…" : "Convert"}
            </button>
          )}
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
              Conversion failed. Please try again.
            </p>
          </div>
        )}
      </form>
    </main>
  );
}
