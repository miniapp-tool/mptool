/**
 * 比较版本号
 *
 * 版本号必须由非负整数段组成（如 `1.2.0`）；非数字段会抛出 `TypeError`，避免 `NaN` 比较静默判等。
 *
 * @param versionA 版本号A
 * @param versionB 版本号B
 * @returns 1: versionA > versionB, 0: versionA = versionB, -1: versionA < versionB
 * @throws {TypeError} 版本号包含非数字段
 */
export const compareVersion = (versionA: string, versionB: string): number => {
  const version1 = versionA.split(".");
  const version2 = versionB.split(".");

  if ([...version1, ...version2].some((part) => !/^\d+$/u.test(part)))
    throw new TypeError(`Invalid version: "${version1.join(".")}" / "${version2.join(".")}"`);

  const maxLen = Math.max(version1.length, version2.length);

  while (version1.length < maxLen) version1.push("0");

  while (version2.length < maxLen) version2.push("0");

  for (let i = 0; i < maxLen; i++) {
    const num1 = Math.trunc(Number(version1[i]));
    const num2 = Math.trunc(Number(version2[i]));

    if (num1 > num2) return 1;
    else if (num1 < num2) return -1;
  }

  return 0;
};
