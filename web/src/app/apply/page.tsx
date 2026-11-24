import { Send } from "lucide-react";
import { ApplyView } from "@/components/apply-view";
import { ApplyBackdropMount } from "@/components/apply/apply-backdrop-mount";

export const dynamic = "force-dynamic";

export default function ApplyPage() {
  return (
    <div className="relative min-h-screen">
      {/* full-viewport blurred form wallpaper (behind everything) */}
      <ApplyBackdropMount />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-3">
          <Send className="size-6 text-brand-text" />
          <h1 className="font-display text-2xl tracking-tight text-landing">Bewerben</h1>
        </div>
        <p className="mt-1.5 max-w-xl text-sm text-muted">
          career-ops liest das echte Bewerbungsformular auf Ihrem Rechner und stellt es hier in einfacher Sprache dar, vorausgefüllt
          aus Ihrem Lebenslauf. Sie prüfen jede Antwort – danach füllt es das echte Formular im Hintergrund aus, und Sie senden es selbst ab.
          Es sendet nie für Sie ab.
        </p>
        <div className="mt-6">
          <ApplyView />
        </div>
      </div>
    </div>
  );
}
