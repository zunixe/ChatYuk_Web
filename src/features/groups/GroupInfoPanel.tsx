import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Copy, Crown, Images, LogOut, Shield, Trash2, UserMinus, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SideSheet } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { GROUP_ICONS } from '@/features/groups/group-icons'
import {
  useApproveJoinRequest,
  useDeleteRoom,
  useExtendRoom,
  useInviteToRoom,
  useJoinRequests,
  useKickRoomMember,
  useLeaveRoom,
  useMyRoomRole,
  useRejectJoinRequest,
  useResetRoomPassword,
  useRoom,
  useRoomMembers,
  useSetRoomMemberRole,
  useUpdateRoomIcon,
} from '@/hooks/useGroups'
import { useUserSearch } from '@/hooks/useChatData'
import type { RoomRole } from '@/lib/api/groups'
import { cn } from '@/lib/utils'

function roleLabel(role: RoomRole, t: (key: string) => string): string {
  if (role === 'owner') return t('groups.owner')
  if (role === 'admin') return t('groups.admin')
  return ''
}

/**
 * Panel "Info grup" — A2 (anggota/kick/invite/role), A3 (approve/reject join),
 * A4 (ikon + password), A5 (extend/hapus/keluar).
 *
 * Semua aksi ditegakkan server (RLS/RPC); panel hanya menyembunyikan tombol
 * yang tidak relevan agar tidak membingungkan.
 */
