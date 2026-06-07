import { useState } from "react";
import type { VideoInfo, FormatOption } from "@/types/media";

const AUDIO_CONTAINERS = ["MP3", "WAV", "AAC", "FLAC", "M4A (original)"];

type Step = "url" | "processing" | "format" | "downloading" | "done" | "error";

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

declare global {
  interface Window {
    showSaveFilePicker?: (opts: {
      suggestedName?: string;
    }) => Promise<FileSystemFileHandle>;
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("url");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(
    null,
  );
  const [audioContainer, setAudioContainer] = useState("MP3");
  const [errorMsg, setErrorMsg] = useState("");

  const videoFormats = info?.formats.filter((f) => f.type === "video") ?? [];
  const audioFormats = info?.formats.filter((f) => f.type === "audio") ?? [];

  async function handleProcess(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setStep("processing");
    setErrorMsg("");
    setInfo(null);
    setSelectedFormat(null);
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch info");
      setInfo(json);
      const best =
        (json as VideoInfo).formats.find(
          (f: FormatOption) => f.type === "video",
        ) ?? null;
      setSelectedFormat(best);
      setStep("format");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not fetch video info",
      );
      setStep("error");
    }
  }

  async function handleDownload(format: FormatOption, container?: string) {
    if (!info) return;
    setErrorMsg("");
    setSelectedFormat(format);
    const isAudio = format.type === "audio";
    const resolvedContainer = container ?? audioContainer;
    if (resolvedContainer) setAudioContainer(resolvedContainer);
    const audioExt =
      isAudio && resolvedContainer !== "M4A (original)"
        ? resolvedContainer.toLowerCase()
        : undefined;
    const outputExt = isAudio
      ? resolvedContainer === "M4A (original)"
        ? "m4a"
        : resolvedContainer.toLowerCase()
      : format.ext;
    const safeName = info.title.replace(/[\\/:*?"<>|]/g, "_");
    const suggestedName = `${safeName}.${outputExt}`;

    const params = new URLSearchParams({ url, formatId: format.id });
    if (audioExt) params.set("audioExt", audioExt);
    const downloadUrl = `/api/download?${params.toString()}`;

    // Try to open save-file picker (supported in Chrome/Edge)
    if (typeof window.showSaveFilePicker === "function") {
      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await window.showSaveFilePicker({ suggestedName });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      }
      setStep("downloading");
      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(
            (json as { error?: string }).error ?? `Server error ${res.status}`,
          );
        }
        const writable = await fileHandle.createWritable();
        await res.body!.pipeTo(writable);
        setStep("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Download failed");
        setStep("error");
      }
      return;
    }

    // Fallback: native browser download (shows in download bar)
    setStep("downloading");
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setStep("done"), 3000);
  }

  function reset() {
    setUrl("");
    setInfo(null);
    setSelectedFormat(null);
    setAudioContainer("MP3");
    setErrorMsg("");
    setStep("url");
  }

  const isDownloading = step === "downloading";
  const showFormatStep =
    step === "format" || step === "downloading" || step === "done";

  return (
    <>
      {/* Download progress modal */}
      {isDownloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border-2 border-indigo-500 px-8 py-7 flex flex-col items-center gap-4 w-72">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-zinc-100 text-center">
              Downloading from YouTube…
            </p>
            <p className="text-xs text-zinc-500 text-center">
              This may take a moment depending on file size.
            </p>
          </div>
        </div>
      )}
      {/* Done modal */}
      {step === "done" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border-2 border-emerald-500 px-8 py-7 flex flex-col items-center gap-4 w-72">
            <span className="text-3xl">✓</span>
            <p className="text-sm font-bold text-emerald-400 text-center uppercase tracking-wide">
              Download started!
            </p>
            <p className="text-xs text-zinc-500 text-center">
              Check your browser&apos;s download bar.
            </p>
            <button
              onClick={reset}
              className="mt-1 px-5 py-2 border-2 border-indigo-500 text-indigo-400 text-xs font-bold uppercase tracking-wide hover:bg-indigo-500 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <main
        className={`flex flex-1 flex-col items-center px-4 gap-6 overflow-y-auto py-8 bg-zinc-950 transition-all duration-300 ease-out ${showFormatStep ? "justify-start" : "justify-center"}`}
      >
        <div className="w-full max-w-xl">
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
            Quick Download
          </p>
          <h1 className="text-2xl font-bold text-white">
            Paste. Download. Done.
          </h1>
        </div>

        <div className="w-full max-w-xl flex flex-col gap-3">
          <form onSubmit={handleProcess} className="flex">
            <input
              type="search"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (step !== "url") reset();
              }}
              placeholder="https://youtube.com/watch?v=..."
              required
              disabled={isDownloading || step === "processing"}
              className="flex-1 px-4 py-3 text-sm border-2 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                step === "processing" ||
                step === "format" ||
                step === "done" ||
                isDownloading
              }
              className="px-5 py-3 bg-indigo-500 text-white text-sm font-bold uppercase tracking-wide hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors shrink-0"
            >
              {step === "processing" ? "…" : "Process"}
            </button>
          </form>

          {info && (
            <div className="flex items-center gap-4 border-2 border-zinc-700 bg-zinc-900 px-4 py-3">
              {info.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.thumbnail}
                  alt=""
                  className="w-20 h-12 object-cover shrink-0 bg-zinc-800"
                />
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">
                  {info.title}
                </p>
                <p className="text-xs text-zinc-400">
                  {info.uploader}
                  {info.duration ? ` · ${formatDuration(info.duration)}` : ""}
                </p>
              </div>
            </div>
          )}

          {showFormatStep && (
            <div className="flex flex-col gap-3">
              {videoFormats.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Video
                  </p>
                  {videoFormats.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleDownload(f)}
                      disabled={isDownloading}
                      className={`flex items-center justify-between px-4 py-2.5 text-left border-2 transition-colors disabled:cursor-not-allowed group ${
                        selectedFormat?.id === f.id && isDownloading
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-indigo-500 hover:bg-indigo-950"
                      }`}
                    >
                      <span className="text-sm">{f.label}</span>
                      <span
                        className={`text-xs font-bold shrink-0 ml-3 ${
                          selectedFormat?.id === f.id && isDownloading
                            ? "text-white animate-pulse"
                            : "text-zinc-500 group-hover:text-indigo-400"
                        }`}
                      >
                        {selectedFormat?.id === f.id && isDownloading
                          ? "Downloading…"
                          : "↓ Download"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {audioFormats.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Audio only
                  </p>
                  {audioFormats.map((f) => (
                    <div key={f.id} className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-1">
                        {f.label}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {AUDIO_CONTAINERS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleDownload(f, c)}
                            disabled={isDownloading}
                            className={`flex-1 min-w-[80px] px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-colors disabled:cursor-not-allowed group ${
                              selectedFormat?.id === f.id &&
                              audioContainer === c &&
                              isDownloading
                                ? "border-indigo-500 bg-indigo-500 text-white"
                                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-950"
                            }`}
                          >
                            {selectedFormat?.id === f.id &&
                            audioContainer === c &&
                            isDownloading
                              ? "…"
                              : `↓ ${c}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "processing" && (
            <p className="text-xs text-zinc-500 text-center animate-pulse">
              Fetching video info…
            </p>
          )}
          {step === "error" && (
            <div className="flex flex-col gap-2">
              <div className="bg-red-950 border-2 border-red-500 px-4 py-3">
                <p className="text-sm text-red-400 font-semibold">{errorMsg}</p>
              </div>
              <button
                onClick={reset}
                className="text-xs text-indigo-400 font-bold uppercase tracking-wide hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
