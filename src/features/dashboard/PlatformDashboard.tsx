import type { LucideIcon } from 'lucide-react';
import { Building2, ClipboardCheck, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchPlatformStats } from '@/features/roster/rosterApi';
import { useFormatters } from '@/shared/i18n/useFormatters';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

function StatCard({ label, value, icon: Icon }: { label: string; value: number | undefined; icon: LucideIcon }) {
  const f = useFormatters();
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-neutral-600">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1 h-7 w-20" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums text-primary-900">{f.number(value)}</p>
        )}
      </div>
    </Card>
  );
}

export function PlatformDashboard() {
  const { t } = useTranslation();
  const stats = useQuery({ queryKey: ['platform', 'stats'], queryFn: fetchPlatformStats });

  return (
    <>
      <PageHeader title={t('dashboard.platformTitle')} />
      {stats.isError ? (
        <div className="mt-6">
          <ErrorState onRetry={() => void stats.refetch()} />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t('dashboard.platformCompanies')} value={stats.data?.companies} icon={Building2} />
          <StatCard label={t('dashboard.platformCompanyAdmins')} value={stats.data?.companyAdmins} icon={ShieldCheck} />
          <StatCard label={t('dashboard.platformEmployees')} value={stats.data?.employees} icon={Users} />
          <StatCard label={t('dashboard.platformPendingRequests')} value={stats.data?.pendingPasswordRequests} icon={KeyRound} />
          <StatCard label={t('dashboard.platformRecentApproved')} value={stats.data?.recentlyApprovedPasswordRequests} icon={ClipboardCheck} />
        </div>
      )}
    </>
  );
}
