const { createServer } = require("http");
const { Server } = require("socket.io");

// Create a basic HTTP server for health checks
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket.IO server running\n");
});

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: { origin: "*" }, // allow all origins, you can restrict to frontend URL
});

// Keep track of online users
const onlineUsers = {};

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // Handle user joining
  socket.on("join", (userId) => {
    if (!userId) return;

    if (!onlineUsers[userId]) onlineUsers[userId] = [];
    onlineUsers[userId].push(socket.id);

    console.log("📌 User joined:", userId, "Sockets:", onlineUsers[userId]);
  });

  // Handle messages
  socket.on("message", (message) => {
    console.log("📩 Message received:", message);

    // Send to receiver sockets
    const receivers = onlineUsers[message.receiverId] || [];
    receivers.forEach((sid) => io.to(sid).emit("message", message));

    // Echo back to sender
    socket.emit("message", message);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    for (const userId in onlineUsers) {
      onlineUsers[userId] = onlineUsers[userId].filter((id) => id !== socket.id);
      if (onlineUsers[userId].length === 0) delete onlineUsers[userId];
    }
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Use dynamic port provided by Render
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () =>
  console.log(`🚀 Socket.IO server running on port ${PORT}`)
);
