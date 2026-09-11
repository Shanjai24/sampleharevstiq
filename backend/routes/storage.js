const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// GET /api/storage/directory
// Serves the storage/warehousing directory (national institutions only —
// see _notes in the JSON file for why this intentionally has no
// fabricated private business listings).
router.get('/directory', (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../../ml/data/storage_directory.json');
        if (!fs.existsSync(dataPath)) {
            return res.status(404).json({ error: 'Storage directory data not found' });
        }
        const raw = fs.readFileSync(dataPath, 'utf8');
        const data = JSON.parse(raw);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load storage directory', message: error.message });
    }
});

module.exports = router;