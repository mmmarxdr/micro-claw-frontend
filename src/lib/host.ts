/**
 * Host detection — answers "is daimon running on this machine, or somewhere
 * remote?". Drives the contextual hint shown next to shell code blocks so
 * users in a VPS deployment know the command must run on the daimon host
 * (via SSH), not on their local laptop terminal.
 *
 * The detection is browser-side and uses `window.location.hostname` because
 * that's the only honest signal — it's the host the user typed into their
 * URL bar to reach the dashboard. Anything else (sniffing the daimon
 * process's hostname server-side, env vars, etc.) would be wrong: a daimon
 * binding to 0.0.0.0 still appears as `localhost` to a local browser and
 * as the public DNS to a remote one.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

/** True when the dashboard URL is on this machine. */
export function isLocalDaimon(): boolean {
  if (typeof window === 'undefined') return true
  return LOCAL_HOSTNAMES.has(window.location.hostname.toLowerCase())
}

/** The host the user types to reach this daimon (used in remote-host hints). */
export function daimonHostname(): string {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname
}

/**
 * Short copy that tells the user where a shell command should actually run.
 * Distinct from the LiminalCode copy button — this is *context*, not action.
 */
export function shellRunHint(): string {
  if (isLocalDaimon()) {
    return 'copy + run in your terminal'
  }
  return `copy + run via SSH on ${daimonHostname()}`
}
