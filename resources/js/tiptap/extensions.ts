import type * as TiptapCore from '@tiptap/core';
import type * as ProseMirrorModel from '@tiptap/pm/model';
import type { MarkType, Node as ProseMirrorNode, NodeType, ResolvedPos } from '@tiptap/pm/model';
import type * as ProseMirrorState from '@tiptap/pm/state';
import type { EditorState, Selection, Transaction } from '@tiptap/pm/state';
import type * as ProseMirrorView from '@tiptap/pm/view';
import type { Decoration } from '@tiptap/pm/view';
import type { Direction, Languages } from '../language/languages';

/** The Tiptap modules Statamic passes to Bard extensions, so the addon uses the same instances. */
export interface Tiptap {
    core: typeof TiptapCore;
    pm: { model: typeof ProseMirrorModel; state: typeof ProseMirrorState; view: typeof ProseMirrorView };
}

export interface LanguageAttributes {
    lang: string;
    dir?: Direction;
}

export type LanguageTarget = 'span' | 'section';

/** How marked content looks in the editor, from the `editor` config. */
export interface EditorDisplay {
    style: 'line' | 'outline' | 'tag' | null;
    showCodes: boolean;
}

export const defaultDisplay: EditorDisplay = { style: 'line', showCodes: true };

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        languageSpan: {
            setLanguageSpan: (attrs: LanguageAttributes) => ReturnType;
            unsetLanguageSpan: () => ReturnType;
        };
        languageSection: {
            setLanguageSection: (attrs: LanguageAttributes) => ReturnType;
            unsetLanguageSection: () => ReturnType;
            setLanguage: (attrs: LanguageAttributes) => ReturnType;
            unsetLanguage: (target: LanguageTarget) => ReturnType;
        };
    }
}

function languageAttributes(languages: Languages) {
    return {
        lang: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('lang') || null,
        },
        dir: {
            default: null,
            parseHTML: (element: HTMLElement) =>
                element.getAttribute('dir') || languages.direction(element.getAttribute('lang')),
        },
    };
}

/** Short code shown in the editor: the primary subtag, `de` for `de-AT`. */
const languageCode = (lang: string): string => lang.split('-')[0]!;

/** Label, style, and short code for addon.css. Editor only: the frontend renders through the PHP extensions. */
function editorAttributes(languages: Languages, display: EditorDisplay, attrs: Record<string, any>) {
    return {
        'data-bard-language': attrs.lang ? languages.label(attrs.lang) : null,
        'data-bard-language-style': attrs.lang ? display.style : null,
        'data-bard-language-code': attrs.lang && display.showCodes ? languageCode(attrs.lang) : null,
    };
}

function codeElement(code: string, before: boolean): HTMLElement {
    const element = document.createElement('span');
    element.className = before ? 'bard-language-code bard-language-code--before' : 'bard-language-code';
    element.textContent = code;
    element.setAttribute('aria-hidden', 'true');
    return element;
}

/**
 * Language codes next to spans, as widgets: inside the span they would be underlined with it.
 * The code goes on the span's end in its own direction, so on the left of RTL spans in LTR text.
 */
function spanCodes({ state, view }: Tiptap['pm'], spanType: MarkType, sectionType: NodeType | undefined) {
    const build = (doc: ProseMirrorNode) => {
        const widgets: Decoration[] = [];
        doc.descendants((block, pos) => {
            if (!block.isTextblock) return true;

            const section = sectionType && findSection(doc.resolve(pos), sectionType);
            const direction = section?.node.attrs.dir ?? 'ltr';
            const ranges: { mark: ProseMirrorModel.Mark; from: number; to: number }[] = [];
            block.forEach((child, offset) => {
                const mark = spanType.isInSet(child.marks);
                const from = pos + 1 + offset;
                const last = ranges.at(-1);
                if (mark && last?.to === from && last.mark.eq(mark)) last.to = from + child.nodeSize;
                else if (mark) ranges.push({ mark, from, to: from + child.nodeSize });
            });

            for (const { mark, from, to } of ranges) {
                const code = languageCode(mark.attrs.lang);
                const before = (mark.attrs.dir ?? 'ltr') !== direction;
                widgets.push(
                    view.Decoration.widget(before ? from : to, () => codeElement(code, before), {
                        side: before ? 1 : -1,
                        marks: [],
                        key: `${code}:${before}`,
                        ignoreSelection: true,
                    }),
                );
            }
            return false;
        });
        return view.DecorationSet.create(doc, widgets);
    };

    return new state.Plugin({
        key: new state.PluginKey('languageSpanCodes'),
        state: {
            init: (_, { doc }) => build(doc),
            apply: (tr, codes) => (tr.docChanged ? build(tr.doc) : codes),
        },
        props: {
            decorations(editorState) {
                return this.getState(editorState);
            },
        },
    });
}

