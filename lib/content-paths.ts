export function buildArticleHref(librarySlug: string, slugParts: string[]) {
  return `/kb/${[librarySlug, ...slugParts]
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function decodeRouteSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function decodeRouteSegments(segments: string[]) {
  return segments.map(decodeRouteSegment);
}
