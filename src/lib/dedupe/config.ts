import fs from 'fs'
import path from 'path'

export type DedupeConfig = {
  weights: { email: number; phone: number; name: number; company: number; address: number }
  thresholds: { auto: number; review: number }
  blocks: Record<string, boolean>
  features: { autoMergeFuzzy: boolean; notADupeSuppression: boolean }
}

let cached: DedupeConfig | null = null

export function getDedupeConfig(): DedupeConfig {
  if (cached) return cached
  const configPath = path.join(process.cwd(), 'src', 'lib', 'dedupe', 'config.json')
  const json = JSON.parse(fs.readFileSync(configPath, 'utf8')) as DedupeConfig
  cached = json
  return json
}


