import type { NextApiRequest, NextApiResponse } from "next";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

export const config = { api: { responseLimit: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url, formatId, audioExt } =
    req.method === "GET"
      ? (req.query as { url?: string; formatId?: string; audioExt?: string })
      : (req.body as { url?: string; formatId?: string; audioExt?: string });

  if (!url || !formatId) return res.status(400).json({ error: "Missing params" });

  const tmpDir = await mkdtemp(join(tmpdir(), "ytdl-"));
  try {
    const args = ["--no-playlist", "-f", formatId];
    if (audioExt) {
      args.push("-x", "--audio-format", audioExt);
    }
    args.push("-o", join(tmpDir, "%(title)s.%(ext)s"), url);

    await execFileAsync("yt-dlp", args);

    const files = await readdir(tmpDir);
    if (!files[0]) throw new Error("No output file");

    const filePath = join(tmpDir, files[0]);
    const data = await readFile(filePath);
    const ext = files[0].slice(files[0].lastIndexOf(".") + 1).toLowerCase();

    const mime: Record<string, string> = {
      mp4: "video/mp4", webm: "video/webm", mkv: "video/x-matroska",
      mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac",
      flac: "audio/flac", m4a: "audio/mp4", ogg: "audio/ogg",
    };

    const asciiFallback = files[0].replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "_");
    const encodedName = encodeURIComponent(files[0]);
    res.setHeader("Content-Type", mime[ext] ?? "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
    );
    res.status(200).send(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    res.status(500).json({ error: msg });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
