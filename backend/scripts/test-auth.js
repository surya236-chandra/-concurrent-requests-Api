// test-auth.js - Comprehensive test suite for Phase 3 Auth & Security
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3000/api/auth';

async function runTests() {
  console.log('🧪 Starting Phase 3 Auth & Security verification...\n');
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

  const uniqueEmail = `testuser_${Date.now()}@example.com`;

  // 1. Zod Validation (bad email / short password)
  await assertCase('Zod validation rejects invalid email / short password (400)', async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'notanemail', password: '123' }),
    });
    const data = await res.json();
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (!data.details) throw new Error('Expected validation error details');
  });

  // 2. Register valid user
  let registeredUserId = null;
  await assertCase('Register valid user returns 201 & role="user"', async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Normal User',
        email: uniqueEmail,
        password: 'ValidPassword@123',
        role: 'admin', // Attack: Attempt privilege escalation
      }),
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.user.role !== 'user') throw new Error(`Privilege escalation! Role was: ${data.user.role}`);
    registeredUserId = data.user.id;
  });

  // 3. Reject duplicate registration
  await assertCase('Duplicate email registration returns 409', async () => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: uniqueEmail,
        password: 'ValidPassword@123',
      }),
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // 4. Login with invalid password
  await assertCase('Login with wrong password returns 401', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'WrongPassword' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 5. Login with valid credentials
  let userToken = null;
  await assertCase('Login with valid credentials returns 200 & JWT', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'ValidPassword@123' }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!data.token) throw new Error('No token returned');
    userToken = data.token;
  });

  // 6. Access protected route with valid token
  await assertCase('GET /me with valid Bearer token returns 200 & user payload', async () => {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.user.email !== uniqueEmail) throw new Error(`Payload mismatch: ${JSON.stringify(data)}`);
  });

  // 7. Access protected route without token
  await assertCase('GET /me without Authorization header returns 401', async () => {
    const res = await fetch(`${BASE_URL}/me`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 8. Access protected route with tampered token
  await assertCase('GET /me with tampered token returns 401', async () => {
    const tampered = userToken.substring(0, userToken.length - 5) + 'xxxxx';
    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${tampered}` },
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 9. alg: "none" attack
  await assertCase('GET /me with alg:"none" token returns 401', async () => {
    // Manually forge an alg:none token
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: registeredUserId, role: 'admin' })).toString('base64url');
    const forgedToken = `${header}.${payload}.`;

    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 10. Normal user accessing admin-only route
  await assertCase('Normal user accessing /admin-check returns 403', async () => {
    const res = await fetch(`${BASE_URL}/admin-check`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 11. Login as seeded admin
  let adminToken = null;
  await assertCase('Login as seeded admin (admin@heritage.com) returns 200 & role="admin"', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@heritage.com', password: 'Admin@123' }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (data.user.role !== 'admin') throw new Error(`Expected role admin, got ${data.user.role}`);
    adminToken = data.token;
  });

  // 12. Admin accessing admin-only route
  await assertCase('Admin user accessing /admin-check returns 200', async () => {
    const res = await fetch(`${BASE_URL}/admin-check`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  console.log(`\n🏁 Test Results: ${passed}/${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

runTests();
