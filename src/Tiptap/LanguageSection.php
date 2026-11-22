<?php

namespace Daun\StatamicBardLanguages\Tiptap;

use Tiptap\Core\Node;

/** Block node wrapping top-level blocks in another language, rendered as `<div lang dir>`. */
class LanguageSection extends Node
{
    use HasLanguageAttributes;

    /** @var string */
    public static $name = 'languageSection';

    /** @return array<int, array<string, mixed>> */
    public function parseHTML(): array
    {
        return $this->parseRulesFor('div');
    }

    /**
     * @param  object  $node
     * @param  array<string, mixed>  $HTMLAttributes
     * @return array{0: string, 1: array<string, mixed>, 2: int}
     */
    public function renderHTML($node, $HTMLAttributes = []): array
    {
        return ['div', $this->withDirection($HTMLAttributes), 0];
    }
}