/** `getAttrs` accepting elements with a known `lang`: null accepts the element, false rejects it. */
function acceptKnownLanguages(languages: Languages) {
    return (element: HTMLElement) => (languages.isKnown(element.getAttribute('lang')) ? null : false);
}

/** Drop spans that repeat the language of the section around them. */
function removeRedundantSpans(tr: Transaction, from: number, to: number, lang: string): void {
    const spanType = tr.doc.type.schema.marks.languageSpan;
    if (!spanType) return;
    tr.doc.nodesBetween(from, to, (node, pos) => {
        const mark = spanType.isInSet(node.marks);
        if (mark?.attrs.lang === lang) tr.removeMark(pos, pos + node.nodeSize, mark);
    });
}

/** Range of the top-level blocks the selection touches, which sections wrap. */
function topLevelRange({ $from, $to }: Selection) {
    return $from.blockRange($to, (node: ProseMirrorNode) => node.type === $from.doc.type);
}

function findSection($pos: ResolvedPos, type: ProseMirrorModel.NodeType) {
    for (let depth = $pos.depth; depth > 0; depth--) {
        const node = $pos.node(depth);
        if (node.type === type) {
            return { node, depth, pos: $pos.before(depth) };
        }
    }
    return null;
}

/**
 * Whether a language picked now applies to the selected text (`span`) or wraps the
 * top-level blocks (`section`). Sections are used when whole blocks are selected, or when
 * the cursor sits in a block without selecting anything.
 */
export function languageTarget(state: EditorState): LanguageTarget {
    const { selection, doc, schema } = state;
    const spanType = schema.marks.languageSpan;

    if (selection.empty) {
        const inSpan = spanType?.isInSet(selection.$from.marks());
        return inSpan ? 'span' : 'section';
    }

    const range = topLevelRange(selection);
    if (!range) return 'span';

    const before = doc.textBetween(range.start, selection.from, ' ', ' ');
    const after = doc.textBetween(selection.to, range.end, ' ', ' ');
    return before.trim() || after.trim() ? 'span' : 'section';
}

/** Languages of the span at the cursor, or of all spans in the selection, in order of appearance. */
export function spanLanguages({ selection, schema, doc }: EditorState): string[] {
    const spanType = schema.marks.languageSpan;
    if (!spanType) return [];
    if (selection.empty) {
        const lang = spanType.isInSet(selection.$from.marks())?.attrs.lang;
        return lang ? [lang] : [];
    }

    const langs = new Set<string>();
    doc.nodesBetween(selection.from, selection.to, (node) => {
        const lang = spanType.isInSet(node.marks)?.attrs.lang;
        if (lang) langs.add(lang);
    });
    return [...langs];
}

/** Languages currently applied at the selection, by target: the first span's for spans. */
export function currentLanguages(state: EditorState): Record<LanguageTarget, string | null> {
    const sectionType = state.schema.nodes.languageSection;
    const section = sectionType ? (findSection(state.selection.$from, sectionType)?.node.attrs.lang ?? null) : null;
    return { span: spanLanguages(state)[0] ?? null, section };
}

export interface SelectionLanguages {
    /** Languages in the selection; the first is the one the remove button takes off. */
    languages: string[];
    /** The ones picking a language replaces. */
    current: string[];
    /** Whether all of the selection is in one language: the cursor's, a whole span's, or a block's. */
    single: boolean;
}

/** Languages the picker shows for the selection: spans first, then the blocks around them. */
export function selectionLanguages(state: EditorState): SelectionLanguages {
    const { selection, schema, doc } = state;
    const spanType = schema.marks.languageSpan;
    const sectionType = schema.nodes.languageSection;
    const sectionAt = (pos: number): string | null =>
        (sectionType && findSection(doc.resolve(pos), sectionType)?.node.attrs.lang) ?? null;
    const section = sectionAt(selection.from);

    if (selection.empty) {
        const lang = spanType?.isInSet(selection.$from.marks())?.attrs.lang ?? section;
        return { languages: lang ? [lang] : [], current: lang ? [lang] : [], single: true };
    }

    const spans = new Set<string>();
    const inherited = new Set<string>();
    let bare = false;
    doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (!node.isText) return;
        const lang = spanType?.isInSet(node.marks)?.attrs.lang;
        if (lang) return void spans.add(lang);

        const text = node.text!.slice(Math.max(selection.from - pos, 0), selection.to - pos);
        if (!text.trim()) return;
        const around = sectionAt(pos);
        if (around) inherited.add(around);
        else bare = true;
    });

    let languages: string[];
    let current: string[];
    if (languageTarget(state) === 'section') {
        languages = [...new Set([...(section ? [section] : []), ...spans])];
        current = section ? [section] : [];
    } else {
        languages = [...new Set([...spans, ...inherited])];
        current = languages;
    }
    return { languages, current, single: languages.length === 1 && !bare };
}

