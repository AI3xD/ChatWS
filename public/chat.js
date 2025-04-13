document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById("chat-box");
    const messageInput = document.getElementById("message-input");
    const sendBtn = document.getElementById("send-btn");
    const usernameModal = document.getElementById("username-modal");
    const usernameInput = document.getElementById("username-input");
    const usernameSubmit = document.getElementById("username-submit");
    const changeUsername = document.getElementById("change-username");
    const onlineStatus = document.getElementById("online-status");
    
    // Variables para el manejo de mensajes y usuarios
    let username = '';
    let clientId = 'user_' + Date.now() + Math.floor(Math.random() * 1000);
    let lastSentMessage = '';
    let ignoreNextMessage = false;
    let connectedUsers = 0;
    
    // Conexión WebSocket
    const socket = new WebSocket("ws://localhost:3000");
    
    // Función para obtener la hora actual formateada
    function getCurrentTime() {
      const now = new Date();
      return now.getHours().toString().padStart(2, '0') + ':' + 
             now.getMinutes().toString().padStart(2, '0');
    }
    
    // Función para mostrar el modal de nombre de usuario
    function showUsernameModal() {
      usernameModal.style.display = 'flex';
      usernameInput.focus();
    }
    
    // Función para ocultar el modal de nombre de usuario
    function hideUsernameModal() {
      usernameModal.style.display = 'none';
    }
    
    // Función para establecer el nombre de usuario
    function setUsername() {
      const name = usernameInput.value.trim();
      if (name) {
        username = name;
        hideUsernameModal();
        
        // Enviar mensaje al servidor con el nuevo usuario
        const userInfo = {
          type: 'userJoin',
          clientId: clientId,
          username: username
        };
        
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(userInfo));
        }
        
        // Mostrar mensaje de bienvenida
        addSystemMessage(`Bienvenido al chat, ${username}!`);
      }
    }
    
    // Función para crear un mensaje del sistema
    function addSystemMessage(text) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('system-message');
      messageDiv.textContent = text;
      
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // Crear un mensaje con el nuevo formato de burbuja
    function createMessageElement(text, isSent, senderName = '') {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');
      messageDiv.classList.add(isSent ? 'sent' : 'received');
      
      // Agregar nombre del remitente si está disponible
      if (senderName && !isSent) {
        const senderDiv = document.createElement('div');
        senderDiv.classList.add('message-sender');
        senderDiv.textContent = senderName;
        messageDiv.appendChild(senderDiv);
      } else if (isSent) {
        const senderDiv = document.createElement('div');
        senderDiv.classList.add('message-sender');
        senderDiv.textContent = 'Tú';
        messageDiv.appendChild(senderDiv);
      }
      
      // Crear la burbuja del mensaje
      const bubbleDiv = document.createElement('div');
      bubbleDiv.classList.add('message-bubble');
      bubbleDiv.textContent = text;
      
      // Crear el elemento de tiempo
      const timeSpan = document.createElement('div');
      timeSpan.classList.add('message-time');
      timeSpan.textContent = getCurrentTime();
      
      // Agregar elementos al mensaje
      messageDiv.appendChild(bubbleDiv);
      messageDiv.appendChild(timeSpan);
      
      return messageDiv;
    }
    
    // Evento cuando se recibe un mensaje del servidor
    socket.onmessage = async (event) => {
      try {
        // Convertir el Blob a texto
        const receivedText = await event.data.text();
        
        // Intentar parsear como JSON
        try {
          const jsonData = JSON.parse(receivedText);
          
          // Manejar diferentes tipos de mensajes
          if (jsonData.type === 'userCount') {
            // Actualizar contador de usuarios
            connectedUsers = jsonData.count;
            onlineStatus.textContent = `En línea: ${connectedUsers} usuario(s)`;
            return;
          }
          
          if (jsonData.type === 'userJoin') {
            // Mostrar mensaje de nuevo usuario
            if (jsonData.clientId !== clientId) {
              addSystemMessage(`${jsonData.username} se ha unido al chat`);
            }
            return;
          }
          
          if (jsonData.type === 'userLeave') {
            // Mostrar mensaje de usuario que se fue
            addSystemMessage(`${jsonData.username} ha salido del chat`);
            return;
          }
          
          if (jsonData.type === 'message') {
            // Si es un mensaje de este cliente, ignorarlo
            if (jsonData.clientId === clientId) {
              return;
            }
            
            // Mostrar mensaje de otro usuario
            const messageElement = createMessageElement(jsonData.text, false, jsonData.username);
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
          }
        } catch (e) {
          // No es JSON, tratar como mensaje de texto simple
          
          // Si estamos ignorando el próximo mensaje o si es igual al último enviado, lo ignoramos
          if (ignoreNextMessage || receivedText === lastSentMessage) {
            ignoreNextMessage = false;
            lastSentMessage = '';
            return;
          }
          
          // Crear el elemento de mensaje recibido (de remitente desconocido)
          const messageElement = createMessageElement(receivedText, false, 'Usuario');
          chatBox.appendChild(messageElement);
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      } catch (error) {
        console.error("Error al procesar mensaje:", error);
      }
    };
    
    // Evento cuando se abre la conexión
    socket.onopen = () => {
      console.log("Conexión WebSocket establecida");
      onlineStatus.textContent = "Conectado";
      
      // Mostrar modal para ingresar nombre de usuario
      showUsernameModal();
    };
    
    // Evento cuando hay un error en la conexión
    socket.onerror = (error) => {
      console.error("Error en la conexión WebSocket:", error);
      onlineStatus.textContent = "Error de conexión";
      
      // Mostrar mensaje de error en el chat
      addSystemMessage("Error de conexión. Por favor, recarga la página.");
    };
    
    // Evento cuando se cierra la conexión
    socket.onclose = () => {
      console.log("Conexión WebSocket cerrada");
      onlineStatus.textContent = "Desconectado";
      
      // Mostrar mensaje de desconexión
      addSystemMessage("Conexión cerrada. Por favor, recarga la página para reconectar.");
    };
    
    // Función para enviar mensaje
    function sendMessage() {
      const message = messageInput.value.trim();
      if (message !== "" && socket.readyState === WebSocket.OPEN) {
        try {
          // Si el servidor soporta JSON, enviar con formato
          try {
            const messageData = {
              type: 'message',
              clientId: clientId,
              username: username || 'Anónimo',
              text: message
            };
            
            // Guardar el mensaje que estamos enviando
            lastSentMessage = message;
            // Activar la bandera para ignorar el próximo mensaje
            ignoreNextMessage = true;
            
            // Enviar mensaje al servidor
            socket.send(JSON.stringify(messageData));
          } catch (e) {
            // Si hay error con JSON, enviar como texto plano
            lastSentMessage = message;
            ignoreNextMessage = true;
            socket.send(message);
          }
          
          // Mostrar mensaje enviado en el chat
          const messageElement = createMessageElement(message, true);
          chatBox.appendChild(messageElement);
          chatBox.scrollTop = chatBox.scrollHeight;
          
          // Limpiar input
          messageInput.value = "";
        } catch (error) {
          console.error("Error al enviar mensaje:", error);
        }
      }
    }
    
    // Evento click en botón enviar
    sendBtn.addEventListener("click", sendMessage);
    
    // Evento al presionar Enter en el input
    messageInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
    
    // Evento para enviar nombre de usuario
    usernameSubmit.addEventListener("click", setUsername);
    
    // Evento al presionar Enter en el input de nombre
    usernameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        setUsername();
      }
    });
    
    // Evento para cambiar nombre de usuario
    changeUsername.addEventListener("click", function() {
      showUsernameModal();
    });
  });