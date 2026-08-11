import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { AdminGate } from '@/components/admin/AdminGate';
import { Dashboard } from '@/components/admin/Dashboard';
import { ADMIN_COOKIE, isValidSession } from '@/lib/admin-auth';
import { listBookings } from '@/lib/booking-service';
import { getRatePeriods, getSettings } from '@/lib/data';
import { env, isDatabaseConfigured, isTwoFactorConfigured } from '@/lib/env';
import { getServerStrings } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerStrings();

  return {
    title: t.admin.title,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function AdminPage() {
  const { t } = await getServerStrings();
  const cookieStore = await cookies();
  const authorized = await isValidSession(cookieStore.get(ADMIN_COOKIE)?.value);

  if (!authorized) {
    return (
      <AdminGate
        configured={Boolean(env.admin.accessCode && env.admin.sessionSecret)}
        twoFactor={isTwoFactorConfigured}
      />
    );
  }

  if (!isDatabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24">
        <h1 className="font-display text-3xl text-forest-900">{t.admin.title}</h1>
        <p className="mt-4 rounded-xl border border-warn-600/25 bg-warn-600/5 px-5 py-4 text-sm leading-relaxed text-warn-600">
          {t.admin.databaseNotConfigured}
        </p>
      </main>
    );
  }

  const [bookings, periods, settings] = await Promise.all([
    listBookings(),
    getRatePeriods(),
    getSettings(),
  ]);

  return <Dashboard bookings={bookings} periods={periods} settings={settings} />;
}
