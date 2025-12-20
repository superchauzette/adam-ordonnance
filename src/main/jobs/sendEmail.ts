import path from "node:path";
import { runPwsh } from "./runPwsh";

type SendEmailArgs = {
  to: string;
  subject: string;
  body: string;
  files?: string[];
  mode: "draft" | "send";
};

export async function sendEmail({
  to,
  subject,
  body,
  files = [],
  mode,
}: SendEmailArgs) {

  const scriptPath = path.join("src", "scripts", "send-mails.ps1")

  const result = await runPwsh(scriptPath, {
    To: to,
    Subject: subject,
    Body: body,
    PayloadFiles: JSON.stringify({ files }),
    Mode: mode,
  });

  return result;
}
