import { useMemo, useState } from 'react'
import { activeMentionToken, filterMentionCandidates, type Mention } from '@/lib/mention'

/**
 * State autocomplete `@` untuk composer.
 *
 * Kandidat berasal dari pemanggil (anggota grup / peserta chat). Panel
 * tertutup otomatis begitu token diikuti spasi — sama seperti Android
 * (`activeMentionToken` berhenti di whitespace).
 */
export function useMentionAutocomplete({
  text,
  setText,
  candidates,
  textareaRef,
}: {
  text: string
  setText: (value: string) => void
  candidates: Mention[]
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const [caret, setCaret] = useState<number | null>(null)
  const [picked, setPicked] = useState<Mention[]>([])

  const token = useMemo(() => {
    if (caret == null) return null
    return activeMentionToken(text, caret)
  }, [text, caret])

  const options = useMemo(() => {
    if (!token) return []
    return filterMentionCandidates(candidates, token.query)
  }, [token, candidates])

  function handleCaret(event: React.SyntheticEvent<HTMLTextAreaElement>) {
    setCaret(event.currentTarget.selectionStart ?? null)
  }

  /** Sisipkan `@Nama ` menggantikan token aktif. */
  function choose(mention: Mention) {
    if (!token) return
    const before = text.slice(0, token.start)
    const after = text.slice(caret ?? text.length)
    const inserted = `@${mention.name} `
    setText(before + inserted + after)
    setPicked((current) =>
      current.some((entry) => entry.uid === mention.uid) ? current : [...current, mention],
    )
    const nextCaret = (token.start + inserted.length)
    setCaret(nextCaret)
    requestAnimationFrame(() => {
      const element = textareaRef.current
      if (!element) return
      element.focus()
      element.setSelectionRange(nextCaret, nextCaret)
    })
  }

  /** Buang mention yang teksnya sudah tidak ada lagi di draft. */
  function mentionsInText(): Mention[] {
    return picked.filter((mention) => text.includes(`@${mention.name}`))
  }

  function reset() {
    setPicked([])
    setCaret(null)
  }

  return {
    token,
    options,
    handleCaret,
    choose,
    mentionsInText,
    reset,
  }
}
