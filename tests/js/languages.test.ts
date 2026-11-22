import { describe, expect, it } from 'vitest';
import { createLanguages, directionOf, scriptOf } from '../../resources/js/language/languages';

describe('directionOf', () => {
    it.each([
        ['ar', 'rtl'],
        ['fa', 'rtl'],
        ['he', 'rtl'],
        ['sd', 'rtl'],
        ['az-Arab', 'rtl'],
        ['sd-Deva', 'ltr'],
        ['de', 'ltr'],
        ['ja', 'ltr'],
        ['zh-Hant', 'ltr'],
        ['', 'ltr'],
        [null, 'ltr'],
        ['not a tag', 'ltr'],
    ])('%s is %s', (tag, dir) => {
        expect(directionOf(tag)).toBe(dir);
    });

    it('derives the likely script', () => {
        expect(scriptOf('ar')).toBe('Arab');
        expect(scriptOf('sr-Latn')).toBe('Latn');
        expect(scriptOf(null)).toBeNull();
    });
});

describe('createLanguages', () => {
    const languages = createLanguages({ pinned: ['fr', 'ja'] }, 'en');

    it('lists every language the runtime can name, sorted by label', () => {
        const all = languages.all();
        expect(all.length).toBeGreaterThan(100);
        const labels = all.map((language) => language.label);
        expect(labels).toEqual(labels.toSorted((a, b) => a.localeCompare(b, 'en')));
        expect(all.find((language) => language.code === 'ar')).toMatchObject({
            label: 'Arabic',
            native: 'العربية',
            script: 'Arab',
            dir: 'rtl',
        });
    });

    it('lists only configured languages when restricted', () => {
        const restricted = createLanguages({ languages: ['fr', 'pt-BR'] }, 'en');
        expect(restricted.all().map((language) => language.code)).toEqual(['pt-BR', 'fr']);
        expect(restricted.isKnown('fr-CA')).toBe(true);
        expect(restricted.isKnown('pt')).toBe(false);
        expect(restricted.search('de')).toEqual([]);
    });

    it('accepts any valid tag when unrestricted', () => {
        expect(languages.isKnown('pt-BR')).toBe(true);
        expect(languages.isKnown('x-private')).toBe(false);
        expect(languages.isKnown('')).toBe(false);
        expect(languages.isKnown(null)).toBe(false);
    });

    it('resolves pinned languages', () => {
        expect(languages.pinned.map((language) => language.code)).toEqual(['fr', 'ja']);
    });

    it('names languages in the given locale', () => {
        expect(createLanguages({}, 'de').label('fr')).toBe('Französisch');
        expect(languages.label('qaa')).toBe('qaa');
    });

    describe('search', () => {
        const codes = (query: string) => languages.search(query).map((language) => language.code);

        it('ranks exact codes, then label and native name prefixes', () => {
            expect(codes('ar')[0]).toBe('ar');
            expect(codes('arab')[0]).toBe('ar');
            expect(codes('العر')[0]).toBe('ar');
            expect(codes('Persian')[0]).toBe('fa');
        });

        it('ignores case and diacritics', () => {
            expect(codes('FRANZOSISCH')).toEqual(codes('franzosisch'));
            expect(createLanguages({}, 'de').search('franzosisch')[0]?.code).toBe('fr');
        });

        it('offers regional variants typed as tags', () => {
            expect(codes('pt-BR')[0]).toBe('pt-BR');
        });

        it('does not rank unnamed tags above real languages', () => {
            expect(codes('jap')[0]).toBe('ja');
            expect(codes('german')[0]).toBe('de');
            expect(codes('persian')[0]).toBe('fa');
        });

        it('still offers unnamed tags last', () => {
            expect(codes('german').at(-1)).toBe('german');
            expect(codes('qaa')).toEqual(['qaa']);
        });

        it('lists everything for an empty query', () => {
            expect(languages.search('  ')).toEqual(languages.all());
        });
    });

    describe('byScript', () => {
        it('suggests languages of the dominant script, likeliest first', () => {
            const arabic = languages.byScript('مرحبا بالعالم, hi').map((language) => language.code);
            expect(arabic[0]).toBe('ar');
            expect(arabic).toContain('fa');
            expect(arabic).not.toContain('en');
        });

        it('returns nothing for text without letters', () => {
            expect(languages.byScript('123 !?')).toEqual([]);
        });
    });
});
