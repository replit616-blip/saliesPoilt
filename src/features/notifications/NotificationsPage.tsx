import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useNotificationActions } from '@/features/notifications/useNotifications';
import type { AppNotification } from '@/features/roster/rosterApi';
import { usePreferences } from '@/shared/stores/preferences';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

function NotificationRow({ item }: { item: AppNotification }) {
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const navigate = useNavigate();
  const { markRead, remove } = useNotificationActions();
  const unread = item.read_at === null;

  const open = () => {
    if (unread) markRead.mutate(item.id);
    if (item.link_path) navigate(item.link_path);
  };

  return (
    <li className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${unread ? 'bg-accent-50/60' : ''}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${unread ? 'bg-accent-600' : 'bg-transparent'}`}
        />
        <div className="min-w-0">
          <p className={`text-sm text-primary-900 ${unread ? 'font-semibold' : 'font-medium'}`}>
            {t(`notifications.types.${item.type}`, { defaultValue: item.title })}
          </p>
          {item.title && item.title !== t(`notifications.types.${item.type}`, { defaultValue: item.title }) && (
            <p className="truncate text-sm text-neutral-700">{item.title}</p>
          )}
          {item.body && <p className="truncate text-xs text-neutral-600">{item.body}</p>}
          <p className="mt-1 text-xs text-neutral-500">{new Date(item.created_at).toLocaleString(language)}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {item.link_path && (
          <button
            type="button"
            onClick={open}
            className="min-h-11 rounded-lg bg-primary-900 px-4 text-sm font-medium text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            {t('notifications.open')}
          </button>
        )}
        {unread && (
          <button
            type="button"
            onClick={() => markRead.mutate(item.id)}
            className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-primary-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            {t('notifications.markRead')}
          </button>
        )}
        <button
          type="button"
          onClick={() => remove.mutate(item.id)}
          className="min-h-11 rounded-lg px-4 text-sm font-medium text-error-700 hover:bg-error-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {t('notifications.delete')}
        </button>
      </div>
    </li>
  );
}

export function NotificationsPage() {
  const { t } = useTranslation();
  const query = useNotifications();
  const { markAllRead } = useNotificationActions();

  const items = query.data?.notifications;
  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <>
      <PageHeader
        title={t('nav.notifications')}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-primary-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              {t('notifications.markAllRead')}
            </button>
          ) : undefined
        }
      />
      <div className="mt-6">
        {query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : items === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-neutral-600">{t('notifications.empty')}</Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-neutral-200">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
