# Statamic Bard Languages Documentation

This addon lets editors mark words, sentences, and whole blocks of Bard content as written in another language. It stores a `lang` and `dir` attribute on the content and renders them as plain HTML.

[Usage](#usage) · [Suggestions](#suggestions) · [Configuration](#configuration) · [Text direction](#text-direction) · [Caveats](#caveats)

## Usage

The language button opens a searchable list of languages. Search by name, native name, or code, then pick one. Click the trash icon to remove a language. What a language applies to depends on the selection:

### Spans

**Part of a block selected:** the selected text is wrapped in a `<span>`.

```html
Say
  <span lang="fr" dir="ltr">bonjour</span>
or
  <span lang="ar" dir="rtl">مرحبا</span>.
```

### Blocks

**Whole blocks selected, or just a cursor:** the blocks are wrapped in a `<div>` section. Sections live at the top level of the document, like Bard sets. To switch back to another language for a phrase inside a section, mark it with a span.

```html
<div lang="ja" dir="ltr">
  <p>…</p>
  <ul>…</ul>
</div>
```

![Language section and span in the editor](art/editor.png)

## Suggestions

The menu suggests languages based on:

- **Pinned languages** from the config.
- **Recently used languages** of the current editor.
- **The script of the selected text.** Greek letters suggest Greek and Ancient Greek.
- **Chrome's built-in [language detector](https://developer.chrome.com/docs/ai/language-detection)** for longer text, if its model is already downloaded.

## Configuration

Publish the config file to change the available and pinned languages. Edit `config/statamic-bard-languages.php`.

```sh
php artisan vendor:publish --tag=statamic-bard-languages-config
```

```php
return [
    'languages' => [],  // BCP 47 tags editors can pick from, empty for any language
    'pinned' => [],     // tags suggested first in the menu, like ['en', 'es']
];
```

### Restricting languages

With a `languages` list, editors can only pick those languages, and content in other languages is ignored when parsing HTML. A listed language also allows its regional variants, so `fr` allows `fr-CA`.

### Language names

Language names come from the browser (`Intl.DisplayNames`). Chromium-based browsers like Chrome, Edge, and Brave only know names for about 150 languages, while Firefox and Safari know about 600. Without a `languages` list, editors in Chromium see a shorter list.

## Text direction

Both `lang` and `dir` are stored on each node, as the W3C recommends in [Strings on the Web](https://www.w3.org/TR/string-meta/). The direction is set when a language is applied, not guessed at render time. Content stored without a direction gets one when it is rendered.

- **From the script subtag**, if the tag has one: `az-Arab` is right-to-left.
- **From the language's likely script** otherwise, based on CLDR data.

## Caveats

- **Sections can't be nested.** Use a span to mark a different language inside a section.
- **Without the `intl` extension**, script subtags are ignored when a direction is derived at render time, so `az-Arab` renders as left-to-right.

## Development

```sh
composer install && npm install

composer test      # PHP tests
composer lint      # PHP code style, `composer format` to fix
composer analyse   # PHP static analysis

npm test           # JS tests
npm run check      # JS formatting, linting, and types, `npm run fix` to fix
npm run build      # build assets into resources/dist
```