/** What the remove button takes off: the language the picker targets, else the other one. */
export function removableTarget(
    target: LanguageTarget,
    current: Record<LanguageTarget, string | null>,
): LanguageTarget | null {
    const other = target === 'section' ? 'span' : 'section';
    return current[target] ? target : current[other] ? other : null;
}

export function createLanguageSpan({ core, pm }: Tiptap, languages: Languages, display = defaultDisplay) {
    const { Mark, mergeAttributes } = core;

    return Mark.create({
        name: 'languageSpan',

        // Above link and text styles, so a span wraps them instead of being split by them.
        priority: 1100,

        inclusive: false,

        addAttributes: () => languageAttributes(languages),

        parseHTML: () => [{ tag: 'span[lang]', getAttrs: acceptKnownLanguages(languages) }],

        renderHTML({ mark, HTMLAttributes }) {
            const attrs = editorAttributes(languages, display, mark.attrs);
            return ['span', mergeAttributes(HTMLAttributes, attrs, { title: attrs['data-bard-language'] }), 0];
        },

        addProseMirrorPlugins() {
            const widgets = display.showCodes && display.style === 'line';
            return widgets ? [spanCodes(pm, this.type, this.editor.schema.nodes.languageSection)] : [];
        },

        addCommands() {
            return {
                setLanguageSpan:
                    (attrs) =>
                    ({ tr, commands }) => {
                        // A bare cursor would only set the mark for text typed next.
                        if (tr.selection.empty) commands.extendMarkRange(this.name);
                        return commands.setMark(this.name, attrs);
                    },
                unsetLanguageSpan:
                    () =>
                    ({ commands }) =>
                        commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
            };
        },
    });
}

export function createLanguageSection({ core, pm }: Tiptap, languages: Languages, display = defaultDisplay) {
    const { Node, mergeAttributes } = core;
    const { Fragment } = pm.model;

    return Node.create({
        name: 'languageSection',

        // Same group as Bard sets: allowed at the top level of the document only.
        group: 'root',

        content: 'block+',

        defining: true,

        addAttributes: () => languageAttributes(languages),

        parseHTML: () => [{ tag: 'div[lang]', getAttrs: acceptKnownLanguages(languages) }],

        renderHTML({ node, HTMLAttributes }) {
            return ['div', mergeAttributes(HTMLAttributes, editorAttributes(languages, display, node.attrs)), 0];
        },

        addCommands() {
            return {
                setLanguageSection:
                    (attrs) =>
                    ({ tr, dispatch }) => {
                        const section = findSection(tr.selection.$from, this.type);

                        if (section) {
                            if (dispatch) {
                                tr.setNodeMarkup(section.pos, undefined, { ...section.node.attrs, ...attrs });
                                removeRedundantSpans(tr, section.pos, section.pos + section.node.nodeSize, attrs.lang);
                            }
                            return true;
                        }

                        // Wrap whole top-level blocks, so a cursor inside a list or table wraps the list or table.
                        const range = topLevelRange(tr.selection);
                        if (!range) return false;

                        const children: ProseMirrorNode[] = [];
                        for (let i = range.startIndex; i < range.endIndex; i++) children.push(range.parent.child(i));

                        const fits =
                            range.parent.canReplaceWith(range.startIndex, range.endIndex, this.type) &&
                            this.type.validContent(Fragment.fromArray(children));
                        if (!fits) return false;

                        if (dispatch) {
                            tr.wrap(range, [{ type: this.type, attrs }]).scrollIntoView();
                            // The wrapper adds an opening and a closing token.
                            removeRedundantSpans(tr, range.start, range.end + 2, attrs.lang);
                        }
                        return true;
                    },
                unsetLanguageSection:
                    () =>
                    ({ tr, dispatch }) => {
                        const section = findSection(tr.selection.$from, this.type);
                        if (!section) return false;

                        const start = section.pos + 1;
                        const end = section.pos + section.node.nodeSize - 1;
                        const range = tr.doc.resolve(start).blockRange(tr.doc.resolve(end));
                        if (!range) return false;

                        if (dispatch) tr.lift(range, range.depth - 1);
                        return true;
                    },
                setLanguage:
                    (attrs) =>
                    ({ state, commands }) =>
                        (languageTarget(state) === 'section' && commands.setLanguageSection(attrs)) ||
                        commands.setLanguageSpan(attrs),
                unsetLanguage:
                    (target) =>
                    ({ commands }) =>
                        target === 'section' ? commands.unsetLanguageSection() : commands.unsetLanguageSpan(),
            };
        },
    });
}
