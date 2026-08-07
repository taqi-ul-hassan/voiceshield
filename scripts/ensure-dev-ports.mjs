#!/usr/bin/env node
/**
 * VoiceShield dev-server port cleanup (runs before `npm run dev` starts).
 *
 * `npm run dev` runs Vite (port 5173) and the BFF proxy (port 8787). When a
 * previous dev session is not shut down cleanly, its processes can still hold
 * those ports. A fresh `npm run dev` then crashes: the proxy throws an
 * unhandled `EADDRINUSE`, and `concurrently -k` kills Vite too — which shows
 * up in the preview as "Dev server failed with exit code -1".
 *
 * This script best-effort kills any *stale VoiceShield dev-server processes*
 * from an earlier session, then waits (bounded) for the ports to free up so
 * the new servers bind cleanly.
 *
 * Safety: it only ever matches processes from THIS project (a path under
 * /app running `vite --host` or `server/proxy.ts`). Unrelated processes are
 * never touched. Set DRY_RUN=1 to log what would be killed without killing.
 */
import { execFileSync } from "node:child_process";
import net from "node:net";

const DEFAULT_PORTS = [5173, 8787];
const RE_PROJECT = /\/app\//;
const RE_VITE = /vite --host/;
const RE_PROXY = /server\/proxy\.ts/;
const DRY_RUN = process.env.DRY_RUN === "1";
const WAIT_MS = 5000;

function listProcesses() {
  // `ps -eo pid=,args=` gives clean "pid args" lines on Linux/alpine.
  const out = execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" });
  const lines = out.split("\n").filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\s+(.*)$/s);
    if (m) parsed.push({ pid: Number(m[1]), args: m[2] });
  }
  return parsed;
}

function isPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stale = listProcesses().filter(
  (p) => RE_PROJECT.test(p.args) && (RE_VITE.test(p.args) || RE_PROXY.test(p.args))
);

if (stale.length === 0) {
  console.log("[dev] Ports are clean — no stale dev-server processes found.");
} else {
  console.log(
    `[dev] Found ${stale.length} stale dev-server process(es): ${stale
      .map((p) => `${p.pid} (${p.args.split(" ").slice(-2).join(" ")})`)
      .join(", ")}`
  );
  if (DRY_RUN) {
    console.log("[dev] DRY_RUN=1 — skipping kill. Would have terminated the process(es) above.");
  } else {
    for (const proc of stale) {
      try {
        process.kill(proc.pid, "SIGTERM");
        console.log(`[dev] Terminated pid ${proc.pid}.`);
      } catch (err) {
        if (err.code !== "ESRCH") console.warn(`[dev] Could not signal pid ${proc.pid}: ${err.message}`);
      }
    }
  }
}

// Wait (bounded) for the ports to free up so the fresh servers bind cleanly.
if (!DRY_RUN) {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    const results = await Promise.all(DEFAULT_PORTS.map(async (port) => [port, await isPortBusy(port)]));
    const busy = results.filter(([, isBusy]) => isBusy).map(([port]) => port);
    if (busy.length === 0) {
      console.log("[dev] Ports 5173/8787 are free — starting dev servers.");
      break;
    }
    await sleep(250);
  }
}

process.exit(0);
