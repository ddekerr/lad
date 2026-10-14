/**
 * Надсилання листів. Якщо SMTP не налаштовано (локальна розробка), код
 * виводиться в консоль сервера, а лист не йде.
 */
export async function sendLoginCodeMail(email: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP_HOST is not configured');
    }
    console.log(`[mail:dev] Login code for ${email}: ${code}`);
    return;
  }

  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });

  await transport.sendMail({
    from: process.env.MAIL_FROM ?? 'Лад <no-reply@localhost>',
    to: email,
    subject: `Лад: ${code} is your sign-in code / ${code} ваш код для входу`,
    text:
      `Your sign-in code: ${code}\nIt works for 10 minutes. If you did not request it, ignore this email.\n\n` +
      `Ваш код для входу: ${code}\nВін діє 10 хвилин. Якщо ви його не запитували, проігноруйте лист.`,
  });
}
