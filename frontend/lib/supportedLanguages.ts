/**
 * The foreign languages a guide can declare fluency in.
 *
 * Kept as a single flat list so it is trivial to extend — add a string here and
 * it appears in the profile multi-select immediately. Values are stored verbatim
 * as the guide's `languages` array, so existing stored values (which were free
 * text before this list existed) stay compatible: anything already on a profile
 * still renders as a chip even if it is not in this list.
 */
export const SUPPORTED_LANGUAGES = [
  "English",
  "French",
  "German",
  "Spanish",
  "Portuguese",
  "Italian",
  "Dutch",
  "Russian",
  "Ukrainian",
  "Polish",
  "Turkish",
  "Greek",
  "Arabic",
  "Hebrew",
  "Persian (Farsi)",
  "Chinese (Mandarin)",
  "Cantonese",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino (Tagalog)",
  "Sinhala",
  "Burmese",
  "Swahili",
  "Afrikaans",
  "Danish",
  "Swedish",
  "Norwegian",
  "Finnish",
  "Czech",
  "Hungarian",
  "Romanian",
  "Bulgarian",
  "Serbian",
  "Croatian",
  "Slovak",
  "Slovenian",
  "Lithuanian",
  "Latvian",
  "Estonian",
  "Other",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
