<?php

namespace Daun\StatamicBardLanguages;

use Daun\StatamicBardLanguages\Language\Languages;
use Daun\StatamicBardLanguages\Tiptap\LanguageSection;
use Daun\StatamicBardLanguages\Tiptap\LanguageSpan;
use Statamic\Fieldtypes\Bard\Augmentor;
use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $vite = [
        'input' => [
            'resources/js/addon.ts',
            'resources/css/addon.css',
        ],
        'publicDirectory' => 'resources/dist',
    ];

    public function register(): void
    {
        $this->app->singleton(Languages::class, fn () => new Languages(
            config('statamic-bard-languages.languages'),
            config('statamic-bard-languages.pinned', []),
        ));
    }

    public function bootAddon(): void
    {
        Augmentor::addExtension(LanguageSpan::$name, new LanguageSpan);
        Augmentor::addExtension(LanguageSection::$name, new LanguageSection);

        Statamic::provideToScript([
            'bardLanguages' => fn () => [
                'languages' => app(Languages::class)->languages(),
                'pinned' => app(Languages::class)->pinned(),
            ],
        ]);
    }
}
