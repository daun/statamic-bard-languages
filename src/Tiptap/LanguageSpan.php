<?php

namespace Daun\StatamicBardLanguages\Tiptap;

use Tiptap\Core\Mark;

/** Inline mark for text in another language, rendered as `<span lang dir>`. */
class LanguageSpan extends Mark
{
    use HasLanguageAttributes;

    /** @var string */
    public static $name = 'languageSpan';

    /** @return array<int, array<string, mixed>> */
    public function parseHTML(): array
    {
        return $this->parseRulesFor('span');
    }

    /**
     * @param  object  $mark
     * @param  array<string, mixed>  $HTMLAttributes
     * @return array{0: string, 1: array<string, mixed>, 2: int}
     */
    public function renderHTML($mark, $HTMLAttributes = []): array
    {
        return ['span', $this->withDirection($HTMLAttributes), 0];
    }
}
