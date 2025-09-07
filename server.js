import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiServer } from './api.js'; // Import the shared API server logic

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Mount the API logic on the '/api' route
app.use('/api', apiServer);

// --- Serve Frontend ---
// This part serves the static files from the 'dist' folder created by 'npm run build'
const frontendDistPath = path.join(__dirname, 'dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));

    // For any route that is not an API route, serve the index.html
    // This is important for single-page applications like React
    app.get('*', (req, res) => {
        // Important: check if the path is an API path again to avoid conflicts
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        }
    });
} else {
    console.log("No 'dist' directory found. Run 'npm run build' to create it. API server is still running.");
}


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
