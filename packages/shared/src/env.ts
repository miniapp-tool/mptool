// @ts-ignore
export const isQQ = typeof qq === "object";
export const isWx = typeof wx === "object" && !isQQ;
export const isMp = isQQ || isWx;
