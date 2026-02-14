const app = require("express")();
const bodyParser = require("body-parser");
const { getCollection } = require("../db");

app.use(bodyParser.json());

module.exports = app;

/**
 * GET endpoint: Get today's sales summary
 * 
 * @param {Object} req request object
 * @param {Object} res response object
 * @returns {void}
 */
app.get("/summary", function (req, res) {
    const transactionsDB = getCollection("transactions");
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const query = {
        status: 1,
        date: { $gte: today.toJSON() }
    };
    
    transactionsDB.find(query, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
            return;
        }
        
        let totalTransactions = docs.length;
        let totalSales = 0;
        let totalProfit = 0;
        
        docs.forEach(doc => {
            totalSales += parseFloat(doc.total || 0);
            totalProfit += parseFloat(doc.profit || 0);
        });
        
        res.json({
            totalTransactions,
            totalSales,
            totalProfit,
            date: today.toJSON()
        });
    });
});

/**
 * GET endpoint: Get recent transactions
 * 
 * @param {Object} req request object with query params (limit)
 * @param {Object} res response object
 * @returns {void}
 */
app.get("/recent", function (req, res) {
    const transactionsDB = getCollection("transactions");
    const limit = parseInt(req.query.limit) || 20;
    
    transactionsDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
            return;
        }
        
        // Sort by date descending and limit results
        const recentTransactions = docs
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
        
        res.json(recentTransactions);
    });
});

/**
 * GET endpoint: Get low stock products
 * 
 * @param {Object} req request object with query params (threshold)
 * @param {Object} res response object
 * @returns {void}
 */
app.get("/low-stock", function (req, res) {
    const inventoryDB = getCollection("inventory");
    const threshold = parseInt(req.query.threshold) || 10;
    
    inventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
            return;
        }
        
        // Filter products with stock === 0 or quantity <= threshold
        const lowStockProducts = docs.filter(product => {
            const stock = parseInt(product.stock || 0);
            const quantity = parseInt(product.quantity || 0);
            return stock === 0 || quantity <= threshold;
        });
        
        res.json(lowStockProducts);
    });
});

/**
 * GET endpoint: Get expiring products
 * 
 * @param {Object} req request object with query params (days)
 * @param {Object} res response object
 * @returns {void}
 */
app.get("/expiring", function (req, res) {
    const inventoryDB = getCollection("inventory");
    const days = parseInt(req.query.days) || 30;
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    inventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
            return;
        }
        
        // Filter products with expirationDate within the given number of days
        const expiringProducts = docs.filter(product => {
            if (!product.expirationDate) return false;
            
            const expirationDate = new Date(product.expirationDate);
            return expirationDate >= now && expirationDate <= futureDate;
        });
        
        res.json(expiringProducts);
    });
});
