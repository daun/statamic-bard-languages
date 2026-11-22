/// <reference types="vite/client" />

import type { Tiptap } from './tiptap/extensions';

declare global {
    type BardButton = string | { name: string; [key: string]: unknown } | null | undefined;

    const Statamic: {
        booting(callback: () => void): void;
        $config: { get<T = unknown>(key: string): T };
        $bard: {
            addExtension(callback: (context: { tiptap: Tiptap }) => unknown[]): void;
            buttons(
                callback: (buttons: BardButton[], button: (config: Record<string, unknown>) => BardButton) => void,
            ): void;
        };
    };

    function __(key: string, replacements?: Record<string, string>): string;
}

declare module 'vue' {
    interface ComponentCustomProperties {
        __: typeof __;
    }
}
