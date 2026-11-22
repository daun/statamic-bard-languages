<?php

namespace Daun\StatamicBardLanguages\Tests;

use Daun\StatamicBardLanguages\ServiceProvider;
use PHPUnit\Framework\Attributes\DataProvider;

class EditorConfigTest extends TestCase
{
    public static function configs(): array
    {
        return [
            'missing' => [[], ['style' => 'line', 'showCodes' => true]],
            'line' => [['style' => 'line', 'show_codes' => false], ['style' => 'line', 'showCodes' => false]],
            'outline' => [['style' => 'outline'], ['style' => 'outline', 'showCodes' => true]],
            'tag' => [['style' => 'tag'], ['style' => 'tag', 'showCodes' => true]],
            'null' => [['style' => null], ['style' => null, 'showCodes' => false]],
            'false' => [['style' => false, 'show_codes' => true], ['style' => null, 'showCodes' => false]],
            'none' => [['style' => 'none'], ['style' => null, 'showCodes' => false]],
            'unknown' => [['style' => 'dashed'], ['style' => 'line', 'showCodes' => true]],
        ];
    }

    #[DataProvider('configs')]
    public function test_it_normalizes_the_editor_config(array $config, array $expected): void
    {
        $this->assertSame($expected, ServiceProvider::editorConfig($config));
    }
}
