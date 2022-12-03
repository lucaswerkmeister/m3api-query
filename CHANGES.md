# Changelog

This file records the changes in each m3api-query release.

The annotated tag (and GitHub release) for each version also lists the changes,
but this file may sometimes contain later improvements (e.g. typo fixes).

## next (not yet released)

- `getResponsePageByTitle()` and the other `*ByTitle()` functions
  now take converted titles into account as well,
  which is important on wikis with language converter support.
  (Note that the API only converts titles
  if the `converttitles` parameter is specified.)
- Publish documentation on GitHub pages:
  [latest version][m3api-query-doc-latest], [v0.1.1][m3api-query-doc-v0.1.1].

## v0.1.0 (2022-10-30)

Initial release, including:

- `getResponsePageByTitle()`,
  `getResponsePageByPageId()` and
  `getResponseRevisionByRevisionId()` functions,
  for extracting data from an existing response.
- `queryPartialPageByTitle()`,
  `queryIncrementalPageByTitle()` and
  `queryFullPageByTitle()` functions,
  for getting a page by its title.
- `queryPartialPageByPageId()`,
  `queryIncrementalPageByPageId()` and
  `queryFullPageByPageId()` functions,
  for getting a page by its page ID.
- `queryPotentialRevisionByRevisionId()` and
  `queryFullRevisionByRevisionId()` functions,
  for getting a revision by its revision ID.
- `queryFullPages()`,
  `queryFullRevisions()` functions,
  for getting a stream of pages or revisions from a generator.
- `pageOfRevision` symbol and `mergeValues` default function.
- `m3api-query/mergeValues`,
  `m3api-query/comparePages` and
  `m3api-query/compareRevisions` options.

[m3api-query-doc-latest]: https://lucaswerkmeister.github.io/m3api-query/
[m3api-query-doc-v0.1.1]: https://lucaswerkmeister.github.io/m3api-query/v0.1.1/
