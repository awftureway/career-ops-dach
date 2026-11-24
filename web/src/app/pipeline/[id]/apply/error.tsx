"use client";

export default function ApplyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-sm text-red-700 dark:text-red-400">Diese Bewerbungs-Checkliste konnte nicht geladen werden.</p>
      <p className="mt-2 text-sm text-zinc-600">{error.message || "Der Bericht oder zugehörige Dateien konnten nicht gelesen werden."}</p>
      <button
        type="button"
        className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        onClick={() => reset()}
      >
        Erneut versuchen
      </button>
    </div>
  );
}
