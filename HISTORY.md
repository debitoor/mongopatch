#### Version 0.8.6

- Update `mongojs` to newest version, which includes various bug fixes.

#### Version 0.8.5

- Do not use the original document `_id` when creating log entries.

#### Version 0.8.4

- Add `--diff-object` option to the cli.

#### Version 0.8.3

- Make is possible to pass `diffObject` option to the programmatic interface. This will produce a document diff which contains objects when doing changes on array-like instances (objects with numeric keys).

#### Version 0.8.2

- Make it possible to pass the log collection to the programmatic interface. Can be a string or `mongojs` collection instance.

#### Version 0.8.1

- Make it possible to pass a `mongojs` database instance to `mongopatch` when used programmatically (the database is not closed).

#### Version 0.8.0

- Updated dependencies. New version of `mongojs` has breaking interface changes, which also affects the behaviour of `patch.db` object (an instance of the `mongojs` db class).
- Fix tests on windows. Use the `win-spawn` module for cli tests.

#### Version 0.7.3

- Added optimistic locking fallback using the `$where` operator. Some documents didn't match them self when used in a query.

#### Version 0.7.2

- Remove `$where` clause when performing updates in `document` mode. It caused noticable database-wide slowdowns. Properties added to the root of the document, which pass the query, are not detected anymore when doing optimistic locking.

#### Version 0.7.1

- Fix accumulated diff, by excluding skipped documents in the calculation.

#### Version 0.7.0

- Added `document` update mode. Uses the whole document as query when performing the update (optimistic locking). This is now the default mode. [Issue #3](https://github.com/debitoor/mongopatch/issues/3).
- Validate provided database and collection. Nonexsting database or collection raise an error. [Issue #5](https://github.com/debitoor/mongopatch/issues/5).
- Validate command-line arguments. Unknown arguments raise an error. [Issue #4](https://github.com/debitoor/mongopatch/issues/4).

#### Version 0.6.0

- Fix command-line argument parsing bug where `--dry-run` and `--parallel` didn't work.
- Mixin provided query when updating document, to make sure the document still statisfies the criteria. [Issue #3](https://github.com/debitoor/mongopatch/issues/3).
