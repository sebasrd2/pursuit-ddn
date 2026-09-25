export class DomainNotAllowedError extends Error {}

export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return false
  }
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

export interface FetchedPage {
  url: string
  title: string
  html: string
}

/** Fetches a page, refusing anything outside the configured domain allow-list (spec §6.4). */
export async function fetchAllowedPage(url: string, allowedDomains: string[]): Promise<FetchedPage> {
  if (!isAllowedDomain(url, allowedDomains)) {
    throw new DomainNotAllowedError(`${url} is not in the allowed domain list`)
  }

  const response = await fetch(url, { headers: { 'User-Agent': 'PursuitBot/1.0' } })
  if (!response.ok) {
    throw new Error(`Fetching ${url} failed: ${response.status} ${response.statusText}`)
  }
  const html = await response.text()
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1]!.trim() : url

  return { url, title, html }
}
