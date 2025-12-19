import { spawn } from "child_process";

export function runPwsh(scriptPath: string, argsObj: any) {
  return new Promise((resolve, reject) => {
    const args = Object.entries(argsObj).flatMap(([k, v]) => [
      `-${k}`,
      String(v),
    ]);

    const ps = spawn(
      "powershell.exe", // ou pwsh
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
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
        return reject(
          new Error(`PowerShell exit ${code}\n${stderr || stdout}`)
        );
      }

      // Ici on s’attend à du JSON
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ raw: stdout.trim() });
      }
    });
  });
}
