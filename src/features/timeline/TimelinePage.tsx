import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PostCard } from '@/features/timeline/PostCard'
import { TimelineComposer } from '@/features/timeline/TimelineComposer'
import {
  useAddComment,
  useDeleteComment,
  useDeletePost,
  usePostComments,
  usePosts,
  useSharePost,
  useTogglePostLike,
} from '@/hooks/useTimeline'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { TimelineScope } from '@/lib/api/timeline'

/** Halaman Timeline — paritas `timeline_screen.dart` (scope: all/following/mine). */
export function TimelinePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [scope, setScope] = useState<TimelineScope>('all')
  const [composeOpen, setComposeOpen] = useState(false)
  const [commentsFor, setCommentsFor] = useState<string | null>(null)

  const posts = usePosts(scope, Boolean(profile?.id))
  const like = useTogglePostLike()
  const share = useSharePost()
  const remove = useDeletePost()

  const list = posts.data ?? []

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
          <h1 className="flex-1 font-display text-[15px] font-semibold text-text">
            {t('timeline.title')}
          </h1>
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t('timeline.publish')}
          </Button>
        </div>
        <div className="flex gap-1 px-4">
          {(
            [
              ['all', t('timeline.all')],
              ['following', t('timeline.following')],
              ['mine', t('timeline.mine')],
            ] as Array<[TimelineScope, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={cn(
                'relative px-3 py-2 text-[12.5px] font-medium transition',
                scope === key ? 'text-primary' : 'text-muted hover:text-text',
              )}
            >
              {label}
              {scope === key ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5">
        {posts.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center">
            <p className="text-[13px] font-medium text-text">{t('timeline.empty')}</p>
            <p className="mt-1.5 text-[12px] text-muted">{t('timeline.emptyHint')}</p>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-2xl flex-col gap-2.5">
            {list.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  myUid={profile?.id}
                  isIndonesian={i18n.language === 'id'}
                  onLike={() =>
                    like.mutate(post.id, {
                      onError: (error) => toast.error(errorMessage(error)),
                    })
                  }
                  onComment={() => setCommentsFor(post.id)}
                  onShare={() =>
                    share.mutate(post.id, {
                      onSuccess: () => toast.success(t('timeline.shared')),
                      onError: (error) => toast.error(errorMessage(error)),
                    })
                  }
                  onDelete={() => {
                    if (!window.confirm(t('timeline.deleteConfirm'))) return
                    remove.mutate(post.id, {
                      onSuccess: () => toast.success(t('timeline.deleted')),
                      onError: (error) => toast.error(errorMessage(error)),
                    })
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <TimelineComposer open={composeOpen} onOpenChange={setComposeOpen} />

      <Dialog
        open={Boolean(commentsFor)}
        onOpenChange={(open) => {
          if (!open) setCommentsFor(null)
        }}
      >
        <DialogContent title={t('timeline.commentsTitle')} className="max-w-lg">
          {commentsFor ? (
            <CommentList postId={commentsFor} myUid={profile?.id} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CommentList({ postId, myUid }: { postId: string; myUid: string | undefined }) {
  const { t } = useTranslation()
  const comments = usePostComments(postId)
  const add = useAddComment(postId)
  const removeComment = useDeleteComment(postId)
  const [draft, setDraft] = useState('')

  return (
    <div>
      <div className="max-h-[46vh] overflow-y-auto">
        {comments.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (comments.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted">{t('timeline.commentsEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(comments.data ?? []).map((comment) => (
              <li
                key={comment.id}
                className={cn('flex gap-2', comment.parentId ? 'ml-6' : '')}
              >
                <Avatar name={comment.authorName} size={26} gender={comment.authorGender} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-medium text-text">{comment.authorName}</div>
                  <p className="whitespace-pre-wrap break-words text-[12px] text-muted">
                    {comment.text}
                  </p>
                </div>
                {comment.authorId === myUid ? (
                  <button
                    type="button"
                    onClick={() => removeComment.mutate(comment.id)}
                    className="shrink-0 text-[10.5px] text-muted-2 transition hover:text-danger"
                  >
                    {t('common.delete')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="mt-3 flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          const clean = draft.trim()
          if (!clean) return
          add.mutate(clean, {
            onSuccess: () => setDraft(''),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('timeline.commentPlaceholder')}
          maxLength={500}
        />
        <Button type="submit" size="sm" disabled={add.isPending || !draft.trim()}>
          {add.isPending ? <Spinner /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </form>
    </div>
  )
}
