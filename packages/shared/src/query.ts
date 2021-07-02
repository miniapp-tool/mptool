/**
 * 字符串参数解析
 *
 * @param queryString 需要解析的字符串
 * @param [spliter='&'] 分隔符
 *
 * @returns 参数对象
 */
export const parse = (
  queryString = "",
  spliter = "&"
): Record<string, string> => {
  /** 参数对象 */
  const queries: Record<string, string> = {};
  const splits = queryString ? queryString.split(spliter) : undefined;

  if (splits && splits.length > 0)
    splits.forEach((item) => {
      const [key, value] = item.split("=");

      queries[key] = value;
    });

  return queries;
};

/**
 * query 对象转换字符串
 *
 * @param params query 对象
 * @param [spliter='&] 分隔符
 * @param [unencoded=false] 是否已经解码
 *
 * @returns 解析的字符串
 */
export const stringify = (
  params: Record<string, string> = {},
  spliter = "&",
  unencoded = false
): string =>
  Object.keys(params)
    .map((key) => {
      const value = params[key];

      return `${key}=${unencoded ? value : encodeURIComponent(value)}`;
    })
    .join(spliter);

/**
 * URL 添加 query
 *
 * @param path 前部分路径
 * @param queries query对象
 * @param unencoded 是否已经解码，默认为否
 *
 * @returns 处理过的 url
 */
export const join = (
  path: string,
  queries: Record<string, string>,
  unencoded = false
): string => {
  const queryString = stringify(queries, "&", unencoded);

  return queryString
    ? `${path}${
        /[?&]$/u.test(path) ? "" : path.indexOf("?") === -1 ? "?" : "&"
      }${queryString}`
    : path;
};
