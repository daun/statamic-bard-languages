<template>
    <Popover align="start" inset class="select-none w-72 rounded-b-lg" v-model:open="open">
        <template #trigger>
            <Button
                class="px-2!"
                :class="{ active, group: variant === 'floating' }"
                :variant="variant === 'floating' ? 'subtle' : 'ghost'"
                size="sm"
                :aria-label="languageButton.text"
                v-tooltip="languageButton.text"
                @mousedown.prevent
            >
                <Icon
                    :name="languageButton.svg"
                    class="size-3.5!"
                    :class="{ 'group-hover:text-white text-yellow-300!': active && variant === 'floating' }"
                />
            </Button>
        </template>
        <div
            v-if="open"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="pickHighlighted"
        >
            <div class="flex items-center border-b border-gray-200 dark:border-gray-600 p-1.5 gap-1.5">
                <Input
                    ref="search"
                    v-model="query"
                    type="text"
                    size="sm"
                    variant="ghost"
                    icon-prepend="magnifying-glass"
                    class="[&_svg]:size-5"
                    :placeholder="target === 'section' ? __('Language of block') : __('Language of selected text')"
                />
                <Button
                    v-if="removable"
                    icon="trash"
                    icon-only
                    size="sm"
                    variant="ghost"
                    :aria-label="removeText"
                    v-tooltip="removeText"
                    @mousedown.prevent
                    @click="remove(removable)"
                />
            </div>
            <div class="max-h-[21rem] overflow-auto p-1.5 st-custom-scrollbar" role="listbox">
                <template v-for="group in groups" :key="group.name">
                    <div
                        v-if="group.name !== 'results'"
                        class="rounded-lg px-2 py-2 text-xs text-gray-400 dark:text-gray-500"
                    >
                        {{ group.name }}
                    </div>
                    <div
                        v-for="language in group.items"
                        :key="`${group.name}-${language.code}`"
                        :id="`${uid}-${language.code}`"
                        role="option"
                        :aria-selected="isCurrent(language)"
                        class="w-full flex items-center gap-2 relative select-none cursor-pointer text-sm overflow-hidden py-1.5 px-2 antialiased rounded-lg"
                        :class="
                            isCurrent(language)
                                ? 'bg-blue-50 dark:bg-blue-600 text-blue-600! dark:text-blue-50!'
                                : language.code === highlighted
                                  ? 'text-gray-900 dark:text-gray-300 bg-gray-100 dark:bg-gray-700'
                                  : 'text-gray-900 dark:text-gray-300'
                        "
                        @mousedown.prevent
                        @mouseover="highlighted = language.code"
                        @click="pick(language)"
                    >
                        <span class="truncate">{{ language.label }}</span>
                        <bdi v-if="language.native" :dir="language.dir" class="truncate opacity-50">{{
                            language.native
                        }}</bdi>
                        <span class="ms-auto text-xs opacity-50">{{ language.code }}</span>
                    </div>
                </template>
                <div v-if="!groups.length" class="p-3 text-center text-xs text-gray-600">{{ __('No results') }}</div>
            </div>
        </div>
    </Popover>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { Editor } from '@tiptap/core';
import { Button, Icon, Input, Popover } from '@statamic/cms/ui';
import { ToolbarButtonMixin } from '@statamic/cms/bard';
import { currentLanguages, languageTarget, type LanguageAttributes, type LanguageTarget } from '../tiptap/extensions';
import type { Language, Languages } from '../language/languages';
import { detectLanguages } from '../language/detect';
import { recentLanguages, rememberLanguage } from '../language/recent';

interface LanguageButtonConfig {
    text: string;
    svg: string;
    languages: Languages;
    command: (editor: Editor, attrs: LanguageAttributes) => void;
}

let uid = 0;

