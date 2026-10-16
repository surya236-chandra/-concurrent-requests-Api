// test-booking.js - Automated tests for Phase 4 Booking Service (Transactions + IDOR)
const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🧪 Starting Phase 4 Booking & Transaction verification...\n');
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

  // 1. Fetch sites
  let siteId = null;
  await assertCase('GET /api/sites returns list of heritage sites', async () => {
    const res = await fetch(`${BASE_URL}/sites`);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(data.sites) || data.sites.length === 0) throw new Error('No sites returned');
    siteId = data.sites[0]._id;
  });

  // 2. Fetch slots for site
  let testSlot = null;
  await assertCase('GET /api/slots?siteId=... returns slots for site', async () => {
    const res = await fetch(`${BASE_URL}/slots?siteId=${siteId}`);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(data.slots) || data.slots.length === 0) throw new Error('No slots returned');
    // Pick a slot that currently has full tickets available
    testSlot = data.slots.find((s) => s.availableTickets === 50) || data.slots[0];
  });

  // 3. Register & login User A and User B
  const userAEmail = `userA_${Date.now()}@test.com`;
  const userBEmail = `userB_${Date.now()}@test.com`;
  let tokenA = null;
  let tokenB = null;

  await assertCase('Setup test users (User A & User B)', async () => {
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: userAEmail, password: 'Password@123' }),
    });
    const resA = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'Password@123' }),
    });
    tokenA = (await resA.json()).token;

    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: userBEmail, password: 'Password@123' }),
    });
    const resB = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: 'Password@123' }),
    });
    tokenB = (await resB.json()).token;
  });

  // 4. User A books tickets atomically
  let reservationA1Id = null;
  const initialAvailable = testSlot.availableTickets;
  await assertCase('User A books 2 tickets atomically (status 201)', async () => {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ slotId: testSlot._id, quantity: 2 }),
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    if (data.availableTickets !== initialAvailable - 2) {
      throw new Error(`Expected ${initialAvailable - 2} available, got ${data.availableTickets}`);
    }
    reservationA1Id = data.reservation._id;
  });

  // 5. User A exhausts remaining tickets
  let reservationA2Id = null;
  const remaining = initialAvailable - 2;
  await assertCase('User A books all remaining tickets for the slot', async () => {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ slotId: testSlot._id, quantity: remaining }),
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    if (data.availableTickets !== 0) throw new Error(`Expected 0 available, got ${data.availableTickets}`);
    reservationA2Id = data.reservation._id;
  });

  // 6. User B attempts to book sold-out slot -> 409
  await assertCase('User B booking sold-out slot returns 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ slotId: testSlot._id, quantity: 1 }),
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // 7. User A checks their reservations
  await assertCase('GET /api/reservations/me returns user bookings', async () => {
    const res = await fetch(`${BASE_URL}/reservations/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (data.reservations.length < 2) throw new Error(`Expected >= 2 reservations, got ${data.reservations.length}`);
  });

  // 8. IDOR Attack Defense: User B tries to cancel User A's reservation
  await assertCase('IDOR Defense: User B cancelling User A reservation returns 404', async () => {
    const res = await fetch(`${BASE_URL}/reservations/${reservationA1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (res.status !== 404) throw new Error(`Expected 404 for IDOR attempt, got ${res.status}`);
  });

  // 9. User A successfully cancels their reservation (tickets restored)
  await assertCase('User A cancels reservation and restores ticket inventory (200)', async () => {
    const res = await fetch(`${BASE_URL}/reservations/${reservationA1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    if (data.availableTickets !== 2) throw new Error(`Expected 2 tickets restored, got ${data.availableTickets}`);
  });

  // 10. User B can now book the freed tickets
  await assertCase('User B books the newly freed ticket (201)', async () => {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ slotId: testSlot._id, quantity: 1 }),
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    if (data.availableTickets !== 1) throw new Error(`Expected 1 ticket remaining, got ${data.availableTickets}`);
  });

  // 11. Normal user cannot access admin capacity route -> 403
  await assertCase('Normal user accessing /api/admin/capacity returns 403', async () => {
    const res = await fetch(`${BASE_URL}/admin/capacity`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 12. Admin can access admin capacity route -> 200
  await assertCase('Admin user accessing /api/admin/capacity returns 200', async () => {
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@heritage.com', password: 'Admin@123' }),
    });
    const adminToken = (await adminRes.json()).token;

    const res = await fetch(`${BASE_URL}/admin/capacity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(data.slots) || data.slots.length === 0) throw new Error('No admin slots returned');
  });

  console.log(`\n🏁 Test Results: ${passed}/${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

runTests();
