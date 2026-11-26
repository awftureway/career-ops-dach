// Opt-in real Chrome regression. Use a loopback Web server with disposable data.
// Assistant APIs are fictional. Only the canonical set-status CLI runs, against
// a separate temporary tracker; no model, employer or application is contacted.
import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { liveServerSkip } from "../helpers/live-server.mjs";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const url = process.env.ASSISTANT_STATUS_TEST_URL;
test("status confirmations recover from busy writes without replaying ambiguous outcomes", { skip: liveServerSkip("ASSISTANT_STATUS_TEST_URL"), timeout: 120_000 }, async (t) => {
  const origin = new URL(url);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname));
  const root = await mkdtemp(path.join(tmpdir(), "career-ops-status-confirm-"));
  const tracker = path.join(root, "data", "applications.md");
  await mkdir(path.dirname(tracker));
  await writeFile(tracker, `# Fictional tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n${[11, 12, 13, 14].map(n => `| ${n} | 2026-01-01 | Fixture${n} | Engineer | 4.0/5 | Evaluated | ❌ | — | synthetic |`).join("\n")}\n`);
  async function commit(n) {
    const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL("../../../set-status.mjs", import.meta.url)), "--row", n, "Rejected", "--source", "web", "--json"], {
      env: { ...process.env, CAREER_OPS_ROOT: root, CAREER_OPS_DATA_DIR: "", CAREER_OPS_TRACKER: tracker, CAREER_OPS_TRACKER_LOCK: path.join(root, "career-ops-merge-tracker-test.lock") }, timeout: 30_000,
    });
    return JSON.parse(stdout);
  }
  const ledger = async () => (await readFile(path.join(root, "data", "status-log.tsv"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean);
  const replies = new Map();
  const calls = []; const unexpected = []; const releases = new Map();
  let browser;
  const fixture = http.createServer(async (req, res) => {
    let text = ""; for await (const chunk of req) text += chunk;
    res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": origin.origin });
    res.flushHeaders(); replies.set(JSON.parse(text).message, res);
  });
  t.after(async () => {
    releases.forEach(resolve => resolve());
    await browser?.close();
    replies.forEach(r => r.end()); fixture.closeAllConnections();
    if (fixture.listening) await new Promise(resolve => fixture.close(resolve));
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });
  await new Promise(resolve => fixture.listen(0, "127.0.0.1", resolve));
  const { chromium } = await import("playwright-core");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const cdp = await page.context().newCDPSession(page); await cdp.send("Accessibility.enable");
  let saved; let revision = 0;
  await page.addInitScript(() => { localStorage.setItem("career-ops:config", JSON.stringify({ cliId: "fixture-cli" })); localStorage.setItem("career-ops:first-score-seen", "1"); });
  await page.route("**/api/**", route => {
    if (route.request().method() === "GET") return route.continue();
    unexpected.push(route.request().url()); return route.abort();
  });
  await page.route("**/api/assistant/chats**", route => {
    const request = route.request();
    if (request.method() === "PUT") { saved = { ...request.postDataJSON(), revision: ++revision, title: "Fictional recovery" }; return route.fulfill({ json: saved }); }
    return route.fulfill({ json: new URL(request.url()).searchParams.has("id") ? saved : { chats: saved ? [{ id: saved.id, title: saved.title, revision }] : [], errors: [] } });
  });
  await page.route("**/api/clis", route => route.fulfill({ json: { clis: [{ id: "fixture-cli", installed: true }] } }));
  await page.route("**/api/pipeline", route => route.fulfill({ json: { applications: [], inbox: [] } }));
  await page.route("**/api/assistant", route => route.continue({ url: `http://127.0.0.1:${fixture.address().port}/assistant` }));
  await page.route("**/api/status", async route => {
    const data = route.request().postDataJSON(); calls.push(data);
    const attempt = calls.filter(c => c.n === data.n).length;
    if (data.n === "11") {
      await new Promise(resolve => releases.set(attempt, resolve));
      if (attempt === 1) return route.fulfill({ status: 503, headers: { "Retry-After": "5" }, json: { error: "Fictional tracker busy", code: "lock-timeout" } });
      const result = await commit(data.n);
      return route.fulfill({ json: { ok: true, status: "Rejected", changed: result.changed } });
    }
    if (data.n === "12") { await commit(data.n); return route.abort("failed"); } // write landed, acknowledgement lost
    if (data.n === "13") return route.fulfill({ status: 504, json: { error: "change may or may not have been applied" } });
    return route.fulfill({ status: 503, json: { error: "Fictional tracker busy", code: "lock-timeout" } });
  });
  async function until(check, message = "expected UI state") {
    for (let i = 0; i < 240; i++) { if (await check()) return; await new Promise(r => setTimeout(r, 25)); }
    assert.fail(message);
  }
  const input = page.getByRole("textbox", { name: "Nachricht an den Assistenten", exact: true });
  const open = page.getByRole("button", { name: "Fragen Sie den Assistenten", exact: true });
  const summary = n => `#${n} als Rejected markieren?`;
  const card = n => page.getByRole("group", { name: summary(n), exact: true });
  const button = (verb, n) => page.getByRole("button", { name: `${verb}: ${summary(n)}`, exact: true });
  const result = n => card(n).locator('[tabindex="-1"]');
  const feedback = n => page.getByRole("status", { name: `Rückmeldung zur Statusänderung: ${summary(n)}`, exact: true });
  const focused = locator => locator.evaluate(el => el === document.activeElement);
  async function tabTo(target) {
    for (let i = 0; i < 120; i++) { if (await focused(target)) return; await page.keyboard.press("Tab"); }
    assert.fail("control not reachable by keyboard");
  }
  async function propose(n) {
    await tabTo(input); await page.keyboard.type(`Reject fictional application ${n}`); await page.keyboard.press("Enter");
    await until(() => replies.has(`Reject fictional application ${n}`));
    replies.get(`Reject fictional application ${n}`).end(`Review this proposed change.\n<<act:setStatus {"n":"${n}","status":"Rejected"}>>`);
    await button("Bestätigen", n).waitFor();
    await until(() => page.getByRole("button", { name: "Neuer Chat", exact: true }).isEnabled());
  }
  async function snapshot(name) {
    if (!process.env.ASSISTANT_STATUS_ARTIFACT_DIR) return;
    const out = process.env.ASSISTANT_STATUS_ARTIFACT_DIR; await mkdir(out, { recursive: true });
    await writeFile(path.join(out, `${name}.ax.json`), JSON.stringify(await cdp.send("Accessibility.getFullAXTree"), null, 2));
    await writeFile(path.join(out, `${name}.aria.txt`), await page.locator("body").ariaSnapshot());
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  }
  await page.goto(`${origin.origin}/pipeline?tab=ALL`);
  await open.waitFor(); await tabTo(open); await page.keyboard.press("Enter"); await input.waitFor();
  await propose("11"); assert.equal(calls.length, 0);
  await tabTo(button("Bestätigen", "11")); await page.keyboard.press("Enter");
  await until(() => releases.has(1));
  assert.equal(await button("Bestätigen", "11").getAttribute("aria-disabled"), "true");
  await card("11").getByText("Status wird gespeichert …", { exact: true }).waitFor();
  await button("Bestätigen", "11").evaluate(el => { el.click(); el.click(); });
  await button("Abbrechen", "11").evaluate(el => el.click());
  await page.keyboard.press("Enter");
  assert.equal(calls.length, 1); assert.equal((await ledger()).length, 0);
  releases.get(1)();
  await card("11").getByText(/Status nicht gespeichert/).waitFor();
  await until(() => focused(result("11")));
  assert.equal(await feedback("11").innerText(), "", "focused error must not also be live announced");
  const tree = await cdp.send("Accessibility.getFullAXTree");
  assert.ok(tree.nodes.some(n => !n.ignored && n.name?.value?.includes("Fictional tracker busy") && n.properties?.some(p => p.name === "focused" && p.value.value === true)));
  await snapshot("01-busy-retryable");
  await tabTo(button("Erneut versuchen", "11")); await page.keyboard.press("Enter");
  await until(() => releases.has(2));
  assert.equal(replies.size, 1, "retry must not call the model again");
  assert.deepEqual(calls, [{ n: "11", status: "Rejected" }, { n: "11", status: "Rejected" }]);
  releases.get(2)();
  await card("11").getByText("Status gespeichert.", { exact: true }).waitFor();
  await until(() => focused(result("11")));
  assert.equal((await ledger()).length, 1);
  assert.equal((await commit("11")).changed, false);
  assert.equal((await ledger()).length, 1, "repeating the canonical write does not duplicate the ledger");
  await snapshot("02-retry-saved");

  await propose("12"); await tabTo(button("Bestätigen", "12")); await page.keyboard.press("Enter");
  await card("12").getByText(/konnte nicht bestätigt werden/).waitFor();
  await until(() => focused(result("12")));
  assert.equal(await button("Erneut versuchen", "12").count(), 0);
  assert.equal((await ledger()).length, 2, "the disconnected request actually committed");
  assert.equal((await commit("12")).changed, false);
  assert.equal((await ledger()).length, 2);
  await card("12").getByRole("link", { name: `Tracker prüfen für: ${summary("12")}`, exact: true }).waitFor();
  await snapshot("03-acknowledgement-lost");

  await propose("13");
  await button("Bestätigen", "13").evaluate(el => el.click()); // user remains in composer
  await card("13").getByText(/konnte nicht bestätigt werden/).waitFor();
  assert.equal(await focused(input), true);
  await until(async () => (await feedback("13").innerText()).includes("konnte nicht bestätigt werden"));
  assert.equal(await button("Erneut versuchen", "13").count(), 0);
  await page.keyboard.press("Escape"); await open.waitFor(); await page.keyboard.press("Enter"); await input.waitFor();
  assert.deepEqual(await page.getByRole("status", { name: /^Rückmeldung zur Statusänderung:/ }).allTextContents(), ["", "", ""], "reopening does not replay settled announcements");

  await propose("14"); await tabTo(button("Bestätigen", "14")); await page.keyboard.press("Enter");
  await button("Erneut versuchen", "14").waitFor();
  await until(() => saved?.messages.some(m => m.parts.some(p => p.type === "note" && p.text.includes("#14") && p.text.includes("failed"))));
  const beforeReload = calls.length;
  await page.reload(); await open.waitFor(); await tabTo(open); await page.keyboard.press("Enter"); await input.waitFor();
  await page.getByText(/#14 als Rejected markieren\? \(failed/).waitFor();
  await page.getByText(/#12 als Rejected markieren\? \(unconfirmed/).waitFor();
  assert.equal(calls.length, beforeReload);
  assert.equal(await page.getByRole("button", { name: /^(Erneut versuchen|Bestätigen):/ }).count(), 0);
  assert.equal((await ledger()).length, 2);
  await snapshot("04-history-inert");
  assert.deepEqual(unexpected, []);
});
