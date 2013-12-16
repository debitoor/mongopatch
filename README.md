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
		callback(null, { $set: { email: 'e-conomic@e-conomic.com' } });
	});

	// Register an after callback, to be run after each update.
	patch.after(function(updatedDocument, callback) {
		var isValid = updatedDocument.email === 'e-conomic@e-conomic.com';

		// Call the callback function with an error to abort the patching process.
		// Use this to guard agains corrupted updates.
		callback(isValid ? null : new Error('Update failed'));
	});
}
```

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

Available options

- **db**: MongoDB connection string (e.g. `user:password@localhost:27017/development` or `development`).
- **log-db**: MongoDB connection string for the log database. When provided a version of the document is stored before and after the update.
- **diff** (default true): Output accumulated diff when running the patch. Also stores the diff in the log db (if available).
- **dry-run**: Do not perform any changes in the database. Changes are performed on copy of the documents and stored in the log db (if available).
- **parallel**: Run the patch with given parallelism. It may run the patch faster.
