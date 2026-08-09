// Local dev entrypoint. Same Express app also runs in Cloud Functions via
// functions/index.js — see functions/app.js for the actual routes.
const app = require('./functions/app');

const PORT   = process.env.PORT || 3001;
const server = app.listen(PORT, () =>
    console.log(`MeVoy backend listening on http://localhost:${PORT}`)
);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} already in use. Kill the previous process or set PORT in .env`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
