export interface Encoding {
  name: string;
  labels: string[];
}

export interface EncodingConfig {
  heading: string;
  encodings: Encoding[];
}

/**
 * Encodings table: https://encoding.spec.whatwg.org/encodings.json
 */
export const encodingTable: EncodingConfig[] = [
  {
    encodings: [
      {
        labels: ["unicode-1-1-utf-8", "utf-8", "utf8"],
        name: "UTF-8",
      },
    ],
    heading: "The Encoding",
  },
  {
    encodings: [
      {
        labels: [
          "chinese",
          "csgb2312",
          "csiso58gb231280",
          "gb2312",
          "gb_2312",
          "gb_2312-80",
          "gbk",
          "iso-ir-58",
          "x-gbk",
        ],
        name: "GBK",
      },
      {
        labels: ["gb18030"],
        name: "gb18030",
      },
    ],
    heading: "Legacy multi-byte Chinese (simplified) encodings",
  },
];

// Label to encoding registry.
export const labelToEncoding = Object.fromEntries(
  encodingTable
    .map((category) =>
      category.encodings.map((encoding) =>
        encoding.labels.map<[string, Encoding]>((label) => [label, encoding]),
      ),
    )
    .flat(
      // encoding is at depth 2
      2,
    ),
);

/**
 * @param label The encoding label.
 *
 * @returns The encoding corresponding to the given label, or `null` if not found.
 */
export const getEncoding = (label: string): Encoding | null =>
  labelToEncoding[label.trim().toLowerCase()] ?? null;
