<?php

namespace Daun\StatamicBardLanguages\Tests;

use Statamic\Fields\Field;
use Statamic\Fieldtypes\Bard\Augmentor;

class RestrictedRenderingTest extends TestCase
{
    protected array $languages = ['ar', 'fa'];

    public function test_it_only_parses_listed_languages(): void
    {
        $augmentor = new Augmentor((new Field('content', ['type' => 'bard']))->fieldtype());
        $doc = json_encode($augmentor->renderHtmlToProsemirror('<p><span lang="fr">mot</span> <span lang="fa">کلمه</span></p>'));

        $this->assertStringNotContainsString('"lang":"fr"', $doc);
        $this->assertStringContainsString('"lang":"fa"', $doc);
    }
}
