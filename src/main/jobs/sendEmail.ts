import { spawn } from "node:child_process";
import path from "node:path";
import { app } from "electron";

const isDev = !app.isPackaged;

type SendEmailArgs = {
  to: string;
  subject: string;
  body: string;
  files?: string[];
  mode: "draft" | "send";
};

export function sendEmail({
  to,
  subject,
  body,
  files = [],
  mode,
}: SendEmailArgs) {
  return new Promise<{ success: boolean; message: string; error?: string }>(
    (resolve, reject) => {
      const scriptPath = isDev
        ? path.join(app.getAppPath(), "scripts", "send-mails.ps1")
        : path.join(process.cwd(), "scripts", "send-mails.ps1");

      console.log({ scriptPath });

      // Build the command using a pipe-separated list for files
      // (pipe is safe as it cannot appear in Windows file paths)
      const filesParam = files.length > 0 ? files.join('|') : '';

      const psArgs = [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,

        "--%",
        "-To",
        to,
        "-Subject",
        subject,
        "-Body",
        body,
        "-Mode",
        mode,
      ];

      // Add files parameter if provided
      if (filesParam) {
        psArgs.push("-Files");
        psArgs.push(filesParam);
      }

      console.log({ files });
      console.log({ psArgs });

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
        reject(new Error(`Send email timeout after 60s for ${mode} to ${to}`));
      }, 60_000);

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        clearTimeout(killTimer);

        if (code === 0) {
          resolve({
            success: true,
            message:
              stdout.trim() ||
              `Email ${mode === "send" ? "sent" : "saved as draft"} to ${to}`,
          });
        } else {
          const error = stderr.trim() || stdout.trim() || "Unknown error";
          resolve({
            success: false,
            message: `Failed to ${mode === "send" ? "send" : "save"} email`,
            error: error,
          });
        }
      });

      child.on("error", (err) => {
        clearTimeout(killTimer);
        resolve({
          success: false,
          message: "Failed to spawn PowerShell",
          error: err.message,
        });
      });
    }
  );
}
