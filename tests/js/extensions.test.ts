import { describe, expect, it } from 'vitest';
import { currentLanguages, languageTarget } from '../../resources/js/tiptap/extensions';
import { createEditor, cursor, html, select } from './editor';

const ar = { lang: 'ar', dir: 'rtl' } as const;
const fa = { lang: 'fa', dir: 'rtl' } as const;

describe('languageTarget', () => {
    it('targets the text when part of a block is selected', () => {
        const editor = createEditor('<p>The word peace.</p>');
        select(editor, 'word');
        expect(languageTarget(editor.state)).toBe('span');
    });

    it('targets a section when whole blocks are selected', () => {
        const editor = createEditor('<p>One</p><p>Two</p>');
        editor.commands.selectAll();
        expect(languageTarget(editor.state)).toBe('section');
    });

    it('targets a section for a plain cursor', () => {
        const editor = createEditor('<p>One</p>');
        cursor(editor, 'One');
        expect(languageTarget(editor.state)).toBe('section');
    });

    it('targets the span for a cursor inside one', () => {
        const editor = createEditor('<p>Say <span lang="ar" dir="rtl">سلام</span> ist</p>');
        cursor(editor, 'سلام', 2);
        expect(languageTarget(editor.state)).toBe('span');
    });
});

describe('setLanguage', () => {
    it('marks selected text with a span', () => {
        const editor = createEditor('<p>The word سلام means peace.</p>');
        select(editor, 'سلام');
        editor.commands.setLanguage(ar);
        expect(html(editor)).toBe('<p>The word <span lang="ar" dir="rtl">سلام</span> means peace.</p>');
    });

    it('wraps whole blocks in a section', () => {
        const editor = createEditor('<p>One</p><p>Two</p>');
        editor.commands.selectAll();
        editor.commands.setLanguage(ar);
        expect(html(editor)).toBe('<div lang="ar" dir="rtl"><p>One</p><p>Two</p></div>');
    });

    it('wraps the whole list for a cursor inside it', () => {
        const editor = createEditor('<p>Intro</p><ul><li><p>One</p></li><li><p>Two</p></li></ul>');
        cursor(editor, 'Two');
        editor.commands.setLanguage(ar);
        expect(html(editor)).toBe(
            '<p>Intro</p><div lang="ar" dir="rtl"><ul><li><p>One</p></li><li><p>Two</p></li></ul></div>',
        );
    });

    it('changes the language of an existing section', () => {
        const editor = createEditor('<div lang="ar" dir="rtl"><p>One</p></div>');
        cursor(editor, 'One');
        editor.commands.setLanguage(fa);
        expect(html(editor)).toBe('<div lang="fa" dir="rtl"><p>One</p></div>');
    });

    it('changes the language of a span the cursor is in', () => {
        const editor = createEditor('<p>Say <span lang="ar" dir="rtl">سلام</span> ist</p>');
        cursor(editor, 'سلام', 2);
        editor.commands.setLanguage(fa);
        expect(html(editor)).toBe('<p>Say <span lang="fa" dir="rtl">سلام</span> ist</p>');
    });

    it('works in a chain, like the toolbar button runs it', () => {
        const editor = createEditor('<p>Say <span lang="ar" dir="rtl">سلام</span> ist</p>');
        cursor(editor, 'سلام', 2);
        editor.chain().focus().setLanguage(fa).run();
        expect(html(editor)).toBe('<p>Say <span lang="fa" dir="rtl">سلام</span> ist</p>');
    });

    it('changes only the selected part of a span', () => {
        const editor = createEditor('<p><span lang="ar" dir="rtl">واحد اثنان</span></p>');
        select(editor, 'اثنان');
        editor.commands.setLanguage(fa);
        expect(html(editor)).toBe(
            '<p><span lang="ar" dir="rtl">واحد </span><span lang="fa" dir="rtl">اثنان</span></p>',
        );
    });

    it('drops spans that repeat the language of a new section', () => {
        const editor = createEditor('<p>Say <span lang="ar" dir="rtl">سلام</span></p>');
        cursor(editor, 'Say');
        editor.commands.setLanguage(ar);
        expect(html(editor)).toBe('<div lang="ar" dir="rtl"><p>Say سلام</p></div>');
    });

    it('keeps spans in another language inside a section', () => {
        const editor = createEditor('<p>Say <span lang="fa" dir="rtl">سلام</span></p>');
        cursor(editor, 'Say');
        editor.commands.setLanguage(ar);
        expect(html(editor)).toBe('<div lang="ar" dir="rtl"><p>Say <span lang="fa" dir="rtl">سلام</span></p></div>');
    });
});

describe('unsetLanguage', () => {
    it('removes a span around the cursor', () => {
        const editor = createEditor('<p>Say <span lang="ar" dir="rtl">سلام</span> ist</p>');
        cursor(editor, 'سلام', 2);
        editor.commands.unsetLanguage('span');
        expect(html(editor)).toBe('<p>Say سلام ist</p>');
    });

    it('unwraps a section', () => {
        const editor = createEditor('<p>Before</p><div lang="ar" dir="rtl"><p>One</p><p>Two</p></div>');
        cursor(editor, 'Two');
        editor.commands.unsetLanguage('section');
        expect(html(editor)).toBe('<p>Before</p><p>One</p><p>Two</p>');
    });
});

describe('currentLanguages', () => {
    it('reports the span and the section around the selection', () => {
        const editor = createEditor('<div lang="ar" dir="rtl"><p>Note <span lang="en">word</span></p></div>');
        cursor(editor, 'word', 2);
        expect(currentLanguages(editor.state)).toEqual({ span: 'en', section: 'ar' });
        cursor(editor, 'Note');
        expect(currentLanguages(editor.state)).toEqual({ span: null, section: 'ar' });
    });
});

describe('parsing and rendering', () => {
    it('derives a missing direction', () => {
        const editor = createEditor('<p><span lang="ar">مرحبا</span></p>');
        expect(html(editor)).toBe('<p><span lang="ar" dir="rtl">مرحبا</span></p>');
    });

    it('ignores invalid and unlisted languages', () => {
        const editor = createEditor('<p><span lang="x-private">a</span> <span lang="fr">b</span></p>', {
            languages: ['ar'],
        });
        expect(html(editor)).toBe('<p>a b</p>');
    });

    it('labels languages in the editor', () => {
        const editor = createEditor('<div lang="ar" dir="rtl"><p>Note <span lang="fa">کلمه</span></p></div>');
        expect(editor.getHTML()).toContain('<div lang="ar" dir="rtl" data-bard-language="Arabic">');
        expect(editor.getHTML()).toContain('data-bard-language="Persian" title="Persian"');
    });
});
