import { BellOff, Pin } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/avatar'
import {
  chatDisplayName,
  chatIsMuted,
  chatIsPinned,
  chatUnreadCount,
  otherParticipant,
} from '@/lib/api/chats'
import { formatChatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { Chat, Profile } from '@/lib/types'

interface ChatListItemProps {
  chat: Chat
  myUid: string
  avatar?: string | null
  presence?: Pick<Profile, 'status' | 'last_seen'> | null
}

export function ChatListItem({ chat, myUid, avatar, presence }: ChatListItemProps) {
  const otherUid = otherParticipant(chat, myUid)
  const name = chatDisplayName(chat, myUid)
  const unread = chatUnreadCount(chat, myUid)
  const pinned = chatIsPinned(chat, myUid)
  const muted = chatIsMuted(chat, myUid)
  const lastMessage = (chat.last_message ?? '').trim()
  const preview = lastMessage || 'Mulai obrolan'
  const online = presence?.status === 'online'
  // Gender lawan bicara (tersimpan di private_chats.participant_genders),
  // sama seperti label gender di aplikasi mobile.
  const otherGender = chat.participant_genders?.[otherUid] ?? ''

  return (
    <NavLink
      to={`/chats/${chat.chat_id}`}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3.5 py-3 transition-colors sm:px-5',
          isActive ? 'bg-primary-soft/70' : 'hover:bg-panel/80',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" />
          ) : null}
          <Avatar src={avatar} name={name} size={48} online={online} gender={otherGender} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-text">
                {name}
              </span>
              {otherGender === 'male' || otherGender === 'female' ? (
                <span
                  className={
                    otherGender === 'male'
                      ? 'shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-600 dark:text-sky-400'
                      : 'shrink-0 rounded-full bg-pink-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-pink-600 dark:text-pink-400'
                  }
                  title={otherGender === 'male' ? 'Laki-laki' : 'Perempuan'}
                >
                  {otherGender === 'male' ? 'L' : 'P'}
                </span>
              ) : null}
              <span
                className={cn(
                  'shrink-0 text-[11px] tabular-nums',
                  unread > 0 ? 'font-medium text-primary' : 'text-muted-2',
                )}
              >
                {formatChatTime(chat.last_message_at)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {chat.last_sender_id === myUid && lastMessage ? (
                <span className="shrink-0 text-[12px] text-muted-2">Kamu:</span>
              ) : null}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12.5px]',
                  unread > 0 ? 'font-medium text-text/80' : 'text-muted',
                )}
              >
                {preview}
              </span>
              {muted ? <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-2" /> : null}
              {pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-muted-2" /> : null}
              {unread > 0 ? (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10.5px] font-semibold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </div>
          </div>
          <span className="sr-only">{otherUid}</span>
        </>
      )}
    </NavLink>
  )
}
