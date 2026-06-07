export interface FormatOption {
  id: string;
  label: string;
  ext: string;
  filesize: number | null;
  type: "video" | "audio";
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  formats: FormatOption[];
}
