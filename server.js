const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mongoose = require("mongoose");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Conectar a MongoDB
mongoose.connect("mongodb://localhost:27017/chatdb", {})
    .then(() => console.log("Conectado a MongoDB"))
    .catch((err) => console.error("Error al conectar a MongoDB:", err));

// Definir el esquema y modelo de mensaje
const messageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Servir archivos estáticos (frontend)
app.use(express.static("public"));

// Manejar conexiones WebSocket
wss.on("connection", (ws) => {
    console.log("Cliente conectado");
    
    // Asignar un ID único a cada conexión
    ws.id = Date.now();
    
    ws.on("message", (data) => {
        try {
            const parsedMessage = JSON.parse(data); // Asegúrate de que el cliente envíe un JSON válido
            console.log("Mensaje recibido:", parsedMessage);

            // Verificar si el mensaje es del tipo esperado
            if (parsedMessage.type === "message" && parsedMessage.username && parsedMessage.text) {
                // Guardar el mensaje en la base de datos
                const newMessage = new Message({
                    username: parsedMessage.username,
                    message: parsedMessage.text, // Usar la propiedad `text` como el mensaje
                });

                newMessage.save()
                    .then(() => console.log("Mensaje guardado en la base de datos"))
                    .catch((err) => console.error("Error al guardar el mensaje:", err));

                // Reenviar el mensaje a todos los clientes
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(parsedMessage));
                    }
                });
            } else {
                console.error("Mensaje recibido con formato incorrecto:", parsedMessage);
            }
        } catch (err) {
            console.error("Error al procesar el mensaje:", err);
        }
    });
    
    ws.on("close", () => {
        console.log("Cliente desconectado");
    });
});

// Iniciar el servidor
const PORT = 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));