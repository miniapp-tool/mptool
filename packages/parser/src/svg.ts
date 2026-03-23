/**
 * SVG 转换
 *
 * @param content - SVG content to convert
 * @returns Data URI string
 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    .replace(/"/g, "'")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/#/g, "%23")}`;
