const { dbConfig } = require('./db.config');
const path = require('path');

let mongoClient = null;
let mongoDb = null;

/**
 * MongoCollectionWrapper - Wraps MongoDB driver with NeDB-compatible callback API
 */
class MongoCollectionWrapper {
    constructor(collection) {
        this.collection = collection;
    }

    /**
     * Find documents matching query
     * @param {Object} query - MongoDB query object
     * @param {Function} callback - Callback (err, docs)
     */
    find(query, callback) {
        this.collection
            .find(query)
            .toArray()
            .then((docs) => callback(null, docs))
            .catch((err) => callback(err, null));
    }

    /**
     * Find one document matching query
     * @param {Object} query - MongoDB query object
     * @param {Function} callback - Callback (err, doc)
     */
    findOne(query, callback) {
        this.collection
            .findOne(query)
            .then((doc) => callback(null, doc))
            .catch((err) => callback(err, null));
    }

    /**
     * Insert a document
     * @param {Object} doc - Document to insert
     * @param {Function} callback - Callback (err, doc)
     */
    insert(doc, callback) {
        this.collection
            .insertOne(doc)
            .then(() => callback(null, doc))
            .catch((err) => callback(err, null));
    }

    /**
     * Update documents matching query
     * Handles both NeDB-style full replacement and MongoDB operator updates
     * @param {Object} query - Query to match documents
     * @param {Object} update - Update object (may contain operators like $set)
     * @param {Object} options - Update options
     * @param {Function} callback - Callback (err, numAffected, affectedDocuments)
     */
    update(query, update, options, callback) {
        // Detect if update uses MongoDB operators
        const hasOperators = Object.keys(update).some(key => key.startsWith('$'));
        
        let updateDoc = update;
        if (!hasOperators) {
            // NeDB-style full replacement - wrap in $set and remove _id
            const { _id, ...updateWithoutId } = update;
            updateDoc = { $set: updateWithoutId };
        }

        this.collection
            .updateOne(query, updateDoc, options)
            .then((result) => {
                // NeDB callback signature: (err, numAffected, affectedDocuments)
                callback(null, result.modifiedCount, null);
            })
            .catch((err) => callback(err, 0, null));
    }

    /**
     * Remove documents matching query
     * @param {Object} query - Query to match documents
     * @param {Function} callback - Callback (err, numRemoved)
     */
    remove(query, callback) {
        this.collection
            .deleteOne(query)
            .then((result) => callback(null, result.deletedCount))
            .catch((err) => callback(err, 0));
    }

    /**
     * Ensure index exists (fire-and-forget)
     * @param {Object} options - Index options (e.g., { fieldName: 'email', unique: true })
     */
    ensureIndex(options) {
        const indexSpec = {};
        if (options.fieldName) {
            indexSpec[options.fieldName] = 1;
        }
        
        const indexOptions = {};
        if (options.unique) {
            indexOptions.unique = true;
        }

        // Fire-and-forget, silently ignore errors
        this.collection
            .createIndex(indexSpec, indexOptions)
            .catch(() => {
                // Silently ignore already-exists errors
            });
    }
}

/**
 * Initialize MongoDB connection
 * @returns {Promise<void>}
 */
async function initMongo() {
    if (!dbConfig.USE_MONGODB) {
        console.log('Using NeDB (local database)');
        return;
    }

    try {
        const { MongoClient } = require('mongodb');
        mongoClient = new MongoClient(dbConfig.MONGODB_URI);
        await mongoClient.connect();
        mongoDb = mongoClient.db(dbConfig.DB_NAME);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed, falling back to NeDB:', error.message);
        // Reset MongoDB state on failure
        mongoClient = null;
        mongoDb = null;
    }
}

/**
 * Get a database collection (MongoDB or NeDB)
 * @param {string} name - Collection/database name
 * @returns {Object} MongoCollectionWrapper or NeDB Datastore
 */
function getCollection(name) {
    if (dbConfig.USE_MONGODB && mongoDb) {
        // Return MongoDB collection wrapped with NeDB-compatible API
        const collection = mongoDb.collection(name);
        return new MongoCollectionWrapper(collection);
    } else {
        // Return NeDB Datastore
        const Datastore = require('@seald-io/nedb');
        const dbPath = path.join(
            process.env.APPDATA,
            process.env.APPNAME,
            'server',
            'databases',
            name + '.db'
        );
        return new Datastore({
            filename: dbPath,
            autoload: true,
        });
    }
}

/**
 * Close MongoDB connection gracefully
 * @returns {Promise<void>}
 */
async function closeMongo() {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
        mongoDb = null;
        console.log('MongoDB connection closed');
    }
}

module.exports = {
    initMongo,
    getCollection,
    closeMongo,
};
