<?php

namespace Daun\StatamicBardLanguages\Tests;

use Statamic\Fields\Field;
use Statamic\Fieldtypes\Bard\Augmentor;

class RenderingTest extends TestCase
{
    protected function augmentor(): Augmentor
    {
        return new Augmentor((new Field('content', ['type' => 'bard']))->fieldtype());
    }

    protected function render(array $content): string
    {
        return $this->augmentor()->renderProsemirrorToHtml(['type' => 'doc', 'content' => $content]);
    }

    protected function paragraph(array $content): array
    {
        return ['type' => 'paragraph', 'content' => $content];
    }

    public function test_it_renders_language_spans(): void
    {
        $html = $this->render([
            $this->paragraph([
                ['type' => 'text', 'text' => 'The word '],
                ['type' => 'text', 'text' => 'سلام', 'marks' => [['type' => 'languageSpan', 'attrs' => ['lang' => 'ar', 'dir' => 'rtl']]]],
                ['type' => 'text', 'text' => ' means peace.'],
            ]),
        ]);

        $this->assertSame('<p>The word <span lang="ar" dir="rtl">سلام</span> means peace.</p>', $html);
    }

    public function test_it_renders_language_sections_around_any_blocks(): void
    {
        $html = $this->render([
            [
                'type' => 'languageSection',
                'attrs' => ['lang' => 'ar', 'dir' => 'rtl'],
                'content' => [
                    $this->paragraph([['type' => 'text', 'text' => 'سلام']]),
                    ['type' => 'bulletList', 'content' => [
                        ['type' => 'listItem', 'content' => [$this->paragraph([['type' => 'text', 'text' => 'واحد']])]],
                    ]],
                ],
            ],
        ]);

        $this->assertSame('<div lang="ar" dir="rtl"><p>سلام</p><ul><li><p>واحد</p></li></ul></div>', $html);
    }

    public function test_it_derives_a_missing_direction(): void
    {
        $html = $this->render([
            ['type' => 'languageSection', 'attrs' => ['lang' => 'ar'], 'content' => [
                $this->paragraph([['type' => 'text', 'text' => 'سلام']]),
            ]],
        ]);

        $this->assertSame('<div lang="ar" dir="rtl"><p>سلام</p></div>', $html);
    }

    public function test_it_replaces_an_invalid_direction(): void
    {
        $html = $this->render([
            $this->paragraph([
                ['type' => 'text', 'text' => 'سلام', 'marks' => [['type' => 'languageSpan', 'attrs' => ['lang' => 'ar', 'dir' => 'bogus']]]],
            ]),
        ]);

        $this->assertSame('<p><span lang="ar" dir="rtl">سلام</span></p>', $html);
    }

    public function test_it_escapes_attribute_values(): void
    {
        $html = $this->render([
            $this->paragraph([
                ['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'languageSpan', 'attrs' => ['lang' => '"><script>', 'dir' => 'ltr']]]],
            ]),
        ]);

        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_it_normalizes_parsed_directions(): void
    {
        $doc = $this->augmentor()->renderHtmlToProsemirror('<p><span lang="ar" dir="RTL">a</span> <span lang="ar" dir="bogus">b</span> <span lang="ar" dir="ltr">c</span></p>');

        $dirs = array_map(fn ($node) => $node['marks'][0]['attrs']['dir'] ?? null, $doc['content'][0]['content']);
        $this->assertSame(['rtl', null, 'rtl', null, 'ltr'], $dirs);
    }

    public function test_it_parses_html_of_configured_languages(): void
    {
        $doc = $this->augmentor()->renderHtmlToProsemirror(
            '<div lang="ar" dir="rtl"><p>كلمة <span lang="en">word</span> <span lang="sd">لفظ</span></p></div>'
        );

        $section = $doc['content'][0];
        $this->assertSame('languageSection', $section['type']);
        $this->assertSame(['lang' => 'ar', 'dir' => 'rtl'], $section['attrs']);
        $this->assertSame(
            [['type' => 'languageSpan', 'attrs' => ['lang' => 'en', 'dir' => 'ltr']]],
            $section['content'][0]['content'][1]['marks'],
        );
        $this->assertSame(
            [['type' => 'languageSpan', 'attrs' => ['lang' => 'sd', 'dir' => 'rtl']]],
            $section['content'][0]['content'][3]['marks'],
        );
    }

    public function test_it_ignores_invalid_language_tags_when_parsing(): void
    {
        $doc = $this->augmentor()->renderHtmlToProsemirror('<p>Mot <span lang="x-private">mot</span> <span lang="">x</span></p>');

        $this->assertStringNotContainsString('languageSpan', json_encode($doc));
        $this->assertStringContainsString('mot', json_encode($doc));
    }

    public function test_it_parses_any_known_language(): void
    {
        $doc = $this->augmentor()->renderHtmlToProsemirror('<p><span lang="fr">mot</span></p>');

        $this->assertSame('languageSpan', $doc['content'][0]['content'][0]['marks'][0]['type'] ?? null);
    }
}
