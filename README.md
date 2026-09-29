# zed-adblock-resources

Scriptlet and redirect resources for [Zed Browser](https://play.google.com/store/apps/details?id=com.browser.red)'s ad blocker,
which uses Brave's [adblock-rust](https://github.com/brave/adblock-rust) engine.

`dist/resources.json` is rebuilt **automatically every day** from the latest release of
[uBlock Origin](https://github.com/gorhill/uBlock) by a GitHub Action, and committed only when it changes.

- `dist/resources.json` — scriptlets (`##+js(...)` rules) and redirect resources (`$redirect` rules),
  in adblock-rust's `Resource` format
- `dist/version.json` — the uBlock Origin version it was built from, and when

## Credits and license

The scriptlets and redirect resources are the work of Raymond Hill and the uBlock Origin contributors,
taken unmodified from https://github.com/gorhill/uBlock and licensed under the
[GNU General Public License v3.0](https://github.com/gorhill/uBlock/blob/master/LICENSE.txt).
This repository is distributed under the same license.
