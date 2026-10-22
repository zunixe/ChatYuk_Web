import { describe, expect, it } from 'vitest'
import { REPORT_REASON_MAX, validateReportReason } from '@/lib/report-rules'

describe('validateReportReason', () => {
  it('menolak alasan kosong', () => {
    expect(validateReportReason('')).not.toBeNull()
    expect(validateReportReason('   ')).not.toBeNull()
  })

  it('menolak alasan terlalu panjang', () => {
    expect(validateReportReason('x'.repeat(REPORT_REASON_MAX + 1))).not.toBeNull()
  })

  it('menerima alasan yang wajar', () => {
    expect(validateReportReason('Spam')).toBeNull()
    expect(validateReportReason('x'.repeat(REPORT_REASON_MAX))).toBeNull()
  })
})
