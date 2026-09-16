import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getFontStylesheetHrefs, getLocaleFont } from './registry';

const FONTS_DIR = fileURLToPath(new URL('../../../public/fonts/', import.meta.url));

/** Every href returned must point at a `result.css` that actually exists. */
function assertHrefsExist(hrefs: string[]) {
  for (const href of hrefs) {
    assert.ok(existsSync(`${FONTS_DIR}${href.replace('/fonts/', '')}`), `missing stylesheet: ${href}`);
  }
}

test('resolves the registered locale font', () => {
  assert.deepEqual(getLocaleFont('zh', 'zh'), { family: '寒蝉全圆体', directory: 'ChillRoundFRegular' });
});

test('falls back to the default locale font for an unregistered locale', () => {
  assert.deepEqual(getLocaleFont('ja', 'zh'), { family: '寒蝉全圆体', directory: 'ChillRoundFRegular' });
});

test('returns undefined when neither the locale nor the default is registered', () => {
  assert.equal(getLocaleFont('de', 'fr'), undefined);
});

test('emits one stylesheet per weight, regular before bold', () => {
  assert.deepEqual(getFontStylesheetHrefs('zh', 'zh'), [
    '/fonts/ChillRoundFRegular/result.css',
    '/fonts/ChillRoundFBold/result.css',
  ]);
});

test('derives the bold family directory from the regular one', () => {
  const hrefs = getFontStylesheetHrefs('zh', 'zh');
  assert.ok(
    hrefs.some((href) => href === '/fonts/ChillRoundFBold/result.css'),
    'bold family dir must be derived',
  );
});

test('returns no hrefs rather than a dangling link when no font is registered', () => {
  assert.deepEqual(getFontStylesheetHrefs('de', 'fr'), []);
});

test('every emitted href exists under public/fonts/', () => {
  assertHrefsExist(getFontStylesheetHrefs('zh', 'zh'));
  assertHrefsExist(getFontStylesheetHrefs('ja', 'zh'));
});

test('no stylesheet is emitted for a family that does not ship', () => {
  for (const href of getFontStylesheetHrefs('zh', 'zh')) {
    assert.ok(!href.includes('GenJyuuGothic'), `Japanese family must not be referenced: ${href}`);
  }
});
