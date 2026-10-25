import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Mail, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import {
  useCancelFriendRequest,
  useFriendRequests,
  useRespondFriendRequest,
  useSubmitContactMessage,
} from '@/hooks/useSocial'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * Halaman Kontak — paritas `contact_screen.dart` (form kirim pesan) dan
 * `friend_requests_screen.dart` (inbox/outbox permintaan teman).
 */
export function ContactPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [tab, setTab] = useState<'message' | 'requests'>('message')

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-muted transition hover:text-text"
            aria-label={t('groups.back')}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4.5 w-4.5" />
          </span>
          <h1 className="flex-1 font-display text-[15px] font-semibold text-text">
            {t('kontak.title')}
          </h1>
        </div>
        <div className="flex gap-1 px-4">
          {(
            [
              ['message', t('kontak.message')],
              ['requests', t('friends.title')],
            ] as Array<['message' | 'requests', string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'relative px-3 py-2 text-[12.5px] font-medium transition',
                tab === key ? 'text-primary' : 'text-muted hover:text-text',
              )}
            >
              {label}
              {tab === key ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'message' ? (
          <ContactForm userId={profile?.id ?? null} defaultName={profile?.nickname ?? ''} />
        ) : (
          <FriendRequests />
        )}
      </div>
    </div>
  )
}

function ContactForm({ userId, defaultName }: { userId: string | null; defaultName: string }) {
  const { t } = useTranslation()
  const send = useSubmitContactMessage()
  const [name, setName] = useState(defaultName)
  const [message, setMessage] = useState('')

  return (
    <form
      className="mx-auto flex max-w-md flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        send.mutate(
          { userId, name, message },
          {
            onSuccess: () => {
              setMessage('')
              toast.success(t('kontak.sent'))
            },
            onError: (error) =>
              toast.error(
                error instanceof Error && error.message
                  ? errorMessage(error)
                  : t('kontak.failed'),
              ),
          },
        )
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">{t('kontak.name')}</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          disabled={send.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{t('kontak.message')}</Label>
        <Textarea
          id="contact-message"
          rows={6}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('kontak.hint')}
          disabled={send.isPending}
        />
      </div>
      <Button type="submit" disabled={send.isPending || !message.trim()}>
        {send.isPending ? <Spinner /> : <Mail className="h-4 w-4" />}
        {t('kontak.send')}
      </Button>
    </form>
  )
}

function FriendRequests() {
  const { t } = useTranslation()
  const [side, setSide] = useState<'inbox' | 'outbox'>('inbox')
  const requests = useFriendRequests(side)
  const respond = useRespondFriendRequest()
  const cancel = useCancelFriendRequest()

  const rows = requests.data ?? []

  return (
    <div className="mx-auto max-w-md">
      <div className="flex gap-1.5">
        {(['inbox', 'outbox'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSide(value)}
            aria-pressed={side === value}
            className={cn(
              'flex-1 rounded-xl border px-2 py-1.5 text-[11.5px] transition',
              side === value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-panel text-muted hover:border-primary/40',
            )}
          >
            {value === 'inbox' ? t('friends.inbox') : t('friends.outbox')}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {requests.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">{t('friends.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((request) => (
              <li
                key={request.id}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2"
              >
                <Avatar name={request.nickname} size={32} gender={request.gender} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-text">{request.nickname}</div>
                  <div className="text-[10.5px] text-muted-2">
                    {request.status === 'pending'
                      ? t('friends.pending')
                      : request.status}
                  </div>
                </div>
                {request.status === 'pending' && side === 'inbox' ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      disabled={respond.isPending}
                      onClick={() =>
                        respond.mutate(
                          { id: request.id, accept: true },
                          {
                            onSuccess: () => toast.success(t('friends.accepted')),
                            onError: (error) => toast.error(errorMessage(error)),
                          },
                        )
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={respond.isPending}
                      onClick={() =>
                        respond.mutate(
                          { id: request.id, accept: false },
                          {
                            onSuccess: () => toast.success(t('friends.rejected')),
                            onError: (error) => toast.error(errorMessage(error)),
                          },
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : request.status === 'pending' && side === 'outbox' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(request.id, {
                        onSuccess: () => toast.success(t('friends.cancelled')),
                        onError: (error) => toast.error(errorMessage(error)),
                      })
                    }
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {t('friends.cancel')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
