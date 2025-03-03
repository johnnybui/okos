import { format, formatISO } from 'date-fns';

// Headings H1-H6.
const h1 = /(^|\n) {0,3}#{1,6} {1,8}[^\n]{1,64}\r?\n\r?\n\s{0,32}\S/;

// Bold, italic, underline, strikethrough, highlight.
const bold = /(?:\s|^)(_|__|\*|\*\*|~~|==|\+\+)(?!\s).{1,64}(?<!\s)(?=\1)/;

// Basic inline link (also captures images).
const link = /\[[^\]]{1,128}\]\(https?:\/\/\S{1,999}\)/;

// Inline code.
const code = /(?:\s|^)`(?!\s)[^`]{1,48}(?<!\s)`([^\w]|$)/;

// Unordered list.
const ul = /(?:^|\n)\s{0,5}\-\s{1}[^\n]+\n\s{0,15}\-\s/;

// Ordered list.
const ol = /(?:^|\n)\s{0,5}\d+\.\s{1}[^\n]+\n\s{0,15}\d+\.\s/;

// Horizontal rule.
const hr = /\n{2} {0,3}\-{2,48}\n{2}/;

// Fenced code block.
const fences = /(?:\n|^)(```|~~~|\$\$)(?!`|~)[^\s]{0,64} {0,64}[^\n]{0,64}\n[\s\S]{0,9999}?\s*\1 {0,64}(?:\n+|$)/;

// Classical underlined H1 and H2 headings.
const title = /(?:\n|^)(?!\s)\w[^\n]{0,64}\r?\n(\-|=)\1{0,64}\n\n\s{0,64}(\w|$)/;

// Blockquote.
const blockquote = /(?:^|(\r?\n\r?\n))( {0,3}>[^\n]{1,333}\n){1,999}($|(\r?\n))/;

/**
 * Returns `true` if the source text might be a markdown document.
 *
 * @param src Source text to analyze.
 */
export const isMarkdown = (src: string): boolean =>
  h1.test(src) ||
  bold.test(src) ||
  link.test(src) ||
  code.test(src) ||
  ul.test(src) ||
  ol.test(src) ||
  hr.test(src) ||
  fences.test(src) ||
  title.test(src) ||
  blockquote.test(src);

export function pickRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function formatLocaleDateTime(date: Date) {
  // Format the date part as "Mon, 03-Mar-2025"
  const datePart = format(date, 'EEE, dd-MMM-yyyy');
  
  // Format the time part as "7:08:16 AM"
  const timePart = format(date, 'h:mm:ss a');
  
  // Get the timezone offset (e.g., "GMT+7")
  const timeZoneOffset = formatISO(date).slice(-6);
  const offsetHours = parseInt(timeZoneOffset.substring(1, 3));
  const formattedOffset = timeZoneOffset.startsWith('+') 
    ? `GMT+${offsetHours}` 
    : `GMT-${offsetHours}`;
  
  // Combine all parts
  return `${datePart} at ${timePart} ${formattedOffset}`;
}
