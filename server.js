const http = require("http");
const express = require("express")();
const server = http.createServer(express);
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const pkg = require("./package.json");
const { dbConfig } = require("./db.config");
const { initMongo } = require("./db");

// Decouple from Electron - gracefully fall back when not available
let isElectron = false;
try {
    const { app } = require("electron");
    if (app) {
        isElectron = true;
        process.env.APPDATA = app.getPath("appData");
    }
} catch (e) {
    process.env.APPDATA = process.env.APPDATA || require("os").homedir();
}

process.env.APPNAME = pkg.name;
const PORT = process.env.PORT || 0;
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
});

console.log("Server started");

express.use(bodyParser.json());
express.use(bodyParser.urlencoded({ extended: false }));
express.use(limiter);

express.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Content-type,Accept,X-Access-Token,X-Key",
    );
    if (req.method == "OPTIONS") {
        res.status(200).end();
    } else {
        next();
    }
});

express.get("/", function (req, res) {
    res.send("POS Server Online.");
});

/**
 * Start the server with optional MongoDB initialization
 */
async function startServer() {
    // Initialize MongoDB if configured
    if (dbConfig.USE_MONGODB) {
        try {
            await initMongo();
        } catch (error) {
            console.error('MongoDB initialization failed, falling back to NeDB:', error.message);
        }
    }

    // Mount API routes
    express.use("/api/inventory", require("./api/inventory"));
    express.use("/api/customers", require("./api/customers"));
    express.use("/api/categories", require("./api/categories"));
    express.use("/api/settings", require("./api/settings"));
    express.use("/api/users", require("./api/users"));
    express.use("/api", require("./api/transactions"));
    express.use("/api/dashboard", require("./api/dashboard"));

    // Start server
    server.listen(PORT, () => {
        process.env.PORT = server.address().port;
        console.log("Listening on PORT", process.env.PORT);
        console.log("Database mode:", dbConfig.USE_MONGODB ? "MongoDB" : "NeDB (local)");
    });
}

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

/**
 * Restarts the server process.
 */
function restartServer() {
    server.close(() => {
        // Remove cached modules so require() reloads them
        Object.keys(require.cache).forEach(key => {
            if (key.includes('api') || key.endsWith('server.js')) {
                delete require.cache[key];
            }
        });
        // Re-require server.js to restart everything
        require('./server');
    });
}

module.exports = { restartServer };