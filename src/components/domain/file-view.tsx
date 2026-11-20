"use client";

import * as React from "react";
import { Download, FileX } from "@/components/icons";
import { fileUrl } from "@/services";
import { cn } from "@/lib/utils";

/** How the browser can show a stored file, judged from its name. */
export function viewableAs(name: string): "pdf" | "image" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png"].includes(ext)) return "image";
  return null;
}

/** A link that downloads the stored file. */
export function DownloadLink({ fileId, name, className }: { fileId: string; name: string; className?: string }) {
  return (
    <a
      href={fileUrl(fileId, true)}
      download={name}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-sm hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none",
        className,
      )}
    >
      <Download className="size-4" aria-hidden />
      Download
    </a>
  );
}

/**
 * The uploaded file itself: PDFs in the browser's viewer, images as they are. Other formats (Word) can't be
 * shown in a browser, so the reader gets a download instead, or `fallback` when the caller has something better.
 */
export function FileView({ fileId, name, fallback, className }: { fileId?: string; name: string; fallback?: React.ReactNode; className?: string }) {
  const as = fileId ? viewableAs(name) : null;
  if (fileId && as === "pdf")
    return <iframe title={name} src={`${fileUrl(fileId)}#view=FitH`} className={cn("h-[70vh] min-h-96 w-full rounded-md border border-line bg-ink-100", className)} />;
  if (fileId && as === "image")
    return (
      <div className={cn("grid place-items-center rounded-md bg-ink-100 p-3", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- private file served by the API, not a static asset */}
        <img src={fileUrl(fileId)} alt={name} className="max-h-[70vh] w-auto rounded-xs shadow-md" />
      </div>
    );
  if (fallback) return <>{fallback}</>;
  return (
    <div className={cn("grid min-h-64 place-items-center rounded-md bg-ink-100 p-6 text-center", className)}>
      <div className="max-w-xs">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface text-ink-500 shadow-sm">
          <FileX className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-semibold text-fg">{fileId ? "Your browser can't show this file" : "No file stored"}</p>
        <p className="mt-1 text-xs text-fg-muted">{fileId ? "Download it to open it in Word or another app." : "This document was added without a file."}</p>
        {fileId && <DownloadLink fileId={fileId} name={name} className="mt-4" />}
      </div>
    </div>
  );
}
