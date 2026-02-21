import type { OAuth2Client } from 'google-auth-library'
import { getMeetService } from './google'

/**
 * Configure a Google Meet space after creation via Calendar API.
 * Enables moderation, auto-recording, and adds co-hosts.
 * Fails silently (logs warning) if scopes are missing or plan doesn't support it.
 */
export async function configureMeetSpace(
  auth: OAuth2Client,
  conferenceId: string,
  options: {
    coHostEmails?: string[]
    enableRecording?: boolean
  }
) {
  const meet = getMeetService(auth)
  const spaceName = `spaces/${conferenceId}`

  // 1. Enable moderation + auto-recording
  try {
    await meet.spaces.patch({
      name: spaceName,
      updateMask: 'config.moderation,config.artifactConfig.recordingConfig.autoRecordingGeneration',
      requestBody: {
        config: {
          moderation: 'ON',
          artifactConfig: {
            recordingConfig: {
              autoRecordingGeneration: options.enableRecording ? 'AUTOMATICALLY_START_AND_STOP' : 'DISABLED',
            },
          },
        },
      },
    })
  } catch (e) {
    console.warn('[meet] Failed to configure space:', (e as Error).message || e)
    return // If space config fails, skip co-host too
  }

  // 2. Add co-hosts via v2 REST API (members endpoint)
  if (options.coHostEmails?.length) {
    const token = (await auth.getAccessToken()).token
    if (!token) {
      console.warn('[meet] No access token for co-host assignment')
      return
    }

    const results = await Promise.allSettled(
      options.coHostEmails.map((email) =>
        fetch(`https://meet.googleapis.com/v2/${spaceName}/members`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'COHOST',
            user: { email },
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`${res.status}: ${text}`)
          }
          return res.json()
        })
      )
    )

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      console.warn(
        `[meet] ${failed.length}/${options.coHostEmails.length} co-host assignments failed:`,
        failed.map((r) => (r as PromiseRejectedResult).reason?.message)
      )
    }
  }
}
