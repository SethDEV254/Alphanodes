// Vercel serverless entry — forwards all /api/* requests to the Express app
const app = require('../backend/server.js');
module.exports = app;
