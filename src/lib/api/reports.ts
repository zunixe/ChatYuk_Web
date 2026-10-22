import { supabase } from '@/lib/supabase'
import { validateReportReason } from '@/lib/report-rules'

export { REPORT_REASON_MAX, validateReportReason } from '@/lib/report-rules'

/**
 * Laporkan pengguna ke admin.
 * Kontrak sama dengan mobile (`ChatService.reportUser`): insert ke `reports`
 * dengan policy `reports_insert_own` (auth.uid() = reporter_id).
 */
export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: string,
): Promise<void> {
  const invalid = validateReportReason(reason)
  if (invalid) throw new Error(invalid)

  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason: reason.trim(),
  })
  if (error) throw error
}
