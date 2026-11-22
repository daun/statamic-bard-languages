import allCodes from './codes';

export type Direction = 'ltr' | 'rtl';

export interface Language {
    code: string;
    label: string;
    native: string | null;
    script: string | null;
    dir: Direction;
}

export interface LanguagesConfig {
    /** Tags editors can pick from; empty or null means any language the browser can name. */
    languages?: string[] | null;
    /** Tags suggested first. */
    pinned?: string[];
}

export type Languages = ReturnType<typeof createLanguages>;

// ISO 15924 codes of scripts written right-to-left.
export const RTL_SCRIPTS = new Set(
    `
        Adlm Arab Aran Armi Avst Chrs Cprt Elym Hatr Hebr Hung Khar Lydi Mand Mani Mend Merc Mero Narb Nbat Nkoo Orkh
        Ougr Palm Phli Phlp Phnx Prti Rohg Samr Sarb Sogd Sogo Syrc Thaa Yezi
    `
        .trim()
        .split(/\s+/),
);

// Locale script codes `\p{Script=…}` rejects, mapped to the Unicode script they use.
const UNICODE_SCRIPTS: Record<string, string> = { Hans: 'Hani', Hant: 'Hani', Jpan: 'Hani', Kore: 'Hang' };

function parse(tag: string | null | undefined): Intl.Locale | null {
    try {
        return tag ? new Intl.Locale(tag) : null;
    } catch {
        return null;
    }
}

export function scriptOf(tag: string | null | undefined): string | null {
    return parse(tag)?.maximize().script ?? null;
}

function scriptDirection(script: string | null): Direction {
    return RTL_SCRIPTS.has(script ?? '') ? 'rtl' : 'ltr';
}

export function directionOf(tag: string | null | undefined): Direction {
    return scriptDirection(scriptOf(tag));
}

/** Name of a language in itself, like `Deutsch` for `de`. */
function nativeName(tag: string): string | null {
    try {
        return new Intl.DisplayNames([tag], { type: 'language', fallback: 'none' }).of(tag) ?? null;
    } catch {
        return null;
    }
}

/** Lowercase without diacritics, so `fran` finds `Français`. */
const normalize = (value: string | null | undefined): string =>
    (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** How well a language matches a normalized query, best first; null for no match. */
function searchRank(language: Language, query: string): number | null {
    const code = language.code.toLowerCase();
    const label = normalize(language.label);
    const native = normalize(language.native);
    if (code === query) return 0;
    if (label.startsWith(query) || native.startsWith(query)) return 1;
    if (label.split(/[\s(-]+/).some((word) => word.startsWith(query))) return 2;
    if (label.includes(query) || native.includes(query)) return 3;
    return null;
}

/**
 * Languages editors can pick from, labelled in `locale`.
 * Without a `languages` list, that is every language the browser can name: ~150 in Chromium, ~600 in Firefox and Safari.
 */
export function createLanguages({ languages = null, pinned = [] }: LanguagesConfig = {}, locale = 'en') {
    const allowed = Array.isArray(languages) && languages.length > 0 ? languages : null;
    const names = new Intl.DisplayNames([locale, 'en'], { type: 'language', fallback: 'none' });

    const name = (tag: string): string | null => {
        try {
            return names.of(tag) ?? null;
        } catch {
            return null;
        }
    };

    const label = (tag: string): string => name(tag) ?? tag;

    const entry = (code: string): Language => {
        const script = scriptOf(code);
        const text = label(code);
        const native = nativeName(code);
        return { code, label: text, native: native !== text ? native : null, script, dir: scriptDirection(script) };
    };

    const isKnown = (tag: string | null | undefined): boolean => {
        const parsed = parse(tag);
        if (!parsed) return false;
        return !allowed || allowed.includes(tag!) || allowed.includes(parsed.language);
    };

    // Chromium names some related languages identically (ak, fat, tw: "Akan"); keep the shortest code.
    const unique = (entries: Language[]): Language[] => {
        const byLabel = new Map<string, Language>();
        for (const entry of entries) {
            const seen = byLabel.get(entry.label);
            if (!seen || entry.code.length < seen.code.length) byLabel.set(entry.label, entry);
        }
        return [...byLabel.values()];
    };

    let list: Language[] | null = null;
    const all = (): Language[] => {
        if (list) return list;
        list = allowed ? allowed.map(entry) : unique(allCodes.filter(name).map(entry));
        return list.sort((a, b) => a.label.localeCompare(b.label, locale));
    };

    const find = (tag: string): Language | null =>
        all().find((language) => language.code === tag) ?? (isKnown(tag) ? entry(tag) : null);

    function search(query: string): Language[] {
        const q = normalize(query.trim());
        if (!q) return all();

        const results = all()
            .map((language) => ({ language, rank: searchRank(language, q) }))
            .filter(({ rank }) => rank !== null)
            .sort((a, b) => a.rank! - b.rank!)
            .map(({ language }) => language);

        // Without a fixed list, any valid tag works, e.g. regional or script variants. Words like
        // `german` are valid tags too, so tags the browser can't name go last.
        const tag = parse(query.trim())?.toString();
        if (!allowed && tag && !results.some((language) => language.code === tag)) {
            if (name(tag)) results.unshift(entry(tag));
            else results.push(entry(tag));
        }

        return results;
    }

    /** Languages written in the dominant script of the text, the script's likeliest first. */
    function byScript(text: string): Language[] {
        const script = dominantScript(text, new Set(all().map((language) => language.script)));
        if (!script) return [];
        const likeliest = parse(`und-${script}`)?.maximize().language;
        return all()
            .filter((language) => language.script === script)
            .sort((a, b) => Number(b.code === likeliest) - Number(a.code === likeliest));
    }

    return {
        all,
        find,
        isKnown,
        label,
        search,
        byScript,
        direction: directionOf,
        get pinned(): Language[] {
            return pinned.map(find).filter((language) => language !== null);
        },
    };
}

/** The most frequent of `scripts` among the letters of `text`, sampling its first 500 characters. */
function dominantScript(text: string, scripts: Set<string | null>): string | null {
    const tests = [...scripts]
        .filter((script) => script !== null)
        .map((script): [string, RegExp] | null => {
            try {
                return [script, new RegExp(`\\p{Script=${UNICODE_SCRIPTS[script] ?? script}}`, 'u')];
            } catch {
                return null;
            }
        })
        .filter((test) => test !== null);

    const counts = new Map<string, number>();
    for (const char of text.slice(0, 500)) {
        if (!/\p{L}/u.test(char)) continue;
        const match = tests.find(([, regex]) => regex.test(char));
        if (match) counts.set(match[0], (counts.get(match[0]) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
