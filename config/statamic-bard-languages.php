<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Available languages
    |--------------------------------------------------------------------------
    |
    | Language codes editors can pick from, like ['en', 'fr', 'pt-BR'].
    | Leave empty to allow every language the browser has a name for.
    |
    | Codes are BCP 47 language tags, the same codes used in HTML's lang
    | attribute: https://www.w3.org/International/articles/language-tags/
    |
    */

    'languages' => [],

    /*
    |--------------------------------------------------------------------------
    | Pinned languages
    |--------------------------------------------------------------------------
    |
    | Language codes suggested first in the language menu, like ['en', 'es'].
    |
    */

    'pinned' => [],

    /*
    |--------------------------------------------------------------------------
    | Editor display
    |--------------------------------------------------------------------------
    |
    | How marked content looks in the Bard editor. It doesn't change the
    | rendered HTML on the frontend.
    |
    | style: 'line' underlines spans and draws a line beside sections,
    |        'outline' draws a thin box around both,
    |        'tag' gives both a subtle background,
    |        null shows no markings.
    | show_codes: show the language code with spans and sections.
    |             Ignored without a style.
    |
    */

    'editor' => [
        'style' => 'line',
        'show_codes' => true,
    ],

];
