mongopatch [![Build Status](https://travis-ci.org/e-conomic/mongopatch.png?branch=master)](https://travis-ci.org/e-conomic/mongopatch)
==========

MongoDB patching tool. Update and log mongodb documents.

	npm install -g mongopatch


Writing patches
---------------

Patches are written as separate modules, exposing a single patching function.

```javascript
module.exports = function(patch) {
	// Specify which patching system version to use for this patch (required)
	patch.version('0.1.0');

	// Update all users that match the provided query.
	// The query is optional, if not provided all the documents
	// in the collection are processed.
	patch.update('users', { name: 'e-conomic' }, function(document, callback) {
		// The callback function should be called with the update to apply,
		// this can be any valid mongodb update query.
		callback(null, { $set: { email: 'e-conomic@e-conomic.com', associates: 'unknown' } });
	});

	// Register an after callback, to be run after each update.
	patch.after(function(update, callback) {
		var isValid = update.after.email === 'e-conomic@e-conomic.com';

		// Call the callback function with an error to abort the patching process.
		// Use this to guard against corrupted updates.
		callback(isValid ? null : new Error('Update failed'));
	});
}
```

The after callback gets an options map, containing the `before` and `after` documents, a `modfifed` flag (telling if there any changes between the two documents) and a `diff` object (the diff between the two documents).

Another example where we process all users.

```javascript
function shouldUpdate(document) {
	// ...
}

function update(document) {
	// ...
}

function isValid(document) {
	// ...
}

module.exports = function(patch) {
	patch.version('0.1.0');

	// All users are processed, since no filter query provided.
	patch.update('users', function(document, callback) {
		if(!shouldUpdate(document)) {
			// Calling the callback with no arguments, skips the document in the update process.
			return callback();
		}

		update(document);

		if(!isValid(document)) {
			// Validate document before performing the actual update in the database.
			// Passing an error as first argument, aborts the patching process,
			// and can leave the database in inconsistent state.
			return callback(new Error('Invalid document'));
		}

		// Apply the update, by overwritting the whole document
		callback(null, document);
	});
}
```

It's also possible to register `setup` and `teardown` hooks, executed before and after the patch is run. The `teardown` callback gets called with an additional stats object, containg accumulated details about the patch.

```javascript
patch.setup(function(callback) {
	// Pass an error object as first argument to callback, to terminate execution.
	callback();
});
```

```javascript
patch.teardown(function(stats, callback) {
	// Stats contains details about execution time, number of modified documents and average speed.
	callback();
});
```

Runing patches
--------------

Run patches using the `mongopatch` command-line tool. Basic usage:

	mongopatch path/to/patch.js --db "..." --dry-run --log-db "..."

Available options (too see a full list of options, run `mongopatch` without any arguments).

- **db**: MongoDB connection string (e.g. `user:password@localhost:27017/development` or `development`).
- **log-db**: MongoDB connection string for the log database. When provided a version of the document is stored before and after the update.
- **dry-run**: Do not perform any changes in the database. Changes are performed on copy of the documents and stored in the log db (if available).
- **parallel**: Run the patch with given parallelism. It may run the patch faster.
- **update**: Run the patch with one of the available update modes: `dummy`, `query` or `document` (default).

#### Update option

Three update modes are available. `query` and `document` both perform real updates on the database. `dummy` mode is the same as specifying the `--dry-run` option. Note also that `--dry-run` overrides `--update`.

When performing updates on real data, external changes may occur, modifying the documents as they are being processed. When mongopatch is started it fetches all the documents matching the provided query. These are loaded in batches and there can be a significant amount of time between, when a document is loaded and when the actual update is performed. To prevent external updates from conflicting with patching two strategies are employed.

The `query` mode uses the document's `_id` property and the query, originally provided to the `patch.update` method, as the criteria for finding and modifying the document (`findAndModify` MongoDB command). This means if the document has been changed externally, so that it no longer satisfies the query, it will be skipped. Other external changes to the document aren't considered.

The `document` mode, on the other hand, uses the whole document as the criteria. Any external changes to document will prevent the document from being patched. If that occurs, the document is fetched again using the `_id` property and the original query (similiar when in `query` mode), and run through the worker function again (the function passed to `patch.update`). If the worker function returns a modifier, the whole proccess is repeated with the new document and modifier. This has the consequence, that the worker function can be called with the same document multiple times in arbitrary order. This could affect patches with some form of state (e.g. counting number of documents by incrementing a counter every time the worker function has been called).

Runing updates in query mode:

	mongopatch path/to/patch.js --db "..." --log-db "..." --update query

#### CLI

The tool has a simple command-line interface, where it is possible to track progress and accumulated changes done to the documents. The diff shows how many times a property has been added, updated or removed between the original and the updated documents (note that all array changes are grouped).

When running on a live database, where external changes can occur, the progress indicator may be incorrect, as documents can be added or removed. Also skipping documents in `patch.update` causes the progress to fall behind.

Log database
------------

When a log database is available, a collection is created for every patch run. A document in the patch collection, contains data about the applied update. The `before` key points to the original document, `after` to the updated document, `modified` is a boolean flag telling if there were any changes and `diff` the difference between the `before` and `after` document (if `modified` is false, this is going to be an empty object). It also includes additional meta data.

```javascript
{
	"before": {
		"_id": ObjectId("507d2a650ea37a02000001ae"),
		"name": "e-conomic",
		"associates": "debitoor"
	},
	"after": {
		"_id": ObjectId("507d2a650ea37a02000001ae"),
		"name": "e-conomic",
		"associates": "unknown",
		"email": "e-conomic@e-conomic.com"
	},
	"modified": true,
	"skipped": false,
	"diff": {																	// diff is a nested object, where leafs can have one of the three values added, updated, removed
		"associates": "updated",
		"email": "added"
	},
	"createdAt": ISODate("2013-12-17T15:28:14.737Z"),							// when was the log document created
	"collection": "development.users",											// full collection name
	"modifier": "{ \"$set\": { \"email\": \"e-conomic@e-conomic.com\" } }",		// stringified modifier (passed to the callback in patch.update)
	"query": "{ \"name\": \"e-conomic\" }"										// stringified query (passed to patch.update function)
}
```

In some cases if an error occures during the patching, an `error` object is added to the log document, containing the error message and stack.

Release notes
-------------

#### Version 0.7.0

- Added `document` update mode. Uses the whole document as query when performing the update (optimistic locking). This is now the default mode. Issue #3.
- Validate provided database and collection. Nonexsting database or collection raise an error. Issue #5.
- Validate command-line arguments. Unknown arguments raise an error. Issue #4.

#### Version 0.6.0

- Fix command-line argument parsing bug where `--dry-run` and `--parallel` didn't work.
- Mixin provided query when updating document, to make sure the document still statisfies the criteria. Issue #3.
