<?php

namespace Daun\StatamicBardLanguages\Tiptap;

use Daun\StatamicBardLanguages\Language\Languages;
use DOMElement;

/** Shared `lang` and `dir` handling of the language span and section. */
trait HasLanguageAttributes
{
    /** @return array<string, array<string, mixed>> */
    public function addAttributes(): array
    {
        return [
            'lang' => [
                'parseHTML' => fn (DOMElement $DOMNode) => $DOMNode->getAttribute('lang') ?: null,
            ],
            'dir' => [
                'parseHTML' => fn (DOMElement $DOMNode) => Languages::direction(
                    $DOMNode->getAttribute('lang'),
                    $DOMNode->getAttribute('dir'),
                ),
            ],
        ];
    }

    /**
     * Parse rules for `$tag` elements whose `lang` is a known language.
     * In `getAttrs`, null accepts the element and false rejects it.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function parseRulesFor(string $tag): array
    {
        return [
            [
                'tag' => "{$tag}[lang]",
                'getAttrs' => fn (DOMElement $DOMNode) => app(Languages::class)->isKnown($DOMNode->getAttribute('lang')) ? null : false,
            ],
        ];
    }

    /**
     * Fill in a missing or invalid direction, e.g. for content stored before it was tracked.
     *
     * @param  array<string, mixed>  $HTMLAttributes
     * @return array<string, mixed>
     */
    protected function withDirection(array $HTMLAttributes): array
    {
        if (empty($HTMLAttributes['lang'])) {
            return $HTMLAttributes;
        }

        return [
            ...$HTMLAttributes,
            'dir' => Languages::direction($HTMLAttributes['lang'], $HTMLAttributes['dir'] ?? null),
        ];
    }
}
