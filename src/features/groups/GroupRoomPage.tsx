import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Info, Lock, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { Avatar } from '@/components/ui/avatar'
import {
  useMarkRoomRead,
  useRoom,
  useRoomMembership,
  useRoomMessages,
  useSendRoomMessage,
} from '@/hooks/useGroups'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { GroupInfoPanel } from '@/features/groups/GroupInfoPanel'
import { supabase } from '@/lib/supabase'

export function GroupRoomPage() {
  const { t } = useTranslation()
  const { groupId } = useParams<{ groupId: string }>()
  const profile = useAuthStore((state) => state.profile)
  const myUid = profile?.id

  const roomQuery = useRoom(groupId, myUid)
  const membership = useRoomMembership(groupId, myUid)
  const messagesQuery = useRoomMessages(groupId)
  const sendMessage = useSendRoomMessage(groupId)
  const markRead = useMarkRoomRead()

  const [draft, setDraft] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = messagesQuery.data?.pages.flat() ?? []

  // Realtime: pesan baru di room ini.
  useEffect(() => {
    if (!groupId) return
    const channel = supabase
      .channel(`group-room-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${groupId}` },
        () => {
          void messagesQuery.refetch()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  // Tandai sudah dibaca saat anggota membuka room.
  useEffect(() => {
    if (!groupId || membership.data !== true) return
    markRead.mutate(groupId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, membership.data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!groupId || !profile || !draft.trim()) return
    if (draft.trim().length > 2000) {
      toast.error(t('groups.tooLong'))
      return
    }
    sendMessage.mutate(
      {
        roomId: groupId,
        senderId: profile.id,
        senderName: profile.nickname ?? 'Kamu',
        senderGender: profile.gender,
        text: draft,
      },
      {
        onSuccess: () => setDraft(''),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t('groups.joinFailed')),
      },
    )
  }

  const room = roomQuery.data

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <Link to="/groups" className="text-muted transition hover:text-text">
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel text-[17px]">
          {room?.icon || '💬'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold text-text">
              {room?.name ?? t('groups.title')}
            </span>
            {room?.hasPassword ? <Lock className="h-3 w-3 text-muted-2" /> : null}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Users className="h-3 w-3" />
            {room?.country ?? '—'}
          </div>
        </div>
        {groupId ? (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label={t('groups.info')}
            title={t('groups.info')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text"
          >
            <Info className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </header>

      {groupId ? (
        <GroupInfoPanel
          open={infoOpen}
          onOpenChange={setInfoOpen}
          roomId={groupId}
          myUid={myUid}
        />
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {membership.isLoading || messagesQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : membership.data === false ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-surface px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-text">{t('groups.notMember')}</p>
            <Link to="/groups" className="mt-3 inline-block text-[12px] text-primary">
              {t('groups.back')}
            </Link>
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-muted">{t('groups.emptyHint')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {messages.map((message) => {
              const isMine = message.senderId === myUid
              return (
                <li
                  key={message.id}
                  className={cn('flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}
                >
                  {!isMine ? (
                    <Avatar
                      name={message.senderName}
                      size={28}
                      gender={message.senderGender}
                    />
                  ) : null}
                  <div className={cn('max-w-[78%]', isMine ? 'items-end' : 'items-start')}>
                    {!isMine ? (
                      <div className="mb-0.5 text-[10.5px] text-muted-2">
                        {message.senderName}
                      </div>
                    ) : null}
                    {message.repliedToText ? (
                      <div className="mb-1 rounded-lg border-l-2 border-primary/50 bg-panel px-2 py-1 text-[10.5px] text-muted">
                        {message.repliedToSenderName}: {message.repliedToText}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed',
                        isMine
                          ? 'bg-primary text-white'
                          : 'border border-border bg-surface text-text',
                      )}
                    >
                      {message.isDeleted ? (
                        <span className="italic opacity-70">{t('groups.deleted')}</span>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {membership.data === true ? (
        <form
          onSubmit={submit}
          className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-surface px-3 py-2.5 sm:px-5"
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={t('groups.messagePlaceholder')}
            aria-label={t('groups.messagePlaceholder')}
            rows={1}
            maxLength={2000}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-border bg-bg px-3.5 py-2.5 text-[13.5px] text-text outline-none transition placeholder:text-muted-2 focus:border-primary/70"
          />
          <Button type="submit" disabled={!draft.trim() || sendMessage.isPending}>
            {sendMessage.isPending ? <Spinner /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">{t('groups.send')}</span>
          </Button>
        </form>
      ) : null}
    </div>
  )
}
