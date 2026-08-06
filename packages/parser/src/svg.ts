/**
 * SVG conversion
 *
 * @param content - SVG content to convert
 * @returns Data URI string
 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    .replace(/%/gu, "%25")
    .replace(/"/gu, "'")
    .replace(/</gu, "%3C")
    .replace(/>/gu, "%3E")
    .replace(/#/gu, "%23")}`;
