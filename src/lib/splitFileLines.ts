/** Lines of a file the way an editor counts them (a final newline doesn't add one). */
export function splitFileLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
}
