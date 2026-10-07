import 'server-only';
import { appUrl } from './appUrl';
import { extraTimeLabel } from './extraTime';
import { formatDuration } from './format';
import { CATEGORY_SHORT, type AssessmentRow } from './types';

/*
 * Posts a short summary to Discord when a candidate finishes an assessment, using the
 * company's existing bot: DISCORD_BOT_TOKEN plus DISCORD_CHANNEL_ID. If either is missing,
 * nothing is sent. A failure here never affects the candidate's submission.
 */

const BRAND_FUCHSIA = 0xf0438f;
// Overridable only so automated tests can stand in for Discord.
const API = process.env.DISCORD_API_URL || 'https://discord.com/api/v10';

export function completionMessage(row: AssessmentRow, reviewUrl: string) {
  const categories = Object.entries(row.category_scores ?? {})
    .map(([c, score]) => `${CATEGORY_SHORT[c as keyof typeof CATEGORY_SHORT] ?? c} ${score}%`)
    .join(' · ');
  return {
    embeds: [
      {
        title: '📋 New Assessment Completed',
        color: BRAND_FUCHSIA,
        description: [
          `**${row.candidate_name}** · ${row.candidate_email}`,
          row.role,
          '',
          `**Score: ${row.overall_score} / 100**`,
          categories,
          '',
          `Time taken ${formatDuration(row.completion_time_seconds)} · Tab leaves ${row.tab_leave_count} · Extra time ${extraTimeLabel(Number(row.time_multiplier))}`,
          `[Review →](${reviewUrl})`,
        ].join('\n'),
      },
    ],
    allowed_mentions: { parse: [] as string[] },
  };
}

export async function notifyCompleted(row: AssessmentRow): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channel) return;
  const reviewUrl = appUrl(`/admin/candidates/${row.id}`, process.env.APP_BASE_URL || 'https://apply.houseofmarketer.com').toString();
  try {
    const res = await fetch(`${API}/channels/${channel}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(completionMessage(row, reviewUrl)),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`Discord post failed (${res.status}): ${await res.text()}`);
  } catch (e) {
    console.error('Discord post failed', e);
  }
}
