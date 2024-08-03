/**
 * 获取变量类型
 *
 * @param obj 需要辨别的变量
 * @returns 对象的类型
 */
export const type = (obj: unknown): string => {
  if (obj === undefined) return "undefined";

  const objType = typeof obj;

  if (objType === "object") {
    if (obj === null) return "null";

    const objType = /\[object (\w+)\]/u.exec(
      Object.prototype.toString.call(obj),
    );

    return objType ? objType[1].toLowerCase() : "";
  }

  return objType;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const isFunction = <T extends Function>(obj: unknown): obj is T =>
  type(obj) === "function";
