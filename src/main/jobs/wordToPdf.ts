import { spawn } from "node:child_process";
import path from "node:path";
import { app } from "electron";

type WordToPdfArgs = {
  inputDocx: string;
  outputPdf: string;
  timeoutMs?: number;
};

export function wordToPdf({
  inputDocx,
  outputPdf,
  timeoutMs = 90_000,
}: WordToPdfArgs) {
  return new Promise<string>((resolve, reject) => {
    const scriptPath = path.join(
      app.getAppPath(),
      "scripts",
      "word-to-pdf.ps1"
    );

    const psArgs = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-InputDocx",
      inputDocx,
      "-OutputPdf",
      outputPdf,
      "-TimeoutSeconds",
      String(Math.ceil(timeoutMs / 1000)),
      // "-KillOrphanWinword" // décommente si tu veux l’activer
    ];

    const child = spawn("powershell.exe", psArgs, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const killTimer = setTimeout(() => {
      try {
        child.kill();
      } catch {}
      reject(new Error(`Word->PDF timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(killTimer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (code === 0) {
        const pdfPath = stdout.trim();
        if (!pdfPath)
          return reject(new Error("No PDF path returned by script"));
        resolve(pdfPath);
      } else {
        reject(
          new Error(`word-to-pdf failed (code=${code}). ${stderr || stdout}`)
        );
      }
    });
  });
}
