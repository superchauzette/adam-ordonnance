import { spawn } from "child_process";

export function runPwsh(scriptPath: string, argsObj: any) {
  return new Promise((resolve, reject) => {
    const args = Object.entries(argsObj).flatMap(([k, v]) => [
      `-${k}`,
      String(v),
    ]);

    const ps = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,

        // 🔥 IMPORTANT: stop parsing, tout ce qui suit est passé littéralement
        "--%",

        ...args,
      ],
      { windowsHide: true }
    );

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    ps.stderr.on("data", (d) => (stderr += d.toString("utf8")));

    ps.on("error", reject);

    ps.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`PowerShell exit ${code}\n${stderr || stdout}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ raw: stdout.trim() });
      }
    });
  });
}