export default defineComponent({
    mixins: [ToolbarButtonMixin],

    components: { Button, Icon, Input, Popover },

    data() {
        return {
            uid: `bard-language-${uid++}`,
            open: false,
            query: '',
            target: 'span' as LanguageTarget,
            current: { span: null, section: null } as Record<LanguageTarget, string | null>,
            suggested: [] as Language[],
            highlighted: null as string | null,
        };
    },

    computed: {
        // `button` with the options addon.ts registers; `config` is taken by the mixin.
        languageButton(): LanguageButtonConfig {
            return this.button as unknown as LanguageButtonConfig;
        },

        tiptap(): Editor {
            return this.editor as Editor;
        },

        languages(): Languages {
            return this.languageButton.languages;
        },

        // The innermost language goes first: a marked word before the section around it.
        removable(): LanguageTarget | null {
            return this.current.span ? 'span' : this.current.section ? 'section' : null;
        },

        removeText(): string {
            const label = this.languages.label(this.current[this.removable ?? 'span'] ?? '');
            return this.removable === 'section'
                ? __('Remove :language from block', { language: label })
                : __('Remove :language from text', { language: label });
        },

        groups(): { name: string; items: Language[] }[] {
            if (this.query.trim()) {
                return [{ name: 'results', items: this.languages.search(this.query).slice(0, 50) }].filter(
                    (group) => group.items.length,
                );
            }
            return [
                { name: __('Suggested'), items: this.suggested },
                { name: __('All languages'), items: this.languages.all() },
            ].filter((group) => group.items.length);
        },

        options(): Language[] {
            return this.groups.flatMap((group) => group.items);
        },
    },

    watch: {
        open(open: boolean) {
            if (!open) return;
            this.query = '';
            this.update();
            this.target = languageTarget(this.tiptap.state);
            this.suggest();
            this.$nextTick(() =>
                (this.$refs.search as { $el?: HTMLElement } | undefined)?.$el?.querySelector('input')?.focus(),
            );
        },

        options(options: Language[]) {
            this.highlight(options[0] ?? null);
        },
    },

    created() {
        this.update();
        this.tiptap.on('transaction', this.update);
    },

    beforeUnmount() {
        this.tiptap.off('transaction', this.update);
    },

    methods: {
        isCurrent(language: Language): boolean {
            return language.code === this.current[this.target];
        },

        update() {
            this.current = currentLanguages(this.tiptap.state);
        },

        /** The selected text, or the whole block for a bare cursor. */
        selectedText(): string {
            const { state } = this.tiptap;
            const { from, to, empty, $from } = state.selection;
            return empty ? $from.parent.textContent : state.doc.textBetween(from, to, ' ', ' ');
        },

        async suggest() {
            const text = this.selectedText();
            const codes = (list: Language[]) => list.map((language) => language.code);
            const byScript = this.languages.byScript(text);

            // Small script groups (Greek: el, grc, …) are all plausible; for large ones like Latin,
            // only suggest what the editor uses anyway.
            const usual = new Set([...codes(this.languages.pinned), ...recentLanguages()]);
            const scriptCodes =
                byScript.length <= 6 ? codes(byScript) : codes(byScript).filter((code) => usual.has(code));

            const build = (detected: string[] = []) =>
                [...new Set([...detected, ...scriptCodes, ...usual])]
                    .map((code) => this.languages.find(code))
                    .filter((language) => language !== null)
                    .slice(0, 6);

            this.suggested = build();
            const detected = await detectLanguages(text);
            if (detected.length && this.open) this.suggested = build(detected.slice(0, 2));
        },

        highlight(language: Language | null) {
            this.highlighted = language?.code ?? null;
            if (!language) return;
            this.$nextTick(() =>
                document.getElementById(`${this.uid}-${language.code}`)?.scrollIntoView({ block: 'nearest' }),
            );
        },

        move(step: number) {
            const index = this.options.findIndex((language) => language.code === this.highlighted);
            const next = this.options[Math.min(Math.max(index + step, 0), this.options.length - 1)];
            if (next) this.highlight(next);
        },

        pickHighlighted() {
            const language = this.options.find((language) => language.code === this.highlighted);
            if (language) this.pick(language);
        },

        pick(language: Language) {
            rememberLanguage(language.code);
            this.languageButton.command(this.tiptap, { lang: language.code, dir: language.dir });
            this.open = false;
        },

        remove(target: LanguageTarget) {
            this.tiptap.chain().focus().unsetLanguage(target).run();
            this.open = false;
        },
    },
});
</script>
