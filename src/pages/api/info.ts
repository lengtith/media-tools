import type { NextApiRequest, NextApiResponse } from "next";
import { execFile } from "child_process";
import { promisify } from "util";
import type { VideoInfo, FormatOption } from "@/types/media";

const execFileAsync = promisify(execFile);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body as { url?: string };
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--dump-json",
      "--no-playlist",
      url,
    ]);
    const data = JSON.parse(stdout);

    const formats: FormatOption[] = (
      data.formats as Array<{
        format_id: string;
        ext: string;
        filesize?: number;
        filesize_approx?: number;
        vcodec?: string;
        acodec?: string;
        height?: number;
        abr?: number;
        format_note?: string;
      }>
    )
      .filter((f) => f.vcodec !== "none" || f.acodec !== "none")
      .map((f) => {
        const isVideo = f.vcodec && f.vcodec !== "none";
        const label = isVideo
          ? `${f.height ? f.height + "p" : f.format_note ?? f.format_id} · ${f.ext.toUpperCase()}`
          : `Audio ${f.abr ? Math.round(f.abr) + "kbps" : ""} · ${f.ext.toUpperCase()}`;
        return {
          id: f.format_id,
          label,
          ext: f.ext,
          filesize: f.filesize ?? f.filesize_approx ?? null,
          type: isVideo ? "video" : "audio",
        } satisfies FormatOption;
      })
      .reverse();

    const info: VideoInfo = {
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      uploader: data.uploader ?? data.channel ?? "",
      formats,
    };

    res.status(200).json(info);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "yt-dlp failed";
    res.status(500).json({ error: msg });
  }
}
