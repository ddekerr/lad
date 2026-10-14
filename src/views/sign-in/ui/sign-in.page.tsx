import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/features/sign-in';
import { getCurrentUser } from '@/server/auth/session';
import { getDictionary } from '@/server/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.title };
}

type Props = { searchParams: Promise<{ error?: string }> };

/** Вхід / реєстрація: Google або email → код. Для вже авторизованого веде на головну. */
export default async function SignInPage({ searchParams }: Props) {
  const [user, { t }, { error }] = await Promise.all([getCurrentUser(), getDictionary(), searchParams]);
  if (user) redirect('/');

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 py-4 sm:py-10">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.auth.title}</h1>
      <p className="text-muted">{t.auth.intro}</p>
      <SignInForm t={t} initialError={error} />
    </main>
  );
}
