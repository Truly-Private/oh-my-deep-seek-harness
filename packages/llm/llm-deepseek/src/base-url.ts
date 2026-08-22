/**
 * Remove trailing ASCII slash characters from a provider base URL.
 * @param value - provider base URL to normalize.
 * @returns the URL without trailing slash characters.
 */
export function trimTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1
  return value.slice(0, end)
}
