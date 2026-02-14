/**
 * Database Configuration for PharmaSpot
 * 
 * Set USE_MONGODB=true and provide MONGODB_URI to use cloud MongoDB.
 * Set USE_MONGODB=false to use local NeDB (original behavior).
 * 
 * Environment variables override these defaults:
 *   DB_USE_MONGODB=true
 *   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pharmaspot
 */

const dbConfig = {
    USE_MONGODB: process.env.DB_USE_MONGODB === "true" || false,
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/pharmaspot",
    DB_NAME: process.env.DB_NAME || "pharmaspot",
    LOCAL_DB_DIR: null,
};

module.exports = { dbConfig };
