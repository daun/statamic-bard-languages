import { registerIconSet } from '@statamic/cms/ui';
import LanguageButton from './components/LanguageButton.vue';
import { createLanguageSection, createLanguageSpan, type LanguageAttributes } from './tiptap/extensions';
import { createLanguages, type LanguagesConfig } from './language/languages';
import type { Editor } from '@tiptap/core';

registerIconSet('bard-languages', import.meta.glob('../svg/icons/*.svg', { query: '?raw', import: 'default' }));

Statamic.booting(() => {
    const languages = createLanguages(
        Statamic.$config.get<LanguagesConfig>('bardLanguages'),
        Statamic.$config.get<string>('locale'),
    );

    Statamic.$bard.addExtension(({ tiptap }) => [
        createLanguageSpan(tiptap, languages),
        createLanguageSection(tiptap, languages),
    ]);

    Statamic.$bard.buttons((buttons, button) => {
        const languageButton = button({
            name: 'language',
            text: __('Language'),
            svg: 'bard-languages::language',
            component: LanguageButton,
            languages,
            active: (editor: Editor) => editor.isActive('languageSpan') || editor.isActive('languageSection'),
            command: (editor: Editor, attrs: LanguageAttributes) => editor.chain().focus().setLanguage(attrs).run(),
        });

        buttons.splice(buttonIndex(buttons), 0, languageButton);
    });
});

/**
 * Where to insert the language button: in a Bard field, the slot of `language` in the configured
 * buttons, which Bard would otherwise drop and append to the end; in the button settings, after quote.
 */
function buttonIndex(buttons: BardButton[]): number {
    const configured = buttons.indexOf('language');
    if (configured !== -1) return configured;
    const quote = buttons.findIndex((b) => typeof b === 'object' && b?.name === 'quote');
    return quote !== -1 ? quote + 1 : buttons.length;
}
