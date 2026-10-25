import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Copy, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Jaringan USDT — sama persis dengan `_networks` di `donate_screen.dart`. */
const USDT_NETWORKS = [
  { label: 'TRC20', subtitle: 'Tron Network', address: 'TRGo2h1FcFK2X9gcE333ndrkhz2gZTDt3Q' },
  {
    label: 'ERC20',
    subtitle: 'Ethereum Network',
    address: '0x87b2e5bc728c8ff4b96140415bc15989fa2a6504',
  },
  {
    label: 'BEP20',
    subtitle: 'BNB Smart Chain',
    address: '0x87b2e5bc728c8ff4b96140415bc15989fa2a6504',
  },
  { label: 'Morph', subtitle: 'Morph L2', address: '0x87b2e5bc728c8ff4b96140415bc15989fa2a6504' },
]

const NMID = 'NMID: ID1026566504126A01'

/**
 * Halaman donasi — paritas `donate_screen.dart`.
 * Statis (tanpa RPC): tab QRIS (gambar aset + NMID) dan USDT (4 jaringan).
 */
export function DonatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'qris' | 'usdt'>('qris')
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      toast.success(t('donate.copied', { label }))
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error(label)
    }
  }

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
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <Heart className="h-4.5 w-4.5" />
          </span>
          <h1 className="flex-1 font-display text-[15px] font-semibold text-text">
            {t('donate.title')}
          </h1>
        </div>
        <div className="flex gap-1 px-4">
          {(
            [
              ['qris', t('donate.qris')],
              ['usdt', t('donate.usdt')],
            ] as Array<['qris' | 'usdt', string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'relative px-3 py-2 text-[12.5px] font-medium transition',
                tab === key ? 'text-primary' : 'text-muted hover:text-text',
              )}
            >
              {label}
              {tab === key ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {tab === 'qris' ? (
          <div className="mx-auto flex max-w-md flex-col items-center">
            <p className="font-display text-[16px] font-semibold text-text">OneHeart</p>
            <p className="mt-0.5 text-[11.5px] text-muted-2">{NMID}</p>
            <p className="mt-1 text-[11.5px] text-muted">{t('donate.scanQris')}</p>

            <div className="mt-4 rounded-2xl border-2 border-primary p-2.5 shadow-[0_10px_30px_-18px_rgb(33_150_243/0.6)]">
              <img
                src="/qris_crop.png"
                alt="QRIS OneHeart"
                width={260}
                height={260}
                className="h-[260px] w-[260px] rounded-xl object-cover"
              />
            </div>

            <div className="mt-5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
              {t('donate.qrisInfo')}
            </div>

            <div className="mt-4 w-full rounded-xl bg-primary-soft px-3.5 py-3 text-center">
              <p className="text-[13px] font-semibold text-primary">{t('donate.thanksTitle')}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-primary/80">
                {t('donate.thanksMsg')}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <p className="text-[11.5px] text-muted">{t('donate.selectHint')}</p>
            {USDT_NETWORKS.map((network) => (
              <div
                key={network.label}
                className="rounded-xl border border-border bg-surface px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-text">{network.label}</p>
                    <p className="text-[10.5px] text-muted-2">{network.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] text-muted">
                    USDT
                  </span>
                </div>
                <p className="mt-2 break-all rounded-lg bg-panel px-2.5 py-1.5 font-mono text-[11px] text-text">
                  {network.address}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => void copy(network.address, network.label)}
                >
                  {copied === network.label ? (
                    <Check className="h-3.5 w-3.5 text-online" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {t('donate.copyAddress')}
                </Button>
              </div>
            ))}

            <div className="mt-1 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-3 text-[11px] leading-relaxed text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('donate.wrongNetwork')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
