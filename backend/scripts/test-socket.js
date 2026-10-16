// test-socket.js - Automated tests for Phase 5 Socket.io Real-Time Updates
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Phase 5 Socket.io Real-Time Updates verification...\n');
  let passed = 0;
  let total = 0;

  async function assertCase(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Get tokens
  let userToken = null;
  let adminToken = null;
  const userEmail = `socket_user_${Date.now()}@test.com`;

  await assertCase('Setup test credentials (user and admin)', async () => {
    // Register & login test user
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Socket Tester', email: userEmail, password: 'Password@123' }),
    });
    const userRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'Password@123' }),
    });
    userToken = (await userRes.json()).token;

    // Login seeded admin
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@heritage.com', password: 'Admin@123' }),
    });
    adminToken = (await adminRes.json()).token;
  });

  // 2. Reject connection without token
  await assertCase('Socket connection rejected if no token provided', async () => {
    await new Promise((resolve, reject) => {
      const socket = io(SOCKET_URL, {
        autoConnect: true,
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect_error', (err) => {
        socket.disconnect();
        if (err.message.includes('No token provided')) {
          resolve();
        } else {
          reject(new Error(`Unexpected error message: ${err.message}`));
        }
      });

      socket.on('connect', () => {
        socket.disconnect();
        reject(new Error('Connection should have failed without token'));
      });
    });
  });

  // 3. Reject connection with invalid/tampered token
  await assertCase('Socket connection rejected if token is tampered/invalid', async () => {
    await new Promise((resolve, reject) => {
      const socket = io(SOCKET_URL, {
        auth: { token: 'invalid.tampered.token' },
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect_error', (err) => {
        socket.disconnect();
        if (err.message.includes('Invalid or expired token')) {
          resolve();
        } else {
          reject(new Error(`Unexpected error: ${err.message}`));
        }
      });

      socket.on('connect', () => {
        socket.disconnect();
        reject(new Error('Connection should have failed with invalid token'));
      });
    });
  });

  // 4. Successful connection with valid JWT
  let userSocket = null;
  let adminSocket = null;

  await assertCase('Socket connects successfully with valid JWT', async () => {
    await new Promise((resolve, reject) => {
      userSocket = io(SOCKET_URL, {
        auth: { token: userToken },
        transports: ['websocket'],
      });

      userSocket.on('connect', resolve);
      userSocket.on('connect_error', (err) => reject(new Error(err.message)));
    });
  });

  await assertCase('Admin connects and joins "admin" room', async () => {
    await new Promise((resolve, reject) => {
      adminSocket = io(SOCKET_URL, {
        auth: { token: adminToken },
        transports: ['websocket'],
      });

      adminSocket.on('connect', resolve);
      adminSocket.on('connect_error', (err) => reject(new Error(err.message)));
    });
  });

  // 5. Fetch a slot to test room subscription
  let targetSlot = null;
  await assertCase('Fetch target slot for live testing', async () => {
    const res = await fetch(`${API_URL}/slots`);
    const data = await res.json();
    targetSlot = data.slots[0];
    if (!targetSlot) throw new Error('No slots available');
  });

  // User client subscribes to specific slot room
  userSocket.emit('joinSlot', targetSlot._id);

  // 6. Test booking emits real-time event to both user and admin
  let createdReservationId = null;
  await assertCase('Booking triggers capacity:update event to both user and admin', async () => {
    const expectedTickets = targetSlot.availableTickets - 1;

    const userPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('User socket timeout waiting for capacity:update')), 5000);
      userSocket.once('capacity:update', (payload) => {
        clearTimeout(timer);
        if (payload.slotId === String(targetSlot._id) && payload.availableTickets === expectedTickets) {
          resolve();
        } else {
          reject(new Error(`User received unexpected payload: ${JSON.stringify(payload)}`));
        }
      });
    });

    const adminPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Admin socket timeout waiting for capacity:update')), 5000);
      adminSocket.once('capacity:update', (payload) => {
        clearTimeout(timer);
        if (payload.slotId === String(targetSlot._id) && payload.availableTickets === expectedTickets) {
          resolve();
        } else {
          reject(new Error(`Admin received unexpected payload: ${JSON.stringify(payload)}`));
        }
      });
    });

    // Make the booking via HTTP API
    const bookRes = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ slotId: targetSlot._id, quantity: 1 }),
    });

    const bookData = await bookRes.json();
    if (bookRes.status !== 201) throw new Error(`Booking failed: ${JSON.stringify(bookData)}`);
    createdReservationId = bookData.reservation._id;

    // Await both sockets receiving the real-time event
    await Promise.all([userPromise, adminPromise]);
  });

  // 7. Test cancellation emits real-time restoration event to both
  await assertCase('Cancellation triggers capacity:update event restoring tickets', async () => {
    const expectedTickets = targetSlot.availableTickets; // restored back

    const userPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('User socket timeout waiting for restock event')), 5000);
      userSocket.once('capacity:update', (payload) => {
        clearTimeout(timer);
        if (payload.slotId === String(targetSlot._id) && payload.availableTickets === expectedTickets) {
          resolve();
        } else {
          reject(new Error(`User received unexpected payload: ${JSON.stringify(payload)}`));
        }
      });
    });

    const adminPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Admin socket timeout waiting for restock event')), 5000);
      adminSocket.once('capacity:update', (payload) => {
        clearTimeout(timer);
        if (payload.slotId === String(targetSlot._id) && payload.availableTickets === expectedTickets) {
          resolve();
        } else {
          reject(new Error(`Admin received unexpected payload: ${JSON.stringify(payload)}`));
        }
      });
    });

    // Cancel reservation via HTTP API
    const cancelRes = await fetch(`${API_URL}/reservations/${createdReservationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (cancelRes.status !== 200) throw new Error(`Cancel failed with status ${cancelRes.status}`);

    await Promise.all([userPromise, adminPromise]);
  });

  userSocket.disconnect();
  adminSocket.disconnect();

  console.log(`\n🏁 Test Results: ${passed}/${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

runTests();
