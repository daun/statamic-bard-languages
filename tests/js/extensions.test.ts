import { describe, expect, it } from 'vitest';
import {
    currentLanguages,
    languageTarget,
    removableTarget,
    selectionLanguages,
    spanLanguages,
} from '../../resources/js/tiptap/extensions';
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

describe('spanLanguages', () => {
    it('lists each language of the spans in the selection once', () => {
        const editor = createEditor(
            '<p><span lang="it">Ciao</span> e <span lang="fr">salut</span> e <span lang="it">ciao</span></p>',
        );
        editor.commands.selectAll();
        expect(spanLanguages(editor.state)).toEqual(['it', 'fr']);
    });

    it('lists the span at the cursor only', () => {
        const editor = createEditor('<p><span lang="it">Ciao</span> e <span lang="fr">salut</span></p>');
        cursor(editor, 'salut', 2);
        expect(spanLanguages(editor.state)).toEqual(['fr']);
        cursor(editor, ' e ');
        expect(spanLanguages(editor.state)).toEqual([]);
    });
});

describe('selectionLanguages', () => {
    const sentence = '<p>Say <span lang="it">ciao</span> and <span lang="fr">salut</span></p>';
    const inBlock = `<div lang="la">${sentence}</div>`;

    /** Select from the start of `start` to the end of `end`. */
    const around = (editor: ReturnType<typeof createEditor>, start: string, end: string) => {
        select(editor, start);
        const from = editor.state.selection.from;
        select(editor, end);
        editor.commands.setTextSelection({ from, to: editor.state.selection.to });
    };

    it('is the span at the cursor, even inside a block', () => {
        const editor = createEditor(inBlock);
        cursor(editor, 'ciao', 2);
        expect(selectionLanguages(editor.state)).toEqual({ languages: ['it'], current: ['it'], single: true });
    });

    it('is the block for a cursor in its plain text', () => {
        const editor = createEditor(inBlock);
        cursor(editor, 'Say');
        expect(selectionLanguages(editor.state)).toEqual({ languages: ['la'], current: ['la'], single: true });
    });

    it('is a single language for a whole span selected', () => {
        const editor = createEditor(sentence);
        select(editor, 'ciao');
        expect(selectionLanguages(editor.state)).toEqual({ languages: ['it'], current: ['it'], single: true });
    });

    it('is in the selection for text around a span', () => {
        const editor = createEditor(sentence);
        around(editor, 'Say', 'ciao');
        expect(selectionLanguages(editor.state)).toEqual({ languages: ['it'], current: ['it'], single: false });
    });

    it('lists the block after the span for text around a span in a block', () => {
        const editor = createEditor(inBlock);
        around(editor, 'Say', 'ciao');
        expect(selectionLanguages(editor.state)).toEqual({
            languages: ['it', 'la'],
            current: ['it', 'la'],
            single: false,
        });
    });

    it('lists every span across a selection', () => {
        const editor = createEditor(sentence);
        around(editor, 'ciao', 'salut');
        expect(selectionLanguages(editor.state).languages).toEqual(['it', 'fr']);
    });

    it('is the block for its whole text selected', () => {
        const editor = createEditor('<div lang="la"><p>Ave amici</p></div>');
        select(editor, 'Ave amici');
        expect(selectionLanguages(editor.state)).toEqual({ languages: ['la'], current: ['la'], single: true });
    });

    it('lists the spans after a whole block, which the picker changes', () => {
        const editor = createEditor(inBlock);
        around(editor, 'Say', 'salut');
        expect(selectionLanguages(editor.state)).toEqual({
            languages: ['la', 'it', 'fr'],
            current: ['la'],
            single: false,
        });
    });

    it('lists the spans of a whole block without a language, changing none', () => {
        const editor = createEditor(sentence);
        around(editor, 'Say', 'salut');
        expect(selectionLanguages(editor.state)).toEqual({ languages: ['it', 'fr'], current: [], single: false });
    });
});

