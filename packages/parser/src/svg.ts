/**
 * SVG 转换
 *
 * @param content - SVG content to convert
 * @returns Data URI string
 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    .replaceAll('"', "'")
    .replaceAll("<", "%3C")
    .replaceAll(">", "%3E")
    .replaceAll("#", "%23")}`;
