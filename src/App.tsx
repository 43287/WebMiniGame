import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, Room, GameType } from './types';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';

// Initialize socket outside component to prevent reconnection on re-renders
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: false,
});

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [initialRoomId, setInitialRoomId] = useState('');
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    // Initialize from URL and LocalStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('roomId') || '';
    const storedName = localStorage.getItem('doodle_player_name') || '';
    
    setInitialRoomId(urlRoomId);
    setSavedName(storedName);

    socket.connect();

    function onConnect() {
      setIsConnected(true);
      
      // Attempt to rejoin or auto-join
      const savedRoomId = localStorage.getItem('doodle_room_id');
      const savedPlayerId = localStorage.getItem('doodle_player_id');
      
      if (urlRoomId) {
          // If URL matches saved session, try rejoin
          if (savedRoomId === urlRoomId && savedPlayerId) {
              console.log('Attempting to rejoin room from URL match:', savedRoomId);
              socket.emit('rejoinRoom', savedRoomId, savedPlayerId);
          } else {
              // URL is different or no session -> New Join
              // If we have a name, auto-join for convenience
              if (storedName) {
                  console.log('Auto-joining room from URL:', urlRoomId);
                  socket.emit('joinRoom', urlRoomId, storedName);
              }
              // If no name, user will see Lobby with pre-filled Room ID
          }
      } else if (savedRoomId && savedPlayerId) {
          // No URL, but saved session -> Rejoin
          console.log('Attempting to rejoin room from session:', savedRoomId);
          socket.emit('rejoinRoom', savedRoomId, savedPlayerId);
      } else {
          setPlayerId(socket.id || '');
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomUpdated(room: Room) {
      setCurrentRoom(room);
    }

    function onGameStateUpdated(gameState: any) {
      setCurrentRoom((prev) => prev ? { ...prev, gameState } : null);
    }

    function onError(msg: string) {
      setError(msg);
      setTimeout(() => setError(null), 3000);
      
      // If rejoin/join failed
      if (msg === 'Room not found or expired' || msg === 'Player not found in room' || msg === 'Room not found') {
          // Only clear session if we are NOT in a room and this error is related to joining
          if (!currentRoom) {
             localStorage.removeItem('doodle_room_id');
             localStorage.removeItem('doodle_player_id');
             
             // Remove invalid roomId from URL
             const url = new URL(window.location.href);
             if (url.searchParams.has('roomId')) {
                 url.searchParams.delete('roomId');
                 window.history.replaceState({}, '', url.toString());
                 setInitialRoomId(''); // Clear lobby input
             }
          }
      }
    }

    function onJoinedRoom(roomId: string, newPlayerId: string) {
        setPlayerId(newPlayerId);
        // Initialize currentRoom with a placeholder player to prevent "undefined" errors in GameRoom
        // until the full "roomUpdated" event arrives.
        setCurrentRoom((prev) => prev ? { ...prev, id: roomId } : { 
            id: roomId, 
            players: [{ id: newPlayerId, name: savedName || 'Player', isBot: false, isConnected: true }], 
            gameType: null, 
            gameState: null, 
            settings: {} 
        });
        localStorage.setItem('doodle_room_id', roomId);
        localStorage.setItem('doodle_player_id', newPlayerId);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', roomId);
        window.history.pushState({}, '', url.toString());
    }

    function onRejoinedRoom(room: Room, confirmedPlayerId: string) {
        setCurrentRoom(room);
        setPlayerId(confirmedPlayerId);
        localStorage.setItem('doodle_room_id', room.id);
        localStorage.setItem('doodle_player_id', confirmedPlayerId);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', room.id);
        window.history.pushState({}, '', url.toString());
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomUpdated', onRoomUpdated);
    socket.on('gameStateUpdated', onGameStateUpdated);
    socket.on('error', onError);
    socket.on('joinedRoom', onJoinedRoom);
    socket.on('rejoinedRoom', onRejoinedRoom);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomUpdated', onRoomUpdated);
      socket.off('gameStateUpdated', onGameStateUpdated);
      socket.off('error', onError);
      socket.off('joinedRoom', onJoinedRoom);
      socket.off('rejoinedRoom', onRejoinedRoom);
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = (playerName: string) => {
    localStorage.setItem('doodle_player_name', playerName);
    // Reuse existing player ID if available, otherwise pass undefined to let server generate one
    const existingPlayerId = localStorage.getItem('doodle_player_id') || undefined;
    socket.emit('createRoom', playerName, existingPlayerId);
  };

  const handleJoinRoom = (roomId: string, playerName: string) => {
    localStorage.setItem('doodle_player_name', playerName);
    socket.emit('joinRoom', roomId, playerName);
  };

  const handleStartGame = () => {
    socket.emit('startGame');
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom');
    setCurrentRoom(null);
    localStorage.removeItem('doodle_room_id');
    localStorage.removeItem('doodle_player_id');
    
    // Clear URL
    const url = new URL(window.location.href);
    url.searchParams.delete('roomId');
    window.history.pushState({}, '', url.toString());
    
    setInitialRoomId('');
  };

  const handleAddBot = () => {
    socket.emit('addBot');
  };

  const handleRemoveBot = (botId: string) => {
    socket.emit('removeBot', botId);
  };

  const handleMakeMove = (move: any) => {
    socket.emit('makeMove', move);
  };

  const handleSelectGame = (gameType: GameType) => {
    socket.emit('selectGame', gameType);
  };

  const handleUpdateSettings = (settings: any) => {
    socket.emit('updateSettings', settings);
  };

  const handleSendChat = (message: string) => {
    socket.emit('sendChat', message);
  };

  return (
    <div className="min-h-screen bg-amber-50 text-black font-sans">
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-bold animate-bounce">
          {error}
        </div>
      )}

      {!currentRoom ? (
        <Lobby 
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom} 
          initialRoomId={initialRoomId}
          savedName={savedName}
        />
      ) : (
        <GameRoom
          room={currentRoom}
          playerId={playerId || socket.id || ''}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
          onMakeMove={handleMakeMove}
          onSelectGame={handleSelectGame}
          onUpdateSettings={handleUpdateSettings}
          onSendChat={handleSendChat}
          socket={socket}
        />
      )}
    </div>
  );
}
