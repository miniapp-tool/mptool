/**
 * SVG 转换到 Data URI
 *
 * @param content SVG 内容
 * @returns Data URI 字符串
 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    .replaceAll('"', "'")
    .replaceAll("<", "%3C")
    .replaceAll(">", "%3E")
    .replaceAll("#", "%23")}`;
