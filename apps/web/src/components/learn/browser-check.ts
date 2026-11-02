/** Chrome, Edge and Safari have the speech voices the flashcards rely on. */
export function isRecommendedBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const isChrome = ua.includes('chrome') && !ua.includes('edg');
  const isSafari = ua.includes('safari') && !ua.includes('chrome');
  const isEdge = ua.includes('edg');
  return isChrome || isSafari || isEdge;
}
