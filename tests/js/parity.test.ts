import { describe, expect, it } from 'vitest';
import php from '../../src/Language/Languages.php?raw';
import codes from '../../resources/js/language/codes';
import { RTL_SCRIPTS, scriptOf } from '../../resources/js/language/languages';

function phpList(name: string): string[] {
    const body = php.match(new RegExp(`${name} = \\[([^\\]]*)\\]`))?.[1] ?? '';
    return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]!);
}

// PHP's intl has no likely-subtags API, so the server keeps its own copy of these tables.
describe('PHP direction tables', () => {
    it('list the same right-to-left scripts', () => {
        expect(phpList('RTL_SCRIPTS')).toEqual([...RTL_SCRIPTS]);
    });

    it('list every language whose likely script is right-to-left', () => {
        const rtl = codes.filter((code) => RTL_SCRIPTS.has(scriptOf(code) ?? '')).sort();
        expect(phpList('RTL_LANGUAGES'), 'Update RTL_LANGUAGES in src/Language/Languages.php').toEqual(rtl);
    });
});
