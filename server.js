const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure files are stored inside 'public/uploads'
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage }).array('files', 10); // Allow up to 10 files at once// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Ensure that files in the 'uploads' directory are accessible
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Endpoint to handle file upload
app.post('/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            return res.status(500).json(err);
        }
        // Send back an array of filenames to the client
        const fileNames = req.files.map(file => file.originalname);
        res.send({ fileNames });
    });
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('file-upload', (data) => {
        // Broadcast the file to all connected clients
        io.emit('file-receive', data);
    });

    socket.on('disconnect', () => console.log('Client disconnected'));
});

// Create uploads directory inside 'public' if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'public/uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'public/uploads'), { recursive: true });
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
