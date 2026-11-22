<?php

namespace Daun\StatamicBardLanguages\Language;

use Locale;

/** Configured languages and text direction of language tags; mirrors resources/js/language/languages.ts. */
class Languages
{
    /** ISO 15924 codes of scripts written right-to-left. */
    protected const RTL_SCRIPTS = [
        'Adlm', 'Arab', 'Aran', 'Armi', 'Avst', 'Chrs', 'Cprt', 'Elym', 'Hatr', 'Hebr', 'Hung', 'Khar',
        'Lydi', 'Mand', 'Mani', 'Mend', 'Merc', 'Mero', 'Narb', 'Nbat', 'Nkoo', 'Orkh', 'Ougr', 'Palm',
        'Phli', 'Phlp', 'Phnx', 'Prti', 'Rohg', 'Samr', 'Sarb', 'Sogd', 'Sogo', 'Syrc', 'Thaa', 'Yezi',
    ];

    /**
     * Languages whose likely script (CLDR likely subtags) is right-to-left. PHP's intl has no
     * likely-subtags API; regenerate from `new Intl.Locale(code).maximize().script` in JS.
     */
    protected const RTL_LANGUAGES = [
        'ae', 'aeb', 'ar', 'arc', 'arq', 'ars', 'ary', 'arz', 'bal', 'bej', 'bgn', 'bqi', 'brh', 'chg',
        'ckb', 'dv', 'fa', 'gbz', 'glk', 'he', 'jpr', 'jrb', 'khw', 'ks', 'lad', 'lah', 'lrc', 'mde',
        'mid', 'mzn', 'nqo', 'ota', 'pal', 'phn', 'ps', 'rhg', 'sam', 'sd', 'sdh', 'shu', 'sog', 'swb',
        'syc', 'syr', 'trw', 'ug', 'ur', 'yi',
    ];

    /**
     * @param  string[]|null  $languages  Tags editors can pick from; empty means any language.
     * @param  string[]  $pinned  Tags suggested first.
     */
    public function __construct(protected ?array $languages = null, protected array $pinned = []) {}

    /** @return string[]|null */
    public function languages(): ?array
    {
        return $this->languages ? array_values($this->languages) : null;
    }

    /** @return string[] */
    public function pinned(): array
    {
        return array_values($this->pinned);
    }

    /** Whether the tag is well-formed and configured; `fr-CA` counts as configured if `fr` is. */
    public function isKnown(?string $tag): bool
    {
        if (! static::isWellFormed($tag)) {
            return false;
        }

        return ! $this->languages
            || in_array($tag, $this->languages)
            || in_array(static::primary($tag), $this->languages);
    }

    /** Text direction of a language tag, unless a valid direction is given explicitly. */
    public static function direction(?string $tag, ?string $dir = null): string
    {
        $dir = strtolower((string) $dir);
        if (in_array($dir, ['ltr', 'rtl', 'auto'], true)) {
            return $dir;
        }

        $tag = (string) $tag;
        // Only finds explicit script subtags like in `az-Arab`, not the likely script of `ar`.
        $script = class_exists(Locale::class) ? Locale::getScript($tag) : null;

        if ($script) {
            return in_array($script, static::RTL_SCRIPTS) ? 'rtl' : 'ltr';
        }

        return in_array(static::primary($tag), static::RTL_LANGUAGES) ? 'rtl' : 'ltr';
    }

    /** Whether the tag starts with a language subtag of 2–3 or 5–8 letters, like the browser's Intl.Locale accepts. */
    protected static function isWellFormed(?string $tag): bool
    {
        return (bool) preg_match('/^(?:[a-z]{2,3}|[a-z]{5,8})(?:-[a-z0-9]{1,8})*$/i', (string) $tag);
    }

    protected static function primary(?string $tag): ?string
    {
        return preg_match('/^([a-z]{2,3})(?:[-_]|$)/i', (string) $tag, $match) ? strtolower($match[1]) : null;
    }
}
