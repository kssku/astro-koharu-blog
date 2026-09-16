/**
 * Font Registry — maps locales to their CJK webfont stylesheets.
 *
 * The rounded CJK fonts are shipped as `cn-font-split` subsets: each family
 * directory holds hundreds of `*.woff2` shards plus a `result.css` whose
 * `@font-face` rules carry `unicode-range`, so a browser only downloads the
 * shards a page actually needs.
 *
 * A locale is listed here only when its `public/fonts/<dir>/` directory ships.
 * Locales without an entry fall back to the default locale's family, and a
 * locale with no font at all yields no hrefs rather than a dangling `<link>`.
 * `registry.test.ts` asserts every href resolves to a real `result.css`, so a
 * removed family fails the suite instead of silently 404ing in production.
 *
 * @example
 * ```ts
 * getFontStylesheetHrefs('zh', 'zh')  // => ['/fonts/ChillRoundFRegular/result.css', ...]
 * getFontStylesheetHrefs('ja', 'zh')  // => ['/fonts/ChillRoundFRegular/result.css', ...]
 * ```
 */

/** A locale's rounded CJK font: the CSS `font-family` plus its stylesheet directory. */
interface LocaleFont {
  /** CSS `font-family` name as declared in the family's `result.css`. */
  family: string;
  /** Directory under `public/fonts/` holding `result.css` and the woff2 shards. */
  directory: string;
}

/**
 * Locale → rounded CJK font.
 *
 * Each entry's directory must exist under `public/fonts/`; verify before adding.
 */
const LOCALE_FONTS: Record<string, LocaleFont> = {
  zh: { family: '寒蝉全圆体', directory: 'ChillRoundFRegular' },
};

/** Weights rendered as separate `cn-font-split` families, in load order. */
const FONT_SUFFIXES = ['Regular', 'Bold'] as const;

/**
 * Build the stylesheet hrefs for a single family directory.
 *
 * Bold shards live in a sibling directory suffixed `Bold` (e.g.
 * `ChillRoundFRegular` → `ChillRoundFBold`).
 */
function stylesheetHrefs(directory: string): string[] {
  const base = directory.replace(/(Regular|Bold)$/, '');
  return FONT_SUFFIXES.map((suffix) => `/fonts/${base}${suffix}/result.css`);
}

/**
 * Resolve the rounded CJK font for a locale, falling back to the default locale.
 *
 * @param locale - Locale code, e.g. `'zh'` or `'ja'`.
 * @param defaultLocale - Locale whose font is used when `locale` has none.
 * @returns The font entry, or `undefined` when neither locale is configured.
 */
export function getLocaleFont(locale: string, defaultLocale: string): LocaleFont | undefined {
  return LOCALE_FONTS[locale] ?? LOCALE_FONTS[defaultLocale];
}

/**
 * Stylesheet hrefs to async-load for a locale.
 *
 * @param locale - Locale code, e.g. `'zh'` or `'ja'`.
 * @param defaultLocale - Locale whose font is used when `locale` has none.
 * @returns One href per weight; empty when no font is registered.
 */
export function getFontStylesheetHrefs(locale: string, defaultLocale: string): string[] {
  const font = getLocaleFont(locale, defaultLocale);
  return font ? stylesheetHrefs(font.directory) : [];
}
