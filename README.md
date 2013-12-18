mongopatch
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
	patch.update('users',  { name: 'e-conomic' }, function(document, callback) {
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

Runing patches
--------------

Run patches using the `mongopatch` command-line tool. Basic usage:

	mongopatch path/to/patch.js --db databaseConnectionString --dry-run --log-db logDatabaseConnectionString

Available options (too see a full list of options, run `mongopatch` without any arguments).

- **db**: MongoDB connection string (e.g. `user:password@localhost:27017/development` or `development`).
- **log-db**: MongoDB connection string for the log database. When provided a version of the document is stored before and after the update.
- **dry-run**: Do not perform any changes in the database. Changes are performed on copy of the documents and stored in the log db (if available).
- **parallel**: Run the patch with given parallelism. It may run the patch faster.

![mongopatch](/mongopatch.png)

Running the tool, outputs the above interface, where it is possible to track progress and accumulated changes done to the documents. The diff shows how many times a property has been added, updated or removed between the original and the updated documents (note that all array changes are grouped).

When running on a live database, where external changes can occur, the progress indicator may be incorrect, as documents can be added or removed. Also skipping documents in `patch.update` causes the progress to fall behind.

Log Database
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
	"diff": {																	// diff is a nested object, where leafs can have one of the three values added, updated, removed
		"associates": "updated",
		"email": "added"
	},
	"createdAt": ISODate("2013-12-17T15:28:14.737Z"),							// when was the log document created
	"collection": "development.users",											// full collection name
	"modifier": "{ \"$set\": { \"email\": \"e-conomic@e-conomic.com\" } }",		// stringified modifier (passed to the callback in path.update)
	"query": "{ \"name\": \"e-conomic\" }"										// stringified query (passed to patch.update function)
}
```

In some cases if an error occures during the patching, an `error` object is added to the log document, containing the error message and stack.
