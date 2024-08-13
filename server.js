const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const devices = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Listen for chat messages
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg); // Broadcast to all users
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});



io.on('connection', (socket) => {
    const ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    const deviceName = generateRandomName();
    devices[ip] = deviceName;

    // Notify all clients about the new device
    io.emit('device-update', { ip, name: deviceName });

    socket.on('disconnect', () => {
        delete devices[ip];
        io.emit('device-update', { ip, name: null }); // Notify all clients about the disconnection
    });

    console.log(`New device connected: ${ip}`);
});
// When a device connects, its IP address is recorded and a random name is assigned. When a device disconnects, it’s removed from the list.
function generateRandomName() {
    const adjectives = ['Red', 'Blue', 'Green', 'Fast', 'Slow'];
    const nouns = ['Lion', 'Tiger', 'Bear', 'Eagle', 'Shark'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj}-${randomNoun}`;
}


app.get('/devices', (req, res) => {
    res.json(devices);
});
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
