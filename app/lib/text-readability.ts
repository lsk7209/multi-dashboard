const MOJIBAKE_PATTERN =
  /(?:\uFFFD|\u5360|\uF9E4|\uF9ED|\u8AED|\uC378|\uC3BE|\uC78A|\uB69C|\uB6B0|\uB5B0|\?\u3145|\?\u3154|\?\u3134|\?\u3137|[\u4E00-\u9FFF][\uAC00-\uD7AF]{1,}|(?:[\u00C0-\u00FF][\u0080-\u00BF\u00C0-\u00FF]){2,}|(?:\u00C3[\u0080-\u00BF]){2,}|(?:[ìíë][\u00A0-\uFFFF]{1,3}){2,})/u;

export function looksGarbledText(text: string): boolean {
  return MOJIBAKE_PATTERN.test(text);
}
