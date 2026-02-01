/** SVG 转换 */
export const convertSVGToDataURI = (content: string): string =>
  `data:image/svg+xml,${content
    .replaceAll(/"/gu, "'")
    .replaceAll(/</gu, "%3C")
    .replaceAll(/>/gu, "%3E")
    .replaceAll(/#/gu, "%23")}`;
