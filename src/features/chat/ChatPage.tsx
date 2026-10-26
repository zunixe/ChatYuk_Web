import { useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Eye,
  ChevronDown,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  MoreVertical,
  Pin,
  Bell,
  BellOff,
  Paperclip,
  SendHorizontal,
  ShieldOff,
  Video,
  Smile,
  Square,
  X,
} from 'lucide-react'
import { Fragment, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner, TypingDots } from '@/components/ui/feedback'
import { MessageBubble } from '@/features/chat/MessageBubble'
import { StickerPicker } from '@/features/chat/StickerPicker'
import { ForwardDialog } from '@/features/chat/ForwardDialog'
import { AlbumGrid } from '@/features/chat/AlbumGrid'
import { useStarredIds, useToggleStar } from '@/hooks/useStars'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { ProfileDrawer } from '@/features/chat/ProfileDrawer'
import {
  useAvatars,
  useChat,
  useMessages,
  useOtherProfile,
  useReactions,
} from '@/hooks/useChatData'
import { useBlockedSet, useSetBlocked } from '@/hooks/useBlocks'
import { useChatComposer } from '@/hooks/useChatComposer'
import { useChatScroll } from '@/hooks/useChatScroll'
import { useMediaSend } from '@/hooks/useMediaSend'
import { useOutboxFlush } from '@/hooks/useOutboxFlush'
import { useChatRoomRealtime, useTyping } from '@/hooks/useChatRealtime'
import {
  chatDisplayName,
  chatIsMuted,
  chatIsPinned,
  chatReadAt,
  otherParticipant,
  chatIsArchived,
  setChatArchived,
  setChatMuted,
  setChatPinned,
} from '@/lib/api/chats'
import {
  deletePrivateMessage,
  undeletePrivateMessage,
  editPrivateMessage,
  sendPrivateMessage,
  toggleReaction,
} from '@/lib/api/messages'
import { errorMessage } from '@/lib/errors'
import { resolveAvatar } from '@/lib/media'
import { replaceOptimisticMessage, upsertMessageInCache } from '@/lib/query-cache'
import { effectiveStatus } from '@/lib/presence'
import { formatLastSeen, sameDay } from '@/lib/time'
import { cn, messagePreview } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import type { Message } from '@/lib/types'

const COMPOSER_EMOJIS = ['😀', '😂', '😊', '😍', '😎', '😢', '😡', '👍', '🙏', '❤️', '🔥', '🎉']

function senderNameOf(message: Message): string {
  return message.sender_name?.trim() || 'Pengguna'
}

