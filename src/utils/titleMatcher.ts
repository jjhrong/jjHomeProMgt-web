export interface AppConfig {
  kind: string
  name: string
  orderSn: number
  value: string
  description: string
  status: string
}

/**
 * Match user's asset title dynamically based on the cached config array.
 * 
 * Filters configuration rows where kind is "ASSET_TITLE_CONFIG" and the name matches
 * categoryCode + "_". The suffix is parsed as the minimum threshold value.
 * Rows are sorted descending by threshold, and the first one satisfying value >= threshold
 * is returned.
 */
export function matchAssetTitle(
  configs: AppConfig[],
  categoryCode: string,
  currentValue: number
): string {
  const prefix = `${categoryCode}_`
  const ranges: { threshold: number; value: string }[] = []

  for (const cfg of configs) {
    if (cfg.kind !== 'ASSET_TITLE_CONFIG') {
      continue
    }
    if (!cfg.name.startsWith(prefix)) {
      continue
    }

    const numStr = cfg.name.substring(prefix.length)
    const threshold = parseInt(numStr, 10)
    if (isNaN(threshold)) {
      continue
    }

    ranges.push({ threshold, value: cfg.value })
  }

  // Sort from largest to smallest threshold
  ranges.sort((a, b) => b.threshold - a.threshold)

  // Find the first matching threshold
  for (const r of ranges) {
    if (currentValue >= r.threshold) {
      return r.value
    }
  }

  return ''
}
