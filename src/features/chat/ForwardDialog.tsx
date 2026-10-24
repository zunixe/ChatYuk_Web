import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { useChats } from '@/hooks/useChatData'
import { useMyGroups } from '@/hooks/useGroups'
import { forwardMessage } from '@/lib/api/forward'
import { chatDisplayName, otherParticipant } from '@/lib/api/chats'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

/**
 * Dialog "Teruskan ke" — daftar chat + grup, lalu kirim salinan pesan
 * dengan `is_forwarded = true` (kontrak Android).
 */
export function ForwardDialog({
  message,
  open,
  onOpenChange,
  myUid,
  myName,
  myGender,
  onDone,
}: {
  message: Message | null
  open: boolean
  onOpenChange: (open: boolean) => void
  myUid: string | undefined
  myName: string
  myGender: string | null
  onDone: () => void
}) {
  const { t } = useTranslation()
  const chats = useChats(myUid)
  const groups = useMyGroups(myUid)
  const [term, setTerm] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const chatRows = useMemo(() => {
    const list = chats.data ?? []
    const query = term.trim().toLowerCase()
    const mapped = list.map((chat) => ({
      key: `chat:${chat.chat_id}`,
      label: chatDisplayName(chat, myUid ?? ''),
      other: otherParticipant(chat, myUid ?? ''),
    }))
    if (!query) return mapped
    return mapped.filter((row) => row.label.toLowerCase().includes(query))
  }, [chats.data, myUid, term])

  const groupRows = useMemo(() => {
    const list = groups.data ?? []
    const query = term.trim().toLowerCase()
    const mapped = list.map((room) => ({ key: `room:${room.id}`, label: room.name, icon: room.icon }))
    if (!query) return mapped
    return mapped.filter((row) => row.label.toLowerCase().includes(query))
  }, [groups.data, term])

  async function send(target: { kind: 'chat'; chatId: string } | { kind: 'room'; roomId: string }) {
    if (!message || !myUid) return
    setBusyKey(target.kind === 'chat' ? `chat:${target.chatId}` : `room:${target.roomId}`)
    try {
      await forwardMessage({
        message,
        target,
        sender: { uid: myUid, name: myName, gender: myGender },
      })
      toast.success(t('forward.success'))
      onOpenChange(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('forward.failed'))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTerm('')
        onOpenChange(next)
      }}
    >
      <DialogContent title={t('forward.title')} className="max-w-md">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t('common.search')}
          aria-label={t('common.search')}
        />

        <div className="mt-3 max-h-[46vh] overflow-y-auto">
          {chats.isLoading || groups.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : chatRows.length === 0 && groupRows.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted">{t('forward.empty')}</p>
          ) : (
            <>
              {groupRows.length > 0 ? (
                <>
                  <h3 className="mb-1 mt-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-2">
                    {t('forward.groups')}
                  </h3>
                  <ul className="mb-2 flex flex-col gap-0.5">
                    {groupRows.map((row) => (
                      <li key={row.key}>
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() => void send({ kind: 'room', roomId: row.key.slice(5) })}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-panel',
                            busyKey === row.key && 'opacity-60',
                          )}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel text-[15px]">
                            {row.icon || '💬'}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-text">
                            {row.label}
                          </span>
                          {busyKey === row.key ? <Spinner /> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {chatRows.length > 0 ? (
                <>
                  <h3 className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-2">
                    {t('forward.chats')}
                  </h3>
                  <ul className="flex flex-col gap-0.5">
                    {chatRows.map((row) => (
                      <li key={row.key}>
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() => void send({ kind: 'chat', chatId: row.key.slice(5) })}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-panel',
                            busyKey === row.key && 'opacity-60',
                          )}
                        >
                          <Avatar name={row.label} size={32} />
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-text">
                            {row.label}
                          </span>
                          {busyKey === row.key ? <Spinner /> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
