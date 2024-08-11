const socket = io();
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('m');
const roomInput = document.getElementById('roomInput');
const nameInput = document.getElementById('nameInput');
const myNameElem = document.getElementById('myName');

let currentRoom = '';
let userName = '';
let myId = '';

document.getElementById('joinRoomBtn').addEventListener('click', () => {
    joinRoom();
});

function joinRoom() {
    if (currentRoom) {
        socket.emit('leaveRoom', currentRoom);
    }
    currentRoom = roomInput.value.trim();
    userName = nameInput.value.trim();
    if (currentRoom && userName) {
        socket.emit('joinRoom', { room: currentRoom, name: userName });
        myNameElem.textContent = userName;
        messages.innerHTML = ''; // Clear messages when joining a new room
    }
}

socket.on('yourId', (id) => {
    myId = id;
    document.getElementById('myId').textContent = myId;
});

socket.on('opponent', (data) => {
    if (data.id === null) {
        document.getElementById('opponentId').textContent = '-';
        document.getElementById('opponentName').textContent = '-';
    } else {
        document.getElementById('opponentId').textContent = data.id;
        document.getElementById('opponentName').textContent = data.name;
    }
});

socket.on('message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the default form submission
    if (input.value) {
        socket.emit('chatMessage', { room: currentRoom, message: input.value });
        input.value = '';
    }
});

document.getElementById('refreshUsers').addEventListener('click', () => {
    const room = roomInput.value.trim();
    if (room) {
        console.log(`Requesting users for room: ${room}`);
        socket.emit('getRoomUsers', room);
    } else {
        console.log('No room specified');
    }
});

socket.on('roomUsers', (users) => {
    console.log('Received users:', users);
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    if (users.length > 1) {
        const firstUser = users.find(user => user.id !== myId);
        if (firstUser) {
            document.getElementById('opponentId').textContent = firstUser.id;
            document.getElementById('opponentName').textContent = firstUser.name;
        }
    } else {
        document.getElementById('opponentId').textContent = '-';
        document.getElementById('opponentName').textContent = '-';
    }
    users.forEach(user => {
        const item = document.createElement('li');
        item.textContent = `${user.name} (ID: ${user.id})`;
        userList.appendChild(item);
    });
});
