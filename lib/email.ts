import { EMAIL_FROM, SUPPORT_EMAIL } from "./config/domain";

export interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

/** Mengirim email tautan pengaturan ulang kata sandi via Resend REST API. */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresInMinutes,
}: SendPasswordResetEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum dikonfigurasi pada environment server.");
  }

  const safeName = escapeHtml(name.trim() || "Pengguna FloraHub");
  const safeResetUrl = escapeHtml(resetUrl);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);

  const html = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atur Ulang Kata Sandi Akun FloraHub</title>
  </head>
  <body style="margin:0;padding:24px 16px;background-color:#F7F5F0;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1917;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E5E1D8;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="background-color:#112218;padding:28px 32px;color:#FFFFFF;">
          <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#B7D39C;">
            Keamanan Akun · FloraHub
          </p>
          <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#FFFFFF;">
            Atur Ulang Kata Sandi
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
            Halo <strong>${safeName}</strong>,
          </p>
          <p style="margin:0 0 24px 0;font-size:14px;line-height:1.65;color:#4B4843;">
            Kami menerima permintaan untuk mengatur ulang kata sandi akun FloraHub Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
            <tr>
              <td style="border-radius:10px;background-color:#1C4F35;">
                <a href="${safeResetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">
                  Atur Ulang Kata Sandi
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#5E5A53;">
            Tautan ini hanya berlaku selama <strong>${expiresInMinutes} menit</strong> dan hanya dapat digunakan satu kali.
          </p>
          <p style="margin:0 0 8px 0;font-size:12px;color:#5E5A53;">
            Jika tombol di atas tidak berfungsi, salin dan buka tautan berikut di peramban Anda:
          </p>
          <p style="margin:0 0 24px 0;padding:12px;border-radius:8px;background-color:#F7F5F0;border:1px solid #E5E1D8;font-size:12px;line-height:1.5;word-break:break-all;color:#1C4F35;">
            <a href="${safeResetUrl}" target="_blank" rel="noopener noreferrer" style="color:#1C4F35;text-decoration:underline;">${safeResetUrl}</a>
          </p>
          <hr style="border:none;border-top:1px solid #E5E1D8;margin:0 0 18px 0;" />
          <p style="margin:0;font-size:12px;line-height:1.6;color:#6E6A63;">
            Jika Anda tidak pernah meminta pengaturan ulang kata sandi, abaikan email ini. Kata sandi akun Anda tetap aman dan tidak berubah. Butuh bantuan? Hubungi <a href="mailto:${safeSupportEmail}" style="color:#1C4F35;font-weight:600;text-decoration:underline;">${safeSupportEmail}</a>.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Halo ${name.trim() || "Pengguna FloraHub"},`,
    "",
    "Kami menerima permintaan untuk mengatur ulang kata sandi akun FloraHub Anda.",
    `Silakan buka tautan berikut untuk membuat kata sandi baru (berlaku ${expiresInMinutes} menit):`,
    resetUrl,
    "",
    "Jika Anda tidak pernah meminta pengaturan ulang kata sandi, abaikan email ini.",
    `Butuh bantuan? Hubungi ${SUPPORT_EMAIL}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      reply_to: SUPPORT_EMAIL,
      subject: "Atur Ulang Kata Sandi Akun FloraHub",
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Layanan email merespons dengan status HTTP ${response.status}.`);
  }
}
