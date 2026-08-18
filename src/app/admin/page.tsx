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

/**
 * Administracija nosi ISTU kožu kao sajt.
 *
 * `data-skin="onyx"` i `plus` su ono što na `(sajt)/[locale]/layout.tsx`
 * odlučuje boje, pismo i oblike — sve ostalo ih čita kroz imena poslova. Bez
 * ovog omotača administracija je padala na zadane vrijednosti osnovne palete:
 * ulaz u zelenom, nadzorna ploča u pijesku, a kuća oko njih crna s mesingom.
 *
 * Namjerno bez `SmoothScroll`: inercija skrola je za razgledanje fotografija,
 * a ovdje se radi.
 */
function Koza({ children }: { children: React.ReactNode }) {
  return (
    <div data-skin="onyx" className="plus min-h-dvh">
      {children}
    </div>
  );
}

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
      <Koza>
        <AdminGate
          configured={Boolean(env.admin.accessCode && env.admin.sessionSecret)}
          twoFactor={isTwoFactorConfigured}
        />
      </Koza>
    );
  }

  if (!isDatabaseConfigured) {
    return (
      <Koza>
        <main className="plus-surface min-h-dvh">
          <div className="mx-auto max-w-2xl px-5 py-24">
            <h1 className="plus-ink text-3xl">{t.admin.title}</h1>
            <p className="plus-warn mt-6 px-5 py-4 text-sm leading-relaxed">
              {t.admin.databaseNotConfigured}
            </p>
          </div>
        </main>
      </Koza>
    );
  }

  const [bookings, periods, settings] = await Promise.all([
    listBookings(),
    getRatePeriods(),
    getSettings(),
  ]);

  return (
    <Koza>
      <Dashboard bookings={bookings} periods={periods} settings={settings} />
    </Koza>
  );
}
