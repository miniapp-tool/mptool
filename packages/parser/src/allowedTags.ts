export type AllowTag =
  | "a"
  | "abbr"
  | "address"
  | "article"
  | "aside"
  | "b"
  | "bdi"
  | "bdo"
  | "blockquote"
  | "br"
  | "caption"
  | "cite"
  | "code"
  | "col"
  | "colgroup"
  | "dd"
  | "del"
  | "div"
  | "dl"
  | "dt"
  | "em"
  | "fieldset"
  | "footer"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "header"
  | "hr"
  | "i"
  | "img"
  | "ins"
  | "label"
  | "legend"
  | "li"
  | "mark"
  | "nav"
  | "ol"
  | "p"
  | "pre"
  | "q"
  | "rt"
  | "ruby"
  | "s"
  | "section"
  | "small"
  | "span"
  | "strong"
  | "sub"
  | "sup"
  | "table"
  | "tbody"
  | "td"
  | "tfoot"
  | "th"
  | "thead"
  | "tr"
  | "tt"
  | "u"
  | "ul";

export const ALLOWED_TAGS: [
  tag: AllowTag | "big" | "center" | "font",
  allowedAttrs?: string[],
][] = [
  ["a"],
  ["abbr"],
  ["address"],
  ["article"],
  ["aside"],
  ["b"],
  ["bdi"],
  ["bdo", ["dir"]],
  ["blockquote"],
  ["br"],
  ["caption"],
  ["cite"],
  ["code"],
  ["col", ["span", "width"]],
  ["colgroup", ["span", "width"]],
  ["dd"],
  ["del"],
  ["div"],
  ["dl"],
  ["dt"],
  ["em"],
  ["fieldset"],
  ["footer"],
  ["h1"],
  ["h2"],
  ["h3"],
  ["h4"],
  ["h5"],
  ["h6"],
  ["header"],
  ["hr"],
  ["i"],
  ["img", ["alt", "src", "height", "width"]],
  ["ins"],
  ["label"],
  ["legend"],
  ["li"],
  ["mark"],
  ["nav"],
  ["ol", ["start", "type"]],
  ["p"],
  ["pre"],
  ["q"],
  ["rt"],
  ["ruby"],
  ["s"],
  ["section"],
  ["small"],
  ["span"],
  ["strong"],
  ["sub"],
  ["sup"],
  ["table", ["width"]],
  ["tbody"],
  ["td", ["colspan", "height", "rowspan", "width"]],
  ["tfoot"],
  ["th", ["colspan", "height", "rowspan", "width"]],
  ["thead"],
  ["tr", ["colspan", "height", "rowspan", "width"]],
  ["tt"],
  ["u"],
  ["ul"],

  // deprecated tags
  ["big"],
  ["center"],
  ["font"],
];
