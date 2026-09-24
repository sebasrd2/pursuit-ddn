import { fetchAllowedPage } from '../../webLookup/fetchAllowed.js'
import { splitHtmlByHeadings } from './html.js'
import type { ExtractedSection } from '../chunk.js'

export async function extractWebPage(
  url: string,
  allowedDomains: string[],
): Promise<{ title: string; sections: ExtractedSection[] }> {
  const page = await fetchAllowedPage(url, allowedDomains)
  return { title: page.title, sections: splitHtmlByHeadings(page.html) }
}
