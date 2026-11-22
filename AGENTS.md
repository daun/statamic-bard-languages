# Agents

Development commands are in the Development section of `DOCUMENTATION.md`. Don't commit unless asked.

## Screenshots

"Retake the screenshots" means the transparent README/docs images in `docs/art/`. Setup and options are in `playground/screenshots/README.md`.

1. `npm run build` in the addon.
2. `php artisan serve --port=8124` in `playground/`.
3. `npm run docs` in `playground/screenshots/`: re-seeds the demo entry and renders the shots marked `docs: true` in `shoot.mjs`.
4. Show the images before committing.

`playground/` is a separate git repo, ignored by this one.