describe('removableTarget', () => {
    const removable = (editor: ReturnType<typeof createEditor>) =>
        removableTarget(languageTarget(editor.state), currentLanguages(editor.state));

    it('removes the section, keeping its spans, when the whole block is selected', () => {
        const editor = createEditor(
            '<div lang="la"><p><span lang="it">Ciao</span> amici <span lang="fr">mes</span></p></div>',
        );
        // From the start to the end of the paragraph's text, as when selecting it with the mouse.
        editor.commands.setTextSelection({ from: 2, to: 2 + 'Ciao amici mes'.length });
        expect(removable(editor)).toBe('section');
        editor.commands.unsetLanguage('section');
        expect(html(editor)).toBe(
            '<p><span lang="it" dir="ltr">Ciao</span> amici <span lang="fr" dir="ltr">mes</span></p>',
        );
    });

    it('removes the span for a cursor inside one within a section', () => {
        const editor = createEditor('<div lang="la"><p>amici <span lang="it">Ciao</span></p></div>');
        cursor(editor, 'Ciao', 2);
        expect(removable(editor)).toBe('span');
    });

    it('falls back to the section when selected text has no span', () => {
        const editor = createEditor('<div lang="la"><p>amici cari</p></div>');
        select(editor, 'cari');
        expect(removable(editor)).toBe('section');
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
        const editor = createEditor('<div lang="ar" dir="rtl"><p>Note <span lang="fa-AF">کلمه</span></p></div>');
        expect(editor.getHTML()).toContain(
            '<div lang="ar" dir="rtl" data-bard-language="Arabic" data-bard-language-style="line" data-bard-language-code="ar">',
        );
        expect(editor.getHTML()).toContain('data-bard-language-code="fa" title="');
    });

    it('leaves out the style and codes when switched off', () => {
        const editor = createEditor(
            '<div lang="ar" dir="rtl"><p>Note <span lang="fa">کلمه</span></p></div>',
            {},
            { style: null, showCodes: false },
        );
        expect(editor.getHTML()).not.toMatch(/data-bard-language-(style|code)/);
        expect(editor.view.dom.querySelector('.bard-language-code')).toBeNull();
    });

    it('leaves codes of boxed styles to CSS, inside the span', () => {
        const editor = createEditor(
            '<p>Say <span lang="fr">bonjour</span></p>',
            {},
            { style: 'outline', showCodes: true },
        );
        expect(editor.getHTML()).toContain('data-bard-language-style="outline" data-bard-language-code="fr"');
        expect(editor.view.dom.querySelector('.bard-language-code')).toBeNull();
    });
});

describe('language codes', () => {
    const codes = (editor: ReturnType<typeof createEditor>) =>
        [...editor.view.dom.querySelectorAll('.bard-language-code')].map((code) => {
            const span = code.parentElement!.querySelector('span[lang]')!;
            const before = code.compareDocumentPosition(span) & Node.DOCUMENT_POSITION_FOLLOWING;
            return `${code.textContent} ${before ? 'before' : 'after'} ${span.textContent}`;
        });

    it('shows the primary subtag after each span, outside of it', () => {
        const editor = createEditor('<p>Say <span lang="fr-CA">bon<strong>jour</strong></span>.</p>');
        expect(codes(editor)).toEqual(['fr after bonjour']);
        expect(editor.view.dom.querySelector('.bard-language-code')!.closest('span[lang]')).toBeNull();
        expect(editor.getHTML()).not.toContain('class="bard-language-code"');
    });

    it('shows the code on the left of right-to-left spans in left-to-right text', () => {
        const editor = createEditor('<p>Coffee is <span lang="ar">قهوة</span>.</p>');
        expect(codes(editor)).toEqual(['ar before قهوة']);
    });

    it('shows the code after spans in a section of the same direction', () => {
        const editor = createEditor('<div lang="ar"><p>كلمة <span lang="fa">کلمه</span></p></div>');
        expect(codes(editor)).toEqual(['fa after کلمه']);
    });
});
