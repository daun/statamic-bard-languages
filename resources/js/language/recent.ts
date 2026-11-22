const KEY = 'statamic.bard-languages.recent';
const LIMIT = 5;

/** Language codes the editor picked recently, newest first. Kept in localStorage, which may be unavailable. */
export function recentLanguages(): string[] {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? [];
    } catch {
        return [];
    }
}

export function rememberLanguage(code: string): void {
    try {
        const recent = [code, ...recentLanguages().filter((c) => c !== code)].slice(0, LIMIT);
        localStorage.setItem(KEY, JSON.stringify(recent));
    } catch {}
}
