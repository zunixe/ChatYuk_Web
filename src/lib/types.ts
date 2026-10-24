export type Gender = 'male' | 'female' | 'other' | string

export type PresenceStatus = 'online' | 'idle' | 'offline' | 'invisible' | string

export interface Profile {
  id: string
  nickname: string | null
  gender: Gender | null
  age: number | null
  country: string | null
  city: string | null
  status: PresenceStatus | null
  avatar: string | null
  about: string | null
  is_registered: boolean | null
  needs_onboarding?: boolean | null
  last_seen?: string | null
  created_at?: string | null
  login_at?: string | null
  phone?: string
  points?: number
  followers_count?: number | null
  following_count?: number | null
  friends_count?: number | null
  subscriber_count?: number | null
}

export interface Chat {
  chat_id: string
  participants: string[]
  participant_names?: Record<string, string>
  participant_genders?: Record<string, string>
  participant_locations?: Record<string, string>
  participant_ages?: Record<string, number>
  last_message?: string | null
  last_message_at?: string | null
  unread_counts?: Record<string, number> | null
  last_read_at?: Record<string, string> | null
  hidden_by?: string[] | null
  hidden_at?: Record<string, string> | null
  pinned_by?: string[] | null
  pinned_at?: string | null
  muted_by?: string[] | null
  archived_by?: string[] | null
  last_sender_id?: string | null
  message_count?: number | null
  created_at?: string | null
}

export type MessageType =
  | 'text'
  | 'image'
  | 'view_once'
  | 'view_once_expired'
  | 'voice'
  | 'coin'
  | 'gift'
  | 'call'
  | 'video'
  | 'video_once'
  | 'video_once_expired'
  | 'location'
  | 'sticker'
  | 'file'
  | 'poll'
  | 'contact'
  | string

export interface Message {
  id: number
  chat_id: string
  sender_id: string
  sender_name: string | null
  sender_gender: string | null
  text: string | null
  type: MessageType
  image_data?: string | null
  image_path?: string | null
  voice_path?: string | null
  duration_ms?: number | null
  video_poster?: string | null
  album_id?: string | null
  replied_to_id?: string | number | null
  replied_to_text?: string | null
  replied_to_sender_name?: string | null
  replied_to_meta?: unknown
  mentions?: unknown
  poll?: unknown
  contact?: unknown
  is_deleted?: boolean | null
  edited?: boolean | null
  is_forwarded?: boolean | null
  created_at: string
  client_status?: 'sending' | 'failed' | 'sent'
  temp_id?: string
}

export interface Reaction {
  id?: number
  chat_type: 'private' | 'room' | string
  chat_id: string
  message_id: string
  user_id: string
  emoji: string
  created_at?: string
}

export interface OnlineUser {
  id: string
  nickname: string
  gender: Gender
  age: number | null
  country: string | null
  city: string | null
  status: PresenceStatus
  avatar: string
  is_registered: boolean | null
  last_seen: string | null
  about: string | null
  friends_count?: number
  followers_count?: number
}

export interface PrivacySettings {
  presence?: string
  last_seen?: string
  profile_photo?: string
  about?: string
  story?: string
  leaderboard?: string
  call?: string
  read_receipts?: boolean
  exclusions?: Record<string, string[]>
}

export interface SendMessageInput {
  chatId: string
  senderId: string
  senderName: string
  senderGender: string
  text: string
  type?: MessageType
  imagePath?: string
  voicePath?: string
  videoPoster?: string
  durationMs?: number
  albumId?: string | null
  isForwarded?: boolean
  repliedToId?: string | number | null
  repliedToText?: string | null
  repliedToSenderName?: string | null
}
