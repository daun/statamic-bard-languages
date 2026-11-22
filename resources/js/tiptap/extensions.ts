import type * as TiptapCore from '@tiptap/core';
import type * as ProseMirrorModel from '@tiptap/pm/model';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
import type { EditorState, Selection, Transaction } from '@tiptap/pm/state';
import type { Direction, Languages } from '../language/languages';

/** The Tiptap modules Statamic passes to Bard extensions, so the addon uses the same instances. */
export interface Tiptap {
    core: typeof TiptapCore;
    pm: { model: typeof ProseMirrorModel };
}

export interface LanguageAttributes {
    lang: string;
    dir?: Direction;
}

export type LanguageTarget = 'span' | 'section';

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

/** Label for addon.css. Editor only: the frontend renders through the PHP extensions. */
function editorAttributes(languages: Languages, attrs: Record<string, any>) {
    return { 'data-bard-language': attrs.lang ? languages.label(attrs.lang) : null };
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

/** Language of the span at the cursor, or of the first span in the selection. */
function spanLanguage({ selection, schema, doc }: EditorState): string | null {
    const spanType = schema.marks.languageSpan;
    if (!spanType) return null;
    if (selection.empty) return spanType.isInSet(selection.$from.marks())?.attrs.lang ?? null;

    let lang: string | null = null;
    doc.nodesBetween(selection.from, selection.to, (node) => {
        lang ??= spanType.isInSet(node.marks)?.attrs.lang ?? null;
    });
    return lang;
}

/** Languages currently applied at the selection, by target. */
export function currentLanguages(state: EditorState): Record<LanguageTarget, string | null> {
    const sectionType = state.schema.nodes.languageSection;
    const section = sectionType ? (findSection(state.selection.$from, sectionType)?.node.attrs.lang ?? null) : null;
    return { span: spanLanguage(state), section };
}

export function createLanguageSpan({ core }: Tiptap, languages: Languages) {
    const { Mark, mergeAttributes } = core;

    return Mark.create({
        name: 'languageSpan',

        // Above link and text styles, so a span wraps them instead of being split by them.
        priority: 1100,

        inclusive: false,

        addAttributes: () => languageAttributes(languages),

        parseHTML: () => [{ tag: 'span[lang]', getAttrs: acceptKnownLanguages(languages) }],

        renderHTML({ mark, HTMLAttributes }) {
            const attrs = editorAttributes(languages, mark.attrs);
            return ['span', mergeAttributes(HTMLAttributes, attrs, { title: attrs['data-bard-language'] }), 0];
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

export function createLanguageSection({ core, pm }: Tiptap, languages: Languages) {
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
            return ['div', mergeAttributes(HTMLAttributes, editorAttributes(languages, node.attrs)), 0];
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
