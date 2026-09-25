import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'

/** Saves an uploaded RFP workbook so export can later write answers back into it (spec §3.1.8). */
export function saveUploadedWorkbook(rfpId: string, buffer: Buffer): string {
  const dir = path.join(env.fileStorePath, 'uploads')
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${rfpId}.xlsx`)
  fs.writeFileSync(filePath, buffer)
  return filePath
}
