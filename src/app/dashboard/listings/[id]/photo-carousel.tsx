"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadResourcePhotos, deleteResourcePhoto } from "./photo-actions";

type CarouselPhoto = {
  src: string;
  deletable: boolean;
  photoId?: string;
  storagePath?: string;
};

export function PhotoCarousel({
  resourceId,
  resourceLabel,
  initialPhotos,
}: {
  resourceId: string;
  resourceLabel: string;
  initialPhotos: CarouselPhoto[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [index, setIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const count = photos.length;
  const current = count > 0 ? photos[index] : null;

  function prevPhoto() {
    if (count === 0) return;
    setIndex((i) => (i - 1 + count) % count);
  }
  function nextPhoto() {
    if (count === 0) return;
    setIndex((i) => (i + 1) % count);
  }

  function handleUpload(formData: FormData) {
    setUploadError(null);
    startTransition(async () => {
      const result = await uploadResourcePhotos(resourceId, formData);

      if (result.errors.length === 0) {
        // Every file in the batch succeeded — nothing to show.
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const failedNames = result.errors
        .map((e) => (e.fileName ? `${e.fileName} (${e.message})` : e.message))
        .join(", ");

      if (result.uploadedCount > 0) {
        setUploadError(
          `${result.uploadedCount} photo(s) uploaded. ${result.errors.length} failed: ${failedNames}`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setUploadError(failedNames);
      }
    });
  }

  function handleDelete(photo: CarouselPhoto) {
    if (!photo.photoId || !photo.storagePath) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteResourcePhoto(
        photo.photoId!,
        photo.storagePath!,
        resourceId
      );
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setPhotos((prev) => {
          const next = prev.filter((p) => p !== photo);
          setIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
          return next;
        });
      }
    });
  }

  return (
    <div className="mb-6">
      <div className="relative mb-3 w-full overflow-hidden rounded-md border border-guest-border bg-guest-band">
        {current ? (
          <Image
            src={current.src}
            alt={`${resourceLabel} photo ${index + 1}`}
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, 720px"
            className="h-auto max-h-[70vh] w-full object-contain"
            priority={index === 0}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center">
            <span className="text-xs text-guest-muted">
              No photos yet — upload one below.
            </span>
          </div>
        )}

        {current?.deletable && (
          <button
            type="button"
            onClick={() => handleDelete(current)}
            disabled={isPending}
            className="guest-btn absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? "…" : "Delete this photo"}
          </button>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prevPhoto}
              aria-label="Previous photo"
              className="guest-btn absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-guest-ink shadow"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              aria-label="Next photo"
              className="guest-btn absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-guest-ink shadow"
            >
              ›
            </button>

            <div className="absolute bottom-3 left-1/2 flex max-w-[85%] -translate-x-1/2 flex-wrap justify-center gap-1.5">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 flex-none rounded-full ${
                    i === index ? "bg-guest-navy" : "bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {deleteError && (
        <p className="mb-2 text-xs text-red-600">{deleteError}</p>
      )}

      <form action={handleUpload} className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
          className="text-xs text-guest-muted file:mr-3 file:rounded-md file:border file:border-guest-border file:bg-white file:px-3 file:py-1.5 file:text-xs file:text-guest-ink"
        />
        <button
          type="submit"
          disabled={isPending}
          className="guest-btn flex-none rounded-md bg-guest-navy px-4 py-1.5 text-xs font-medium text-white hover:bg-guest-navy-dark disabled:opacity-50"
        >
          {isPending ? "Uploading…" : "Upload"}
        </button>
      </form>
      {uploadError && (
        <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
      )}
      <p className="mt-1.5 text-xs text-guest-muted">
        Select multiple at once (Ctrl/Cmd-click, or Shift-click for a range). JPEG, PNG, or WebP, up to 8MB each. Uploaded photos can be deleted from here; the original set can&apos;t.
      </p>
    </div>
  );
}