export function ChatPage() {
  const { t } = useTranslation()
  const { chatId } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const authProfile = useAuthStore((state) => state.profile)
  const myUid = authProfile?.id

  const chatQuery = useChat(chatId)
  const chat = chatQuery.data ?? null
  const otherUid = chat && myUid ? otherParticipant(chat, myUid) : undefined
  const otherProfileQuery = useOtherProfile(otherUid)
  const otherProfile = otherProfileQuery.data ?? null
  const avatarsQuery = useAvatars(otherUid ? [otherUid] : [])

  const { messages, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMessages(chatId)
  const reactionsQuery = useReactions(chatId)
  const { connected } = useChatRoomRealtime(chatId, myUid)
  const { typingUsers, sendTyping, stopTyping } = useTyping(chatId, myUid)
  const blockedSet = useBlockedSet(myUid)
  const setBlocked = useSetBlocked(myUid)
  const otherBlocked = Boolean(otherUid && blockedSet.has(otherUid))

  const composer = useChatComposer({
    chatId,
    myUid,
    senderName: authProfile?.nickname ?? 'Pengguna',
    senderGender: authProfile?.gender ?? '',
    otherBlocked,
    onTyping: sendTyping,
    onStopTyping: stopTyping,
    onSent: () => scroll.scrollToBottom('smooth'),
    collectMentions: () => mention.mentionsInText(),
  })
  const mentionCandidates = useMemo<Array<{ uid: string; name: string }>>(() => {
    if (!chat || !myUid) return []
    return chat.participants
      .filter((uid) => uid !== myUid)
      .map((uid) => ({
        uid,
        name: chat.participant_names?.[uid]?.trim() || 'Pengguna',
      }))
  }, [chat, myUid])
  const mention = useMentionAutocomplete({
    text: composer.text,
    setText: composer.setText,
    candidates: mentionCandidates,
    textareaRef: composer.textareaRef,
  })

  const { text, replyTo, setReplyTo, textareaRef, handleTextChange, sendTextMessage, handleKeyDown } =
    composer

  const scroll = useChatScroll({
    chatId,
    messages,
    myUid,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: () => void fetchNextPage(),
    isTyping: typingUsers.length > 0,
  })
  const { scrollRef, stickRef, showJump, scrollToBottom, handleScroll, loadOlder } = scroll

  const outbox = useOutboxFlush(myUid)
  const pinned = Boolean(chat && myUid && chatIsPinned(chat, myUid))
  const archived = Boolean(chat && myUid && chatIsArchived(chat, myUid))
  const muted = Boolean(chat && myUid && chatIsMuted(chat, myUid))

  async function togglePin() {
    if (!chatId || !myUid) return
    try {
      await setChatPinned(chatId, myUid, !pinned)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      void queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      toast.success(pinned ? 'Pin dilepas.' : 'Chat disematkan.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function toggleArchive() {
    if (!chatId || !myUid) return
    const next = !archived
    try {
      await setChatArchived(chatId, next)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      toast.success(next ? t('chats.archivedToast') : t('chats.unarchivedToast'))
      if (next) navigate('/chats')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function toggleMute() {
    if (!chatId || !myUid) return
    try {
      await setChatMuted(chatId, myUid, !muted)
      void queryClient.invalidateQueries({ queryKey: ['chats', myUid] })
      void queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      toast.success(muted ? 'Notifikasi dibunyikan.' : 'Chat dibisukan.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const media = useMediaSend({
    chatId,
    myUid,
    senderName: authProfile?.nickname ?? 'Pengguna',
    senderGender: authProfile?.gender ?? '',
    otherBlocked,
    replyTo,
    clearReply: () => setReplyTo(null),
    onSent: () => scroll.scrollToBottom('smooth'),
  })
  const {
    fileRef,
    docRef,
    videoRef,
    imageBusy,
    mediaBusy,
    recording,
    recordSecs,
    handleImageFile,
    handleDocFile,
    sendSticker,
    handleVideoFile,
    sendVideoOnce,
    toggleRecording,
    sendLocation,
    startLiveLocation,
  } = media

  const [profileOpen, setProfileOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null)
  const [liveOpen, setLiveOpen] = useState(false)
  const onceRef = useRef<HTMLInputElement>(null)
  const starredIds = useStarredIds(myUid, 'private', chatId)
  const toggleStarMutation = useToggleStar(myUid, 'private', chatId)
  const [attachOpen, setAttachOpen] = useState(false)
  const retryingRef = useRef<Set<string>>(new Set())

  const otherName =
    otherProfile?.nickname ||
    (chat && myUid ? chatDisplayName(chat, myUid) : 'Pengguna ChatYuk')
  const otherAvatar = resolveAvatar(otherProfile?.avatar || avatarsQuery.data?.[otherUid ?? ''])
  const otherLastReadAt = chat && otherUid ? chatReadAt(chat, otherUid) : null
  const isTyping = typingUsers.length > 0
  const otherStatus = effectiveStatus(otherProfile?.status, otherProfile?.last_seen)

  const statusText = isTyping
    ? 'sedang mengetik…'
    : otherStatus === 'online'
      ? 'online'
      : otherStatus === 'idle'
        ? 'sedang tidak aktif'
        : otherProfile?.last_seen
          ? formatLastSeen(otherProfile.last_seen)
          : 'offline'

  async function handleReact(message: Message, emoji: string) {
    if (!chatId || !myUid) return
    if (message.id < 0 || message.client_status) {
      toast.info('Tunggu pesan selesai terkirim.')
      return
    }
    try {
      await toggleReaction(chatId, message.id, myUid, emoji)
      await queryClient.invalidateQueries({ queryKey: ['reactions', chatId] })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleRetry(message: Message) {
    if (!chatId || !myUid) return
    if (!message.temp_id) return
    if (retryingRef.current.has(message.temp_id)) return

    // Media lokal (blob:) tidak bisa dikirim ulang — objeknya sudah dibuang.
    if (message.image_path?.startsWith('blob:')) {
      toast.error('Media perlu dipilih ulang untuk dikirim.')
      return
    }

    retryingRef.current.add(message.temp_id)
    try {
      const server = await sendPrivateMessage({
        chatId,
        senderId: myUid,
        senderName: message.sender_name ?? authProfile?.nickname ?? 'Pengguna',
        senderGender: message.sender_gender ?? '',
        text: message.text ?? '',
        type: message.type,
        // Kirim ULANG seluruh field media, bukan hanya imagePath:
        // voice memakai voice_path, video butuh poster, file butuh ukuran.
        imagePath: message.image_path ?? undefined,
        voicePath: message.voice_path ?? undefined,
        videoPoster: message.video_poster ?? undefined,
        durationMs: message.duration_ms ?? undefined,
        repliedToId: message.replied_to_id ?? null,
        repliedToText: message.replied_to_text ?? null,
        repliedToSenderName: message.replied_to_sender_name ?? null,
      })
      replaceOptimisticMessage(queryClient, chatId, message.temp_id, server)
      toast.success('Pesan terkirim.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      retryingRef.current.delete(message.temp_id)
    }
  }

  function handleReply(message: Message) {
    setReplyTo(message)
    textareaRef.current?.focus()
  }

  async function handleEdit(message: Message) {
    if (!chatId) return
    const next = window.prompt('Edit pesan:', message.text ?? '')
    if (next == null) return
    const clean = next.trim()
    if (!clean || clean === (message.text ?? '').trim()) return
    try {
      await editPrivateMessage(message.id, clean)
      upsertMessageInCache(queryClient, chatId, { ...message, text: clean, edited: true })
      toast.success('Pesan diperbarui.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleDelete(message: Message) {
    if (!chatId) return
    if (!window.confirm('Hapus pesan ini untuk semua orang?')) return
    try {
      await deletePrivateMessage(message.id)
      upsertMessageInCache(queryClient, chatId, { ...message, is_deleted: true, text: '' })
      // UNDO (paritas Android): kembalikan is_deleted=false selama toast tampil.
      toast.success('Pesan dihapus.', {
        action: {
          label: t('chat.undo'),
          onClick: () => {
            void undeletePrivateMessage(message.id)
              .then(() => {
                upsertMessageInCache(queryClient, chatId, { ...message, is_deleted: false })
                toast.success(t('chat.undoDone'))
              })
              .catch((error) => toast.error(errorMessage(error)))
          },
        },
        duration: 6000,
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const groupedReactions = reactionsQuery.byMessage
  const isEmpty = !isLoading && !isError && messages.length === 0
  const chatMissing = !chatQuery.isLoading && !chat

  if (chatMissing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-panel text-muted">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-[17px] font-semibold text-text">Chat tidak ditemukan</h2>
          <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-muted">
            {t('chat.notFoundHint')}
          </p>
        </div>
        <Link
          to="/chats"
          className="rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-primary-strong"
        >
          {t('chat.backToChats')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      {outbox.pending > 0 ? (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-3 py-1.5 text-[11.5px] font-medium text-amber-700 dark:text-amber-300">
          <span>
            {t('chat.queued', { count: outbox.pending })}
            {outbox.flushing ? ` · ${t('chat.sending')}` : ''}
          </span>
          {!outbox.flushing ? (
            <button
              type="button"
              onClick={outbox.flushNow}
              className="rounded-md underline underline-offset-2"
            >
              {t('chat.sendNow')}
            </button>
          ) : null}
        </div>
      ) : null}
      <header className="z-20 flex shrink-0 items-center gap-1 border-b border-border bg-surface/95 px-2 pb-2.5 pt-[max(0.55rem,env(safe-area-inset-top))] backdrop-blur sm:px-3 md:pt-2.5">
        <Link
          to="/chats"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text md:hidden"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-panel/70"
        >
          <Avatar
            src={otherAvatar}
            name={otherName}
            size={41}
            online={otherStatus === 'online'}
            gender={otherProfile?.gender}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-text">{otherName}</div>
            <div className="mt-0.5 flex h-4 items-center gap-1 text-[10.5px] text-muted">
              {isTyping ? (
                <>
                  <TypingDots className="text-primary" />
                  <span className="text-primary">mengetik…</span>
                </>
              ) : (
                <span className={cn(otherStatus === 'online' && 'text-online')}>{statusText}</span>
              )}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-text sm:flex"
            aria-label="Info kontak"
            title="Info kontak"
          >
            <Info className="h-[18px] w-[18px]" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-text"
                aria-label="Menu chat"
              >
                <MoreVertical className="h-[18px] w-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                <Info className="h-4 w-4" />
                {t('chat.viewProfile')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void togglePin()}>
                <Pin className="h-4 w-4" />
                {pinned ? t('chat.unpinChat') : t('chat.pinChat')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void toggleMute()}>
                {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                {muted ? t('chat.unmuteChat') : t('chat.muteChat')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void toggleArchive()}>
                {archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {archived ? t('chats.unarchiveChat') : t('chats.archiveChat')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/chats">
                  <ArrowLeft className="h-4 w-4" />
                  {t('chat.backToList')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={liveOpen} onOpenChange={setLiveOpen}>
        <DialogContent title={t('groups.liveDuration')} className="max-w-sm">
          <div className="flex flex-col gap-1.5">
            {[
              { minutes: 15, label: t('groups.live15') },
              { minutes: 60, label: t('groups.live60') },
              { minutes: 480, label: t('groups.live480') },
            ].map((option) => (
              <Button
                key={option.minutes}
                variant="secondary"
                onClick={() => {
                  setLiveOpen(false)
                  startLiveLocation(option.minutes)
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ForwardDialog
        message={forwardTarget}
        open={Boolean(forwardTarget)}
        onOpenChange={(open) => {
          if (!open) setForwardTarget(null)
        }}
        myUid={myUid}
        myName={authProfile?.nickname ?? 'Kamu'}
        myGender={authProfile?.gender ?? null}
        onDone={() => setForwardTarget(null)}
      />

      {!connected && chat ? (
        <div className="flex items-center justify-center gap-1.5 bg-amber-500/10 px-3 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('chat.reconnecting')}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="chat-canvas h-full overflow-y-auto overscroll-contain thin-scrollbar"
        >
          <div className="mx-auto w-full max-w-4xl space-y-1 px-0 pb-4 pt-3 sm:px-3">
            {hasNextPage ? (
              <div className="flex justify-center py-2">
                {isFetchingNextPage ? (
                  <Spinner className="text-primary" />
                ) : (
                  <button
                    type="button"
                    onClick={loadOlder}
                    className="rounded-full bg-panel px-3 py-1.5 text-[11.5px] font-medium text-muted transition hover:bg-panel-2 hover:text-text"
                  >
                    {t('chat.loadOlder')}
                  </button>
                )}
              </div>
            ) : null}

            {isLoading ? (
              <div className="space-y-3 px-4 py-4 sm:px-6">
                {[0, 1, 2, 3].map((key) => (
                  <div
                    key={key}
                    className={cn('flex', key % 2 === 0 ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'h-10 animate-pulse rounded-2xl bg-surface/80',
                        key % 2 === 0 ? 'w-48' : 'w-60',
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <p className="text-[13px] font-medium text-text">Gagal memuat pesan</p>
                <p className="text-[11.5px] text-muted">Periksa koneksi lalu coba lagi.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-xl bg-primary px-4 py-2 text-[12px] font-medium text-white"
                >
                  Coba lagi
                </button>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-surface text-primary shadow-sm">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-display text-[16px] font-semibold text-text">
                  Belum ada pesan
                </h2>
                <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-muted">
                  Sapa {otherName} duluan. Pesan akan langsung tersimpan di chat ini.
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const previous = messages[index - 1]
                const showDay = !previous || !sameDay(previous.created_at, message.created_at)
                const isMine = message.sender_id === myUid

                // ALBUM: foto dengan `album_id` sama dirender sebagai SATU grid
                // pada kemunculan pertama; sisanya dilewati.
                const albumId = message.album_id ?? null
                const isAlbumPhoto =
                  Boolean(albumId) && message.type === 'image' && message.is_deleted !== true
                if (isAlbumPhoto) {
                  const prevAlbum = previous?.album_id ?? null
                  if (prevAlbum === albumId) return null
                  const albumMessages = messages.filter(
                    (item) => item.album_id === albumId && item.type === 'image',
                  )
                  return (
                    <Fragment key={`album-${albumId}`}>
                      {showDay ? (
                        <div className="flex justify-center py-2.5">
                          <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[9.5px] font-medium text-muted-2 shadow-sm">
                            {new Date(message.created_at).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          'flex w-full px-3 sm:px-6',
                          isMine ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[72%] overflow-hidden rounded-2xl border shadow-sm sm:max-w-[58%]',
                            isMine
                              ? 'rounded-tr-md border-primary/15 bg-bubble-out'
                              : 'rounded-tl-md border-border/70 bg-bubble-in',
                          )}
                        >
                          <AlbumGrid
                            messages={albumMessages}
                            isMine={isMine}
                            onOpen={setViewerSrc}
                          />
                        </div>
                      </div>
                    </Fragment>
                  )
                }

                return (
                  <Fragment key={message.temp_id ?? message.id}>
                    {showDay ? (
                      <div className="flex justify-center py-2.5">
                        <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[9.5px] font-medium text-muted-2 shadow-sm">
                          {new Date(message.created_at).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </span>
                      </div>
                    ) : null}
                    <MessageBubble
                      message={message}
                      isMine={isMine}
                      myUid={myUid ?? ''}
                      reactions={groupedReactions.get(String(message.id))}
                      otherLastReadAt={otherLastReadAt}
                      onReply={handleReply}
                      onReact={(target, emoji) => void handleReact(target, emoji)}
                      onForward={(target) => setForwardTarget(target)}
                      starred={(starredIds.data ?? []).includes(String(message.id))}
                      onToggleStar={(target) => {
                        toggleStarMutation.mutate(target.id, {
                          onSuccess: (nowStarred) =>
                            toast.success(nowStarred ? t('star.added') : t('star.removed')),
                          onError: (error) => toast.error(errorMessage(error)),
                        })
                      }}
                      onRetry={(target) => void handleRetry(target)}
                      onEdit={(target) => void handleEdit(target)}
                      onDelete={(target) => void handleDelete(target)}
                      onOpenImage={setViewerSrc}
                      onMediaLoad={() => {
                        if (stickRef.current) scrollToBottom()
                      }}
                    />
                  </Fragment>
                )
              })
            )}

            {isTyping ? (
              <div className="flex px-3 pt-1 sm:px-6">
                <div className="rounded-2xl rounded-tl-md border border-border/70 bg-bubble-in px-3 py-2 shadow-sm">
                  <TypingDots className="text-muted" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showJump ? (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[11px] font-medium text-primary shadow-soft ring-1 ring-border transition hover:bg-panel"
          >
            Pesan baru
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-3">
        {replyTo ? (
          <div className="mx-auto mb-2 flex max-w-4xl items-start gap-2 rounded-xl border-l-[3px] border-primary bg-primary/6 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold text-primary">
                Membalas {senderNameOf(replyTo)}
              </div>
              <div className="truncate text-[11px] text-muted">{messagePreview(replyTo)}</div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-2 hover:bg-panel hover:text-text"
              aria-label="Batalkan balasan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <div className="mx-auto flex max-w-4xl items-end gap-1.5">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text"
                aria-label="Emoji"
                title="Emoji"
              >
                <Smile className="h-[19px] w-[19px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" side="top" align="start">
              <div className="grid grid-cols-6 gap-1">
                {COMPOSER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-panel"
                    onClick={() => {
                      setEmojiOpen(false)
                      handleTextChange(text + emoji)
                      textareaRef.current?.focus()
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void handleImageFile(event)}
          />
          <input
            ref={docRef}
            type="file"
            className="hidden"
            onChange={(event) => void handleDocFile(event)}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => void handleVideoFile(event)}
          />
          <input
            ref={onceRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (onceRef.current) onceRef.current.value = ''
              if (file) void sendVideoOnce(file)
            }}
          />
          {otherBlocked ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-danger/25 bg-danger/8 px-3.5 py-2.5 text-[12px] text-danger">
              <ShieldOff className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{t('chat.blockedBanner')}</span>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-[11.5px] font-medium underline underline-offset-2"
                disabled={setBlocked.isPending}
                onClick={() => {
                  if (!otherUid) return
                  setBlocked.mutate(
                    { otherUid, blocked: false },
                    { onSuccess: () => toast.success('Blokir dibuka.') },
                  )
                }}
              >
                {t('chat.unblock')}
              </button>
            </div>
          ) : null}

          {recording ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-danger/30 bg-danger/8 px-3 py-2.5 text-[12px] text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
              <span className="flex-1">Merekam… {String(Math.floor(recordSecs / 60)).padStart(2, '0')}:{String(recordSecs % 60).padStart(2, '0')}</span>
              <button
                type="button"
                onClick={() => void toggleRecording()}
                className="inline-flex items-center gap-1 rounded-lg bg-danger px-2 py-1 text-[11px] font-medium text-white"
              >
                <Square className="h-3 w-3" /> Kirim
              </button>
            </div>
          ) : null}

          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={mediaBusy || otherBlocked}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text disabled:opacity-50"
                aria-label={t('chat.attachment')}
                title="Lampiran"
              >
                {mediaBusy ? <Spinner /> : <Paperclip className="h-[19px] w-[19px]" />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="w-56 p-1.5">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition hover:bg-panel"
                onClick={() => {
                  setAttachOpen(false)
                  docRef.current?.click()
                }}
              >
                <FileText className="h-4 w-4 text-primary" />
                {t('chat.document')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition hover:bg-panel"
                onClick={() => {
                  setAttachOpen(false)
                  videoRef.current?.click()
                }}
              >
                <Video className="h-4 w-4 text-primary" />
                {t('chat.video')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition hover:bg-panel"
                onClick={() => {
                  setAttachOpen(false)
                  onceRef.current?.click()
                }}
              >
                <Eye className="h-4 w-4 text-primary" />
                {t('chat.videoOnce')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition hover:bg-panel"
                onClick={() => {
                  setAttachOpen(false)
                  sendLocation()
                }}
              >
                <MapPin className="h-4 w-4 text-primary" />
                {t('chat.location')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition hover:bg-panel"
                onClick={() => {
                  setAttachOpen(false)
                  setLiveOpen(true)
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-online" />
                {t('groups.liveLocation')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition hover:bg-panel"
                onClick={() => {
                  setAttachOpen(false)
                  void toggleRecording()
                }}
              >
                <Mic className="h-4 w-4 text-primary" />
                {t('chat.recordVoice')}
              </button>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imageBusy || otherBlocked}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-text disabled:opacity-50"
            aria-label={t('chat.sendImage')}
            title="Kirim gambar"
          >
            {imageBusy ? <Spinner /> : <ImagePlus className="h-[19px] w-[19px]" />}
          </button>

          <StickerPicker
            myUid={myUid}
            disabled={otherBlocked}
            onPick={(path) => void sendSticker(path)}
          />

          <div className="relative flex min-w-0 flex-1 items-end">
            {mention.token && mention.options.length > 0 ? (
              <ul
                className="absolute bottom-full left-0 z-30 mb-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-soft"
                role="listbox"
                aria-label={t('mention.title')}
              >
                {mention.options.map((option) => (
                  <li key={option.uid}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => mention.choose(option)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-text transition hover:bg-panel"
                    >
                      <Avatar name={option.name} size={22} />
                      <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <textarea
              ref={textareaRef}
              value={text}
              rows={1}
              maxLength={2000}
              disabled={otherBlocked}
              onChange={(event) => {
                handleTextChange(event.target.value)
                mention.handleCaret(event)
              }}
              onKeyUp={mention.handleCaret}
              onClick={mention.handleCaret}
              onKeyDown={handleKeyDown}
              onBlur={stopTyping}
              placeholder={t('chat.typeMessage')}
              className="composer-textarea block h-10 max-h-24 w-full resize-none rounded-2xl border border-transparent bg-panel px-3.5 py-[11px] text-[13.5px] leading-[18px] text-text outline-none transition placeholder:text-muted-2 focus:border-primary/30 focus:bg-surface focus:ring-2 focus:ring-primary/10"
              aria-label={t('chat.typeMessage')}
            />
          </div>

          <button
            type="button"
            onClick={() => void sendTextMessage()}
            disabled={!text.trim() || otherBlocked}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_-10px_rgb(33_150_243/0.9)] transition hover:bg-primary-strong disabled:bg-panel-2 disabled:text-muted-2 disabled:shadow-none"
            aria-label={t('chat.send')}
            title="Kirim"
          >
            <SendHorizontal className="h-[19px] w-[19px]" />
          </button>
        </div>

        <div className="mx-auto mt-1 flex max-w-4xl items-center justify-between gap-2 px-2">
          <p className="hidden text-[9px] text-muted-2 sm:block">
            {t('chat.enterToSend')}
          </p>
          {text.length > 1800 ? (
            <span className="ml-auto text-[9.5px] text-muted-2">{text.length}/2000</span>
          ) : null}
        </div>
      </div>

      <ProfileDrawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        uid={otherUid}
        fallbackName={otherName}
      />

      <Dialog
        open={Boolean(viewerSrc)}
        onOpenChange={(open) => {
          if (!open) setViewerSrc(null)
        }}
      >
        {viewerSrc ? (
          <DialogContent title="Foto" className="max-w-3xl p-2 pt-9">
            <img src={viewerSrc} alt="Foto pesan" className="max-h-[76vh] w-full rounded-xl object-contain" />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
