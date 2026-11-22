import * as core from '@tiptap/core';
import * as model from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { createLanguageSection, createLanguageSpan, type Tiptap } from '../../resources/js/tiptap/extensions';
import { createLanguages, type LanguagesConfig } from '../../resources/js/language/languages';

const tiptap: Tiptap = { core, pm: { model } };

// Bard's document: top-level blocks or `root` nodes like sets and language sections.
const Document = core.Node.create({ name: 'doc', topNode: true, content: '(block | root)+' });

export function createEditor(content: string, config: LanguagesConfig = {}) {
    const languages = createLanguages(config, 'en');
    return new core.Editor({
        content,
        extensions: [
            Document,
            StarterKit.configure({ document: false, undoRedo: false, trailingNode: false }),
            createLanguageSpan(tiptap, languages),
            createLanguageSection(tiptap, languages),
        ],
    });
}

function find(editor: core.Editor, text: string): number {
    let found = -1;
    editor.state.doc.descendants((node, pos) => {
        if (found !== -1 || !node.isText) return;
        const index = node.text!.indexOf(text);
        if (index !== -1) found = pos + index;
    });
    if (found === -1) throw new Error(`Text not found: ${text}`);
    return found;
}

/** Select the first occurrence of `text`. */
export function select(editor: core.Editor, text: string): void {
    const from = find(editor, text);
    editor.commands.setTextSelection({ from, to: from + text.length });
}

/** Place the cursor inside the first occurrence of `text`, after `offset` characters. */
export function cursor(editor: core.Editor, text: string, offset = 1): void {
    editor.commands.setTextSelection(find(editor, text) + offset);
}

/** Editor HTML without the editor-only label attributes. */
export function html(editor: core.Editor): string {
    return editor.getHTML().replace(/ (data-bard-language|title)="[^"]*"/g, '');
}
