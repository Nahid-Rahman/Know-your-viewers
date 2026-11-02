"use client";

/* eslint-disable @next/next/no-img-element -- previews of uploaded/blob images */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadStreamerImageAction } from "@/lib/actions/study-admin";

const MAX_SIDE = 640;

/** Downscales to at most 640 px and re-encodes as WebP so uploads stay small. */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the image."))), "image/webp", 0.85),
  );
}

export function StreamerImageUpload({
  sessionId,
  value,
  onChange,
  disabled,
}: {
  sessionId: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Choose an image file.");
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.append("file", blob, "streamer.webp");
      const r = await uploadStreamerImageAction(sessionId, fd);
      if ("error" in r) return void toast.error(r.error);
      onChange(r.data.url);
      toast.success("Photo uploaded — save the configuration to publish it.");
    } catch {
      toast.error("Couldn't read that image. Try a PNG or JPEG.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xs text-muted-foreground">
        {value ? <img src={value} alt="Streamer photo preview" className="size-full object-cover" /> : "No photo"}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-label="Upload streamer photo"
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" /> {busy ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={() => onChange("")} aria-label="Remove photo">
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
