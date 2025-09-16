// server.js
const { createServer } = require("http");
const { Server } = require("socket.io");

// Create a basic HTTP server for health checks
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket.IO server running\n");
});

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: { origin: "*" }, // allow all origins, restrict in production
});

// Keep track of online users: userId -> [socketId, ...]
const onlineUsers = {};

// Broadcast current online users to all clients
function broadcastOnlineUsers() {
  const ids = Object.keys(onlineUsers);
  console.log("👥 Broadcasting online users:", ids);
  io.emit("online-users", ids);
}

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // Handle user joining
  socket.on("join", (userId) => {
    if (!userId) return;

    if (!onlineUsers[userId]) {
      onlineUsers[userId] = [];
    }
    if (!onlineUsers[userId].includes(socket.id)) {
      onlineUsers[userId].push(socket.id);
    }

    console.log("📌 User joined:", userId, "Sockets:", onlineUsers[userId]);

    broadcastOnlineUsers();
  });

  // Handle user leaving manually
  socket.on("leave", (userId) => {
    if (!userId || !onlineUsers[userId]) return;

    onlineUsers[userId] = onlineUsers[userId].filter((id) => id !== socket.id);
    if (onlineUsers[userId].length === 0) {
      delete onlineUsers[userId];
    }

    console.log(`🚪 User left: ${userId}, remaining sockets:`, onlineUsers[userId] || []);
    broadcastOnlineUsers();
  });

  // Handle messages
  socket.on("message", (message) => {
    console.log("📩 Message received:", message);

    // Send to receiver sockets
    const receivers = onlineUsers[message.receiverId] || [];
    receivers.forEach((sid) => io.to(sid).emit("message", message));

    // Echo back to sender
    socket.emit("message", message);

    console.log("📤 Message sent to:", message.receiverId);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    let removedUserId = null;

    for (const userId in onlineUsers) {
      onlineUsers[userId] = onlineUsers[userId].filter((id) => id !== socket.id);
      if (onlineUsers[userId].length === 0) {
        delete onlineUsers[userId];
        removedUserId = userId;
      }
    }

    console.log(
      `❌ Socket disconnected: ${socket.id} (User: ${removedUserId || "unknown"})`
    );

    // 🔥 Immediately broadcast updated online users
    broadcastOnlineUsers();
  });
});

// Use dynamic port provided by Render
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () =>
  console.log(`🚀 Socket.IO server running on port ${PORT}`)
);
