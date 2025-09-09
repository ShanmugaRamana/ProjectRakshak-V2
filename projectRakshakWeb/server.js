// --- Core Dependencies ---
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const http = require('http');
const { Server } = require("socket.io");

// --- Middleware & Session ---
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');

// --- Project Imports ---
const connectDB = require('./config/db');

// --- Initial Setup ---
dotenv.config({ path: './.env' });
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Middleware Configuration ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Make Socket.IO and user session available to all routes
app.use((req, res, next) => {
  req.io = io;
  res.locals.user = req.session.user;
  next();
});

// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
  console.log('Dashboard UI connected via Socket.IO');
  socket.on('disconnect', () => { console.log('Dashboard UI disconnected'); });
});

// --- Route Definitions ---
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/persons', require('./routes/persons'));
app.use('/staff', require('./routes/staff')); // <-- ADD THIS LINE
app.use('/staff-auth', require('./routes/staffAuth'));

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

// --- THIS IS THE FIX ---
// The IP address '0.0.0.0' is now correctly formatted without the extra space.
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Node.js Web Server running on port ${PORT}`);
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname].forEach((iface) => {
            if ('IPv4' !== iface.family || iface.internal !== false) return;
            console.log(`- Server accessible at: http://${iface.address}:${PORT}`);
        });
    });
});