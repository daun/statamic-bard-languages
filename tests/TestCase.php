<?php

namespace Daun\StatamicBardLanguages\Tests;

use Daun\StatamicBardLanguages\ServiceProvider;
use Statamic\Testing\AddonTestCase;

abstract class TestCase extends AddonTestCase
{
    protected string $addonServiceProvider = ServiceProvider::class;

    protected array $languages = [];

    protected function defineEnvironment($app)
    {
        parent::defineEnvironment($app);

        $app['config']->set('statamic-bard-languages.languages', $this->languages);
        $app['config']->set('statamic-bard-languages.pinned', ['fr', 'ja']);
    }
}
