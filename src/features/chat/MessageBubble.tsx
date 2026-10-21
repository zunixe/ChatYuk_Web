import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
  Download,
  FileText,
  ImageOff,
  MapPin,
  Mic,
  BarChart3,
  Reply,
  RotateCcw,
  SmilePlus,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { messageImageSrc, storagePublicUrl } from '@/lib/media'
import { ViewOnceCard } from '@/features/chat/ViewOnceCard'
import { isViewOnceFamily } from '@/lib/view-once'
import { formatMessageTime } from '@/lib/time'
import { cn, messagePreview } from '@/lib/utils'
import type { Message, Reaction } from '@/lib/types'


const STRUCTURED_TYPES = new Set([
  'voice',
  'video',
  'video_once',
  'video_once_expired',
  'file',
  'sticker',
  'location',
  'poll',
  'contact',
])

function parseObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function formatBytes(value: number | null | undefined): string {
  const bytes = Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mediaUrl(path: string | null | undefined): string | null {
  const value = (path ?? '').trim()
  if (!value) return null
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value
  return storagePublicUrl(value)
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  myUid: string
  reactions?: Reaction[]
  otherLastReadAt?: string | null
  onReply: (message: Message) => void
  onReact: (message: Message, emoji: string) => void
  onRetry: (message: Message) => void
  onOpenImage: (src: string) => void
  onMediaLoad: () => void
}

export function MessageBubble({
  message,
  isMine,
  myUid,
  reactions,
  otherLastReadAt,
  onReply,
  onReact,
  onRetry,
  onOpenImage,
  onMediaLoad,
}: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const deleted = message.is_deleted === true
  const isViewOnce = isViewOnceFamily(message.type)
  const imageSrc =
    message.type === 'image' ? messageImageSrc(message) : null
  const text = (message.text ?? '').trim()
  const structured = STRUCTURED_TYPES.has(message.type)
  const showText = Boolean(text) && !structured
  const voiceSrc = message.type === 'voice' ? mediaUrl(message.voice_path || message.image_path) : null
  const videoSrc =
    message.type === 'video' || message.type === 'video_once' || message.type === 'video_once_expired'
      ? mediaUrl(message.image_path)
      : null
  const posterSrc = mediaUrl(message.video_poster)
  const fileSrc = message.type === 'file' ? mediaUrl(message.image_path) : null
  const stickerSrc = message.type === 'sticker' ? messageImageSrc(message) ?? mediaUrl(message.image_path) : null
  const location = message.type === 'location' ? parseObject(text) : null
  const poll = message.type === 'poll' ? parseObject(message.poll) ?? parseObject(text) : null
  const contact = message.type === 'contact' ? parseObject(message.contact) ?? parseObject(text) : null
  const failed = message.client_status === 'failed'
  const sending = message.client_status === 'sending'

  const summary = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>()
    for (const reaction of reactions ?? []) {
      const entry = map.get(reaction.emoji) ?? { count: 0, mine: false }
      entry.count += 1
      if (reaction.user_id === myUid) entry.mine = true
      map.set(reaction.emoji, entry)
    }
    return Array.from(map.entries())
  }, [myUid, reactions])

  const readByOther =
    isMine &&
    otherLastReadAt != null &&
    new Date(otherLastReadAt).getTime() >= new Date(message.created_at).getTime()

  const actions = deleted ? null : (
    <div className="flex shrink-0 items-center gap-0.5 self-center pb-2 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <button
        type="button"
        onClick={() => onReply(message)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/80 text-muted-2 shadow-sm transition hover:bg-surface hover:text-text"
        aria-label="Balas pesan"
        title="Balas"
      >
        <Reply className="h-3.5 w-3.5" />
      </button>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/80 text-muted-2 shadow-sm transition hover:bg-surface hover:text-text"
            aria-label="Beri reaksi"
            title="Reaksi"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" side="top">
          <div className="flex items-center gap-0.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:scale-110 hover:bg-panel"
                onClick={() => {
                  setPickerOpen(false)
                  onReact(message, emoji)
                }}
                aria-label={`Reaksi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <div
      className={cn(
        'group flex w-full items-start gap-1.5 px-3 sm:px-6',
        isMine ? 'justify-end' : 'justify-start',
      )}
    >
      {isMine ? actions : null}

      <div className={cn('max-w-[82%] sm:max-w-[70%] lg:max-w-[62%]', isMine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border px-3 py-2 shadow-sm',
            isMine
              ? 'rounded-tr-md border-primary/15 bg-bubble-out'
              : 'rounded-tl-md border-border/70 bg-bubble-in',
            failed && 'border-danger/40',
          )}
        >
          {message.replied_to_text || message.replied_to_id ? (
            <div className="mb-1.5 rounded-lg border-l-[3px] border-primary/70 bg-primary/8 px-2 py-1.5">
              <div className="truncate text-[10.5px] font-semibold text-primary">
                {message.replied_to_sender_name || 'Pesan'}
              </div>
              <div className="line-clamp-2 text-[11px] leading-snug text-muted">
                {message.replied_to_text || 'Media'}
              </div>
            </div>
          ) : null}

          {deleted ? (
            <p className="text-[13px] italic leading-relaxed text-muted-2">
              Pesan ini telah dihapus
            </p>
          ) : isViewOnce ? (
            <ViewOnceCard message={message} isMine={isMine} myUid={myUid} />
          ) : imageSrc ? (
            <button
              type="button"
              onClick={() => onOpenImage(imageSrc)}
              className="block max-w-full overflow-hidden rounded-xl bg-panel"
              aria-label="Buka gambar"
            >
              <img
                src={imageSrc}
                alt={text || 'Foto'}
                className="max-h-[320px] w-auto max-w-full object-contain"
                loading="lazy"
                onLoad={onMediaLoad}
              />
            </button>
          ) : message.type === 'image' ? (
            <div className="flex min-h-28 min-w-40 items-center justify-center gap-2 rounded-xl bg-panel text-muted-2">
              <ImageOff className="h-4 w-4" />
              <span className="text-[11px]">Media tidak tersedia</span>
            </div>
          ) : message.type === 'voice' ? (
            voiceSrc ? (
              <div className="min-w-52 rounded-xl bg-panel/70 p-2">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                  <Mic className="h-3.5 w-3.5" />
                  Pesan suara
                  {message.duration_ms ? <span>· {Math.round(message.duration_ms / 1000)} dtk</span> : null}
                </div>
                <audio src={voiceSrc} controls preload="metadata" className="w-full" />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11.5px] text-muted">
                <Mic className="h-3.5 w-3.5" /> Pesan suara tidak tersedia
              </div>
            )
          ) : videoSrc ? (
            <video
              src={videoSrc}
              poster={posterSrc ?? undefined}
              controls
              preload="metadata"
              className="max-h-[340px] w-full rounded-xl bg-black"
            />
          ) : message.type === 'video' || message.type === 'video_once' || message.type === 'video_once_expired' ? (
            <div className="flex min-h-24 items-center gap-2 text-[11.5px] text-muted">
              <ImageOff className="h-4 w-4" /> Video tidak tersedia
            </div>
          ) : message.type === 'file' ? (
            <a
              href={fileSrc ?? undefined}
              download={text || undefined}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-48 items-center gap-2 rounded-xl bg-panel/70 px-2.5 py-2 text-left transition hover:bg-panel"
            >
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-text">
                  {text || 'Dokumen'}
                </span>
                <span className="text-[10.5px] text-muted-2">
                  {formatBytes(message.duration_ms) || 'Unduh file'}
                </span>
              </span>
              <Download className="h-4 w-4 shrink-0 text-muted" />
            </a>
          ) : message.type === 'sticker' ? (
            stickerSrc ? (
              <img
                src={stickerSrc}
                alt="Stiker"
                className="h-28 w-28 object-contain"
                loading="lazy"
                onLoad={onMediaLoad}
              />
            ) : (
              <div className="text-[11.5px] text-muted">Stiker tidak tersedia</div>
            )
          ) : message.type === 'location' ? (
            <a
              href={
                location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))
                  ? `https://maps.google.com/?q=${location.lat},${location.lng}`
                  : '#'
              }
              target="_blank"
              rel="noreferrer"
              className="flex min-w-48 items-center gap-2 rounded-xl bg-panel/70 px-2.5 py-2 transition hover:bg-panel"
            >
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-text">
                  {String(location?.label ?? 'Lokasi')}
                </span>
                <span className="text-[10.5px] text-muted-2">
                  {String(location?.caption ?? 'Buka di Google Maps')}
                </span>
              </span>
            </a>
          ) : message.type === 'poll' ? (
            <div className="min-w-48 rounded-xl bg-panel/70 p-2.5">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-text">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                {String(poll?.q ?? messagePreview(message))}
              </div>
              <ul className="mt-1.5 space-y-1">
                {(Array.isArray(poll?.o) ? (poll.o as unknown[]) : []).map((option, index) => (
                  <li
                    key={`${index}-${String(option)}`}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-[11.5px] text-muted"
                  >
                    {String(option)}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] text-muted-2">
                {poll?.m === true ? 'Bisa pilih lebih dari satu' : 'Satu pilihan'} · vote dari web belum tersedia
              </p>
            </div>
          ) : message.type === 'contact' ? (
            <div className="min-w-48 rounded-xl bg-panel/70 p-2.5">
              <div className="text-[12px] font-medium text-text">
                {String(contact?.n ?? contact?.name ?? (text || 'Kontak'))}
              </div>
              {(Array.isArray(contact?.p) ? (contact.p as unknown[]) : []).map((phone) => (
                <a
                  key={String(phone)}
                  href={`tel:${String(phone)}`}
                  className="mt-0.5 block text-[11.5px] text-primary underline-offset-2 hover:underline"
                >
                  {String(phone)}
                </a>
              ))}
              {contact?.t === 'user' ? (
                <p className="mt-1 text-[10.5px] text-muted-2">Kontak ChatYuk</p>
              ) : null}
            </div>
          ) : !imageSrc && message.type !== 'text' && message.type !== 'coin' && message.type !== 'gift' && message.type !== 'call' ? (
            <div className="flex items-center gap-2 rounded-xl bg-panel/70 px-2 py-1.5 text-[11.5px] text-muted">
              <Download className="h-3.5 w-3.5" />
              {messagePreview(message)}
            </div>
          ) : null}

          {!deleted && showText ? (
            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-text">
              {text}
            </p>
          ) : null}

          <div
            className={cn(
              'mt-1 flex items-center justify-end gap-1 text-[9.5px] leading-none',
              imageSrc ? 'text-muted-2' : 'text-muted-2',
            )}
          >
            {failed ? (
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="mr-1 inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9.5px] font-medium text-danger"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Coba lagi
              </button>
            ) : null}
            <span className="tabular-nums">{formatMessageTime(message.created_at)}</span>
            {isMine ? (
              sending ? (
                <Clock3 className="h-3 w-3" />
              ) : failed ? (
                <AlertCircle className="h-3 w-3 text-danger" />
              ) : readByOther ? (
                <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )
            ) : null}
          </div>
        </div>

        {summary.length > 0 ? (
          <div className={cn('mt-1 flex flex-wrap gap-1', isMine ? 'justify-end' : 'justify-start')}>
            {summary.map(([emoji, info]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                className={cn(
                  'flex h-6 items-center gap-1 rounded-full border px-1.5 text-[11px] shadow-sm transition',
                  info.mine
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border bg-surface text-muted hover:bg-panel',
                )}
                aria-label={`${emoji} ${info.count}`}
              >
                <span className="text-[12px] leading-none">{emoji}</span>
                {info.count > 1 ? <span className="text-[9.5px] tabular-nums">{info.count}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!isMine ? actions : null}
    </div>
  )
}
