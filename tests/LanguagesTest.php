<?php

namespace Daun\StatamicBardLanguages\Tests;

use Daun\StatamicBardLanguages\Language\Languages;
use PHPUnit\Framework\Attributes\DataProvider;

class LanguagesTest extends TestCase
{
    public static function directions(): array
    {
        return [
            ['ar', 'rtl'],
            ['ar-EG', 'rtl'],
            ['fa', 'rtl'],
            ['ur', 'rtl'],
            ['he', 'rtl'],
            ['sd', 'rtl'],
            ['ckb', 'rtl'],
            ['dv', 'rtl'],
            ['az-Arab', 'rtl'],
            ['pa-Arab', 'rtl'],
            ['sd-Deva', 'ltr'],
            ['az', 'ltr'],
            ['de', 'ltr'],
            ['ja', 'ltr'],
            ['en-GB', 'ltr'],
            ['', 'ltr'],
        ];
    }

    #[DataProvider('directions')]
    public function test_it_derives_direction_from_language_tags(string $tag, string $dir): void
    {
        $this->assertSame($dir, Languages::direction($tag));
    }

    public function test_a_valid_explicit_direction_wins(): void
    {
        $this->assertSame('ltr', Languages::direction('ar', 'ltr'));
        $this->assertSame('rtl', Languages::direction('ar', 'RTL'));
        $this->assertSame('auto', Languages::direction('ar', 'auto'));
        $this->assertSame('rtl', Languages::direction('ar', 'sideways'));
        $this->assertSame('ltr', Languages::direction(null, ''));
    }

    public function test_any_well_formed_tag_is_known_without_a_language_list(): void
    {
        $languages = new Languages(null);

        $this->assertTrue($languages->isKnown('pt'));
        $this->assertTrue($languages->isKnown('pt-BR'));
        $this->assertTrue($languages->isKnown('az-Arab'));
        $this->assertTrue($languages->isKnown('zh-Hant-TW'));
        $this->assertTrue($languages->isKnown('abcde'));
        $this->assertFalse($languages->isKnown('abcd'));
        $this->assertFalse($languages->isKnown('pt_BR'));
        $this->assertFalse($languages->isKnown('en-'));
        $this->assertFalse($languages->isKnown('x-private'));
        $this->assertFalse($languages->isKnown(''));
        $this->assertFalse($languages->isKnown(null));
        $this->assertNull($languages->languages());
        $this->assertNull((new Languages([]))->languages());
    }

    public function test_only_listed_languages_are_known_with_a_language_list(): void
    {
        $languages = new Languages(['fr', 'es', 'pt-BR']);

        $this->assertTrue($languages->isKnown('fr'));
        $this->assertTrue($languages->isKnown('fr-CA'));
        $this->assertTrue($languages->isKnown('pt-BR'));
        $this->assertFalse($languages->isKnown('pt'));
        $this->assertFalse($languages->isKnown('de'));
    }

    public function test_it_returns_pinned_languages(): void
    {
        $this->assertSame(['fr', 'ja'], app(Languages::class)->pinned());
    }
}
