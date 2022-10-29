# Changelog

This file records the changes in each m3api-query release.

The annotated tag (and GitHub release) for each version also lists the changes,
but this file may sometimes contain later improvements (e.g. typo fixes).

## initial (not yet released)

Initial release, including:

- `getResponsePageByTitle(),
  `getResponsePageByPageId()` and
  `getResponseRevisionByRevisionId() functions,
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
