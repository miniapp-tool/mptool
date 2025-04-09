/** SVG 转换 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    .replace(/"/gu, "'")
    .replace(/</gu, "%3C")
    .replace(/>/gu, "%3E")
    .replace(/#/gu, "%23")}`;
