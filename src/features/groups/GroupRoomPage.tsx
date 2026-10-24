import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ImagePlus,
  Info,
  Lock,
  MapPin,
  Mic,
  Paperclip,
  Send,
  Users,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import {
  useMarkRoomRead,
  useRoom,
  useRoomMembership,
  useRoomMessages,
  useSendRoomMessage,
} from '@/hooks/useGroups'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import type { RoomMessage } from '@/lib/api/groups'
import { GroupInfoPanel } from '@/features/groups/GroupInfoPanel'
import { MessageBubble } from '@/features/chat/MessageBubble'
import { useGroupMediaSend } from '@/hooks/useGroupMediaSend'
import type { Message } from '@/lib/types'
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
  const media = useGroupMediaSend({
    roomId: groupId,
    myUid,
    senderName: profile?.nickname ?? 'Kamu',
    senderGender: profile?.gender ?? null,
    onSent: () => {
      void messagesQuery.refetch()
    },
  })

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
          <div className="flex flex-col gap-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={toMessage(message, groupId ?? '')}
                isMine={message.senderId === myUid}
                myUid={myUid ?? ''}
                onReply={() => {}}
                onReact={() => {}}
                onRetry={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                onOpenImage={(src) => window.open(src, '_blank', 'noopener')}
                onMediaLoad={() => {}}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {membership.data === true ? (
        <form
          onSubmit={submit}
          className="sticky bottom-0 flex items-end gap-1.5 border-t border-border bg-surface px-3 py-2.5 sm:px-5"
        >
          <input
            ref={media.imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void media.handleImage(event)}
          />
          <input
            ref={media.docRef}
            type="file"
            className="hidden"
            onChange={(event) => void media.handleDoc(event)}
          />
          <input
            ref={media.videoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => void media.handleVideo(event)}
          />
          <button
            type="button"
            onClick={() => media.imageRef.current?.click()}
            disabled={media.imageBusy}
            aria-label={t('chat.photo')}
            title={t('chat.photo')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text disabled:opacity-50"
          >
            {media.imageBusy ? <Spinner /> : <ImagePlus className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => media.docRef.current?.click()}
            disabled={media.mediaBusy}
            aria-label={t('chat.file')}
            title={t('chat.file')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text disabled:opacity-50"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => media.videoRef.current?.click()}
            disabled={media.mediaBusy}
            aria-label={t('chat.video')}
            title={t('chat.video')}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text disabled:opacity-50 sm:flex"
          >
            <Video className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => media.sendLocation()}
            aria-label={t('chat.location')}
            title={t('chat.location')}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text sm:flex"
          >
            <MapPin className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={media.toggleRecording}
            aria-label={t('chat.voice')}
            title={t('chat.voice')}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-50',
              media.recording
                ? 'bg-danger/10 text-danger'
                : 'text-muted hover:bg-panel hover:text-text',
            )}
          >
            {media.recording ? (
              <span className="text-[10px] font-medium">{media.recordSecs}s</span>
            ) : (
              <Mic className="h-[18px] w-[18px]" />
            )}
          </button>
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

/** Petakan pesan room → bentuk `Message` agar bisa dirender `MessageBubble`. */
function toMessage(message: RoomMessage, chatId: string): Message {
  return {
    id: message.id,
    chat_id: chatId,
    sender_id: message.senderId,
    sender_name: message.senderName,
    sender_gender: message.senderGender,
    text: message.text,
    type: message.type,
    image_path: message.imagePath,
    voice_path: message.voicePath,
    video_poster: message.videoPoster,
    duration_ms: message.durationMs,
    poll: message.poll,
    contact: message.contact,
    replied_to_id: message.repliedToId,
    replied_to_text: message.repliedToText,
    replied_to_sender_name: message.repliedToSenderName,
    is_deleted: message.isDeleted,
    edited: message.edited,
    created_at: message.createdAt ?? new Date().toISOString(),
  }
}
