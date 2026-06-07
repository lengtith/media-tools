import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type LoadState = "idle" | "loading" | "ready" | "error";

export interface RunManyInput {
  file: File;
  name: string; // name to use inside the FFmpeg virtual FS
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [progress, setProgress] = useState(0); // 0–100
  const [logs, setLogs] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (loadState === "ready" || loadState === "loading") return;
    setLoadState("loading");
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("log", ({ message }) =>
        setLogs((prev) => [...prev.slice(-49), message])
      );
      ffmpeg.on("progress", ({ progress: p }) =>
        setProgress(Math.round(p * 100))
      );

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setLoadState("ready");
    } catch (err) {
      console.error("FFmpeg failed to load", err);
      setLoadState("error");
    }
  }, [loadState]);

  // Single input file → single output blob
  const run = useCallback(
    async (args: string[], inputFile: File, outputName: string): Promise<Blob | null> => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg || loadState !== "ready") return null;

      setProgress(0);
      await ffmpeg.writeFile(inputFile.name, await fetchFile(inputFile));
      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile(outputName);
      await ffmpeg.deleteFile(inputFile.name);
      await ffmpeg.deleteFile(outputName);
      return new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" });
    },
    [loadState]
  );

  // Multiple input files → multiple output blobs
  const runMany = useCallback(
    async (
      inputs: RunManyInput[],
      args: string[],
      outputNames: string[]
    ): Promise<Blob[]> => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg || loadState !== "ready") return [];

      setProgress(0);

      for (const { file, name } of inputs) {
        await ffmpeg.writeFile(name, await fetchFile(file));
      }

      await ffmpeg.exec(args);

      const blobs: Blob[] = [];
      for (const name of outputNames) {
        const data = await ffmpeg.readFile(name);
        blobs.push(new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" }));
        await ffmpeg.deleteFile(name);
      }

      for (const { name } of inputs) {
        await ffmpeg.deleteFile(name);
      }

      return blobs;
    },
    [loadState]
  );

  return { load, run, runMany, loadState, progress, logs };
}