export function GroupInfoPanel({
  open,
  onOpenChange,
  roomId,
  myUid,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  myUid: string | undefined
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const room = useRoom(roomId, myUid)
  const role = useMyRoomRole(roomId, myUid)
  const canModerate = role.data === 'owner' || role.data === 'admin'
  const isOwner = role.data === 'owner'

  const members = useRoomMembers(roomId, open)
  const requests = useJoinRequests(roomId, open && canModerate)

  const approve = useApproveJoinRequest(roomId, myUid)
  const reject = useRejectJoinRequest(roomId, myUid)
  const kick = useKickRoomMember(roomId, myUid)
  const invite = useInviteToRoom(roomId, myUid)
  const setRole = useSetRoomMemberRole(roomId, myUid)
  const updateIcon = useUpdateRoomIcon(roomId, myUid)
  const resetPassword = useResetRoomPassword(roomId, myUid)
  const extend = useExtendRoom(roomId, myUid)
  const removeRoom = useDeleteRoom(myUid)
  const leave = useLeaveRoom(myUid)

  const [inviteTerm, setInviteTerm] = useState('')
  const [password, setPassword] = useState('')
  const search = useUserSearch(inviteTerm, myUid)
  const joinCode = room.data?.joinToken ?? ''

  const memberIds = new Set((members.data ?? []).map((m) => m.userId))
  const candidates = (search.data ?? []).filter((p) => !memberIds.has(p.id)).slice(0, 6)

  function fail(error: unknown) {
    const message = error instanceof Error ? error.message : t('groups.actionFailed')
    toast.error(message)
  }

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} title={t('groups.info')}>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Identitas grup */}
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-panel text-[26px]">
            {room.data?.icon || '💬'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-semibold text-text">
              {room.data?.name ?? '—'}
            </div>
            <div className="text-[11.5px] text-muted">
              {room.data?.country}
              {room.data?.hasPassword ? ` · ${t('groups.passwordSection')}` : ''}
            </div>
          </div>
        </div>

        {/* Ganti ikon (owner/admin) */}
        {canModerate ? (
          <section className="mt-5">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
              {t('groups.changeIcon')}
            </h3>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {GROUP_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`icon ${emoji}`}
                  aria-pressed={room.data?.icon === emoji}
                  disabled={updateIcon.isPending}
                  onClick={() =>
                    updateIcon.mutate(emoji, {
                      onSuccess: () => toast.success(t('groups.iconUpdated')),
                      onError: fail,
                    })
                  }
                  className={cn(
                    'flex h-10 items-center justify-center rounded-xl border text-[18px] transition',
                    room.data?.icon === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-panel hover:border-primary/40',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* A3: permintaan gabung */}
        {canModerate ? (
          <section className="mt-5">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
              {t('groups.requestsTitle', { count: requests.data?.length ?? 0 })}
            </h3>
            {requests.isLoading ? (
              <div className="mt-2 flex justify-center py-2">
                <Spinner />
              </div>
            ) : (requests.data ?? []).length === 0 ? (
              <p className="mt-1.5 text-[11.5px] text-muted-2">—</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {(requests.data ?? []).map((request) => (
                  <li
                    key={request.userId}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-2.5 py-2"
                  >
                    <Avatar name={request.nickname} size={30} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-text">
                      {request.nickname}
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        approve.mutate(request.userId, {
                          onSuccess: () => toast.success(t('groups.requestApproved')),
                          onError: fail,
                        })
                      }
                      disabled={approve.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('groups.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        reject.mutate(request.userId, {
                          onSuccess: () => toast.success(t('groups.requestRejected')),
                          onError: fail,
                        })
                      }
                      disabled={reject.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* A2: undang anggota */}
        {canModerate ? (
          <section className="mt-5">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
              {t('groups.invite')}
            </h3>
            <Input
              value={inviteTerm}
              onChange={(event) => setInviteTerm(event.target.value)}
              placeholder={t('groups.invitePlaceholder')}
              className="mt-1.5"
            />
            {candidates.length > 0 ? (
              <ul className="mt-1.5 flex flex-col gap-1">
                {candidates.map((person) => (
                  <li key={person.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                    <Avatar name={person.nickname} size={26} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text">
                      {person.nickname}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={invite.isPending}
                      onClick={() =>
                        invite.mutate(person.id, {
                          onSuccess: () => {
                            toast.success(t('groups.invited'))
                            setInviteTerm('')
                          },
                          onError: fail,
                        })
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t('groups.inviteAction')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* A2: daftar anggota */}
        <section className="mt-5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
            {t('groups.membersTitle', { count: members.data?.length ?? 0 })}
          </h3>
          {members.isLoading ? (
            <div className="mt-2 flex justify-center py-2">
              <Spinner />
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {(members.data ?? []).map((member) => (
                <li key={member.userId} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
                  <Avatar
                    name={member.nickname}
                    size={30}
                    gender={member.gender}
                    online={member.status === 'online'}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[12.5px] text-text">{member.nickname}</span>
                      {member.role === 'owner' ? (
                        <Crown className="h-3 w-3 shrink-0 text-warning" />
                      ) : member.role === 'admin' ? (
                        <Shield className="h-3 w-3 shrink-0 text-primary" />
                      ) : null}
                    </div>
                    <div className="text-[10.5px] text-muted-2">
                      {roleLabel(member.role, t) || t('groups.admin').replace('Admin', '')}
                    </div>
                  </div>
                  {canModerate && member.userId !== myUid && member.role !== 'owner' ? (
                    <div className="flex items-center gap-1">
                      {isOwner ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={setRole.isPending}
                          onClick={() =>
                            setRole.mutate(
                              {
                                uid: member.userId,
                                role: member.role === 'admin' ? 'member' : 'admin',
                              },
                              { onError: fail },
                            )
                          }
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10"
                        disabled={kick.isPending}
                        onClick={() => {
                          if (!window.confirm(t('groups.kickConfirm', { name: member.nickname })))
                            return
                          kick.mutate(member.userId, {
                            onSuccess: () => toast.success(t('groups.memberRemoved')),
                            onError: fail,
                          })
                        }}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* A4: password */}
        {canModerate ? (
          <section className="mt-5">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
              {t('groups.passwordSection')}
            </h3>
            <div className="mt-1.5 space-y-1.5">
              <Label htmlFor="group-new-password" className="sr-only">
                {t('groups.setPassword')}
              </Label>
              <Input
                id="group-new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('groups.passwordRule')}
                maxLength={20}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  disabled={resetPassword.isPending || password.trim().length < 6}
                  onClick={() =>
                    resetPassword.mutate(password.trim(), {
                      onSuccess: () => {
                        setPassword('')
                        toast.success(t('groups.passwordUpdated'))
                      },
                      onError: fail,
                    })
                  }
                >
                  {t('groups.setPassword')}
                </Button>
                {room.data?.hasPassword ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={resetPassword.isPending}
                    onClick={() =>
                      resetPassword.mutate(null, {
                        onSuccess: () => {
                          setPassword('')
                          toast.success(t('groups.passwordRemoved'))
                        },
                        onError: fail,
                      })
                    }
                  >
                    {t('groups.removePassword')}
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* A9: galeri media */}
        <section className="mt-5">
          <Link
            to={`/groups/${roomId}/media`}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-panel px-3 py-2.5 text-[12.5px] text-text transition hover:border-primary/40"
          >
            <Images className="h-4 w-4 text-primary" />
            {t('groups.media')}
          </Link>
        </section>

        {/* A10: kode gabung (read-only — rotasi khusus admin) */}
        {canModerate ? (
          <section className="mt-4">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
              {t('groups.joinCodeTitle')}
            </h3>
            <p className="mt-1 text-[10.5px] text-muted-2">{t('groups.joinCodeHint')}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-panel px-2.5 py-1.5 font-mono text-[11.5px] text-text">
                {joinCode || '—'}
              </code>
              <Button
                size="sm"
                variant="secondary"
                disabled={!joinCode}
                onClick={() => {
                  const link = `${window.location.origin}/groups/${roomId}?t=${joinCode}`
                  void navigator.clipboard.writeText(link).then(
                    () => toast.success(t('groups.copied')),
                    () => toast.error(t('groups.actionFailed')),
                  )
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {t('groups.copyLink')}
              </Button>
            </div>
          </section>
        ) : null}

        {/* A5: zona berbahaya */}
        <section className="mt-6 border-t border-border pt-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
            {t('groups.dangerSection')}
          </h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {role.data === 'owner' ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={extend.isPending}
                  onClick={() => {
                    if (!window.confirm(t('groups.extendConfirm'))) return
                    extend.mutate(undefined, {
                      onSuccess: () => toast.success(t('groups.extended')),
                      onError: fail,
                    })
                  }}
                >
                  {t('groups.extend')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={removeRoom.isPending}
                  onClick={() => {
                    if (!window.confirm(t('groups.deleteConfirm'))) return
                    removeRoom.mutate(roomId, {
                      onSuccess: () => {
                        toast.success(t('groups.deletedGroup'))
                        onOpenChange(false)
                        navigate('/groups')
                      },
                      onError: fail,
                    })
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('groups.delete')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={leave.isPending}
                onClick={() => {
                  if (!window.confirm(t('groups.leaveConfirm2'))) return
                  leave.mutate(roomId, {
                    onSuccess: () => {
                      toast.success(t('groups.left'))
                      onOpenChange(false)
                      navigate('/groups')
                    },
                    onError: fail,
                  })
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('groups.leave')}
              </Button>
            )}
          </div>
        </section>
      </div>
    </SideSheet>
  )
}
