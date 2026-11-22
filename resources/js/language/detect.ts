interface LanguageDetectorInstance {
    detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]>;
}

// Chrome's built-in AI API, not yet in TypeScript's DOM types.
declare const LanguageDetector: {
    availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
    create(): Promise<LanguageDetectorInstance>;
};

let detector: LanguageDetectorInstance | null = null;

/**
 * Ranked language codes from Chrome's built-in LanguageDetector, if it is available and
 * its model is already downloaded. Unreliable for single words, so short text is skipped.
 */
export async function detectLanguages(text: string, { minLength = 20, minConfidence = 0.2 } = {}): Promise<string[]> {
    if (!('LanguageDetector' in globalThis) || text.trim().length < minLength) return [];

    try {
        if (!detector) {
            if ((await LanguageDetector.availability()) !== 'available') return [];
            detector = await LanguageDetector.create();
        }
        const results = await detector.detect(text);
        return results
            .filter(({ detectedLanguage, confidence }) => detectedLanguage !== 'und' && confidence >= minConfidence)
            .map(({ detectedLanguage }) => detectedLanguage);
    } catch {
        return [];
    }
}
