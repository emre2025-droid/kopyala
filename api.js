import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- Helper Functions ---
const readDb = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            // Ensure data is not empty before parsing
            return data ? JSON.parse(data) : { customers: [], deviceNames: {}, assignments: {} };
        }
    } catch (error) {
        console.error("Error reading database file:", error);
    }
    // Return a default structure if file doesn't exist or is corrupted
    return { customers: [], deviceNames: {}, assignments: {} };
};

const writeDb = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing to database file:", error);
    }
};

// --- API Routes ---
// Note: The '/api' prefix is not here. It's applied where this app is used.
app.get('/data', (req, res) => {
    const data = readDb();
    res.json(data);
});

app.post('/data', (req, res) => {
    const { customers, deviceNames, assignments } = req.body;
    
    if (customers === undefined || deviceNames === undefined || assignments === undefined) {
        return res.status(400).json({ error: 'Invalid data structure' });
    }

    writeDb({ customers, deviceNames, assignments });
    res.status(200).json({ message: 'Data saved successfully' });
});

export { app as apiServer };
