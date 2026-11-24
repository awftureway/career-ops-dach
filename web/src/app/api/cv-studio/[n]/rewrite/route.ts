import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/json-body";
import { keywordsInText, loadStudio, missingDataFolderMessage, unsupportedRewriteClaims } from "@/lib/cv-studio/server";
import { runRewrite } from "@/lib/cv-studio/rewrite-run";
import { buildRewritePrompt, MAX_INSTRUCTION, parseRewrite } from "@/lib/cv-studio/rewrite.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 150;

type RouteContext = { params: Promise<{ n: string }> };

const MESSAGES = {
  "no-cli": "Es ist keine KI-CLI eingerichtet. Wählen Sie in den Einstellungen eine aus oder ändern Sie den Wortlaut von Hand.",
  unfenced: "Diese KI-CLI lässt sich nicht auf Nur-Lese-Zugriff beschränken, daher lief die Umformulierung nicht. Wählen Sie in den Einstellungen Claude, Codex oder Grok oder ändern Sie den Wortlaut von Hand.",
  refused: "Die KI-CLI konnte nicht mit Nur-Lese-Zugriff gestartet werden, daher lief nichts.",
  failed: "Die KI-CLI wurde nicht fertig. Prüfen Sie, ob sie angemeldet ist, und versuchen Sie es erneut.",
  "no-answer": "Die KI-CLI antwortete ohne brauchbaren Aufzählungspunkt. Versuchen Sie eine andere Anweisung.",
  unsupported: "Die Umformulierung wurde verworfen, weil sie Formulierungen ergänzt, die dieser Punkt nicht belegt:",
} as const;

export async function POST(req: Request, { params }: RouteContext) {
  const n = (await params).n;
  const body = await readJsonObject<{ bulletId?: unknown; instruction?: unknown; cliId?: unknown }>(req);
  if (!body || typeof body.bulletId !== "string" || typeof body.instruction !== "string" || typeof body.cliId !== "string") {
    return NextResponse.json({ error: "bulletId, instruction and cliId required" }, { status: 400 });
  }
  const instruction = body.instruction.trim().slice(0, MAX_INSTRUCTION);
  if (!instruction) return NextResponse.json({ error: "Beschreiben Sie, wie sich der Punkt ändern soll." }, { status: 400 });
  const missing = missingDataFolderMessage();
  if (missing) return NextResponse.json({ error: missing }, { status: 400 });

  const load = await loadStudio(n);
  if (!load.ok) return NextResponse.json({ error: load.reason }, { status: 404 });
  const bullet = load.doc.sections.flatMap((s) => s.items.flatMap((i) => i.bullets)).find((b) => b.id === body.bulletId);
  if (!bullet) return NextResponse.json({ error: "unknown bullet" }, { status: 404 });

  const run = await runRewrite(body.cliId, buildRewritePrompt({ instruction, base: bullet.base, tailored: bullet.tailored, keywords: load.doc.keywords }));
  if (!run.ok) {
    if (run.detail) console.error(`cv-studio rewrite ${run.reason}: ${run.detail}`);
    return NextResponse.json({ error: MESSAGES[run.reason] }, { status: 502 });
  }
  const text = parseRewrite(run.reply);
  if (!text) return NextResponse.json({ error: MESSAGES["no-answer"] }, { status: 422 });
  const check = await unsupportedRewriteClaims(text, [bullet.base, bullet.tailored].filter((t) => t !== null).join("\n"));
  if (check.claims.length) return NextResponse.json({ error: `${MESSAGES.unsupported} ${check.claims.join(", ")}.`, claims: check.claims }, { status: 422 });
  const warning = [run.warning, check.warning].filter((item) => item).join(" ") || null;
  return NextResponse.json({ text, keywords: (await keywordsInText(n, text)) ?? [], warning });
}
