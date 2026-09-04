import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/components/layout/AdminHeader.tsx'), 'utf8');

test('admin mobile header exposes the theme switcher', () => {
    assert.match(source, /data-admin-mobile-theme-switcher/);
    assert.doesNotMatch(source, /<div className="hidden sm:block"><ThemeSwitcher \/><\/div>/);
});

test('admin search icon yields its mobile slot to the theme switcher', () => {
    assert.match(source, /aria-label="Open admin search"[\s\S]*?className="hidden[^\"]*sm:inline-flex[^\"]*md:hidden"/);
});
