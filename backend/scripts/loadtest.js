// loadtest.js - High-concurrency stress test and security test suite
// Demonstrates that under simultaneous requests:
// - Exactly availableTickets succeed (201)
// - Exactly excess requests get rejected (409 Sold out)
// - availableTickets never goes below 0 (No overselling / race condition)

import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'heritage_secret_key_change_me_in_production_123456789';

async function runLoadAndSecurityTests() {
  console.log('🚀 Starting Concurrency Load Test & Security Verification...\n');

  const CONCURRENCY = parseInt(process.argv[2], 10) || 500;
  console.log(`📌 PART 1: Concurrency Stress Test (${CONCURRENCY} concurrent requests)`);

  // 1. Create authenticated JWT directly (avoids hitting auth rate limiter during automated load testing)
  const token = jwt.sign(
    { userId: '65f1a2b3c4d5e6f7a8b9c0d1', email: 'loadtester@test.com', role: 'user' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );

  // 2. Find a slot with available tickets
  const slotsRes = await fetch(`${BASE_URL}/slots`);
  const { slots } = await slotsRes.json();
  const slot = slots.find((s) => s.availableTickets === 50) || slots.find((s) => s.availableTickets > 0);

  if (!slot) {
    throw new Error('No time slot with available tickets found. Run `npm run seed` to restore all 63 slots to capacity 50.');
  }

  const initialTickets = slot.availableTickets;
  const expectedSuccesses = Math.min(initialTickets, CONCURRENCY);
  const expectedRejections = Math.max(0, CONCURRENCY - initialTickets);
  const expectedFinalTickets = Math.max(0, initialTickets - CONCURRENCY);

  console.log(`🎯 Target slot selected: ID ${slot._id} (${slot.date} ${slot.startTime}-${slot.endTime})`);
  console.log(`📊 Initial capacity: ${slot.totalCapacity}, Available: ${initialTickets}`);
  console.log(`⚡ Blasting ${CONCURRENCY} simultaneous booking requests...`);

  const startTime = Date.now();

  // Fire requests all at once in parallel
  const requests = Array.from({ length: CONCURRENCY }, () =>
    fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slotId: slot._id, quantity: 1 }),
    })
      .then((res) => res.status)
      .catch((err) => `ERR:${err.code || err.cause?.code || err.message}`)
  );

  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;

  let successCount = 0;
  let soldOutCount = 0;
  let otherCount = 0;

  for (const status of results) {
    if (status === 201) successCount++;
    else if (status === 409) soldOutCount++;
    else otherCount++;
  }

  console.log(`⏱️ Completed ${CONCURRENCY} requests in ${duration}ms (~${Math.round(CONCURRENCY / (duration / 1000))} req/sec)`);
  console.log(`   - 201 Created (Success): ${successCount}`);
  console.log(`   - 409 Conflict (Sold Out): ${soldOutCount}`);
  if (otherCount > 0) {
    console.log(`   - Other statuses: ${otherCount}`);
  }

  // Fetch slot to verify final count in database
  const updatedSlotRes = await fetch(`${BASE_URL}/slots?siteId=${slot.siteId._id}&date=${slot.date}`);
  const { slots: updatedSlots } = await updatedSlotRes.json();
  const updatedSlot = updatedSlots.find((s) => String(s._id) === String(slot._id));

  console.log(`📊 Final availableTickets in DB: ${updatedSlot.availableTickets}`);

  if (successCount !== expectedSuccesses) {
    throw new Error(`Race condition detected! Expected ${expectedSuccesses} successes, got ${successCount}`);
  }
  if (soldOutCount !== expectedRejections) {
    throw new Error(`Expected ${expectedRejections} rejections (409), got ${soldOutCount}`);
  }
  if (updatedSlot.availableTickets !== expectedFinalTickets) {
    throw new Error(`Expected ${expectedFinalTickets} available tickets, got ${updatedSlot.availableTickets}`);
  }
  console.log(`✅ Concurrency assertions PASSED: Exactly ${successCount} succeeded, ${soldOutCount} rejected, 0 overbooking!\n`);

  // --- PART 2: Comprehensive Security Attack Suite ---
  console.log('📌 PART 2: Security Attack Suite Verification');

  // 1. IDOR Defense Test
  console.log('Testing 1: IDOR Attack (User A cancels User B reservation)...');
  const tokenB = jwt.sign(
    { userId: '65f1a2b3c4d5e6f7a8b9c0d2', email: 'userB@test.com', role: 'user' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );

  // Find another slot for booking
  const slot2 = slots.find((s) => s.availableTickets > 0 && String(s._id) !== String(slot._id));
  if (slot2) {
    const bookResB = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ slotId: slot2._id, quantity: 1 }),
    });
    const userBReservationId = (await bookResB.json()).reservation._id;

    // User A tries to delete User B's reservation
    const idorRes = await fetch(`${BASE_URL}/reservations/${userBReservationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (idorRes.status !== 404) {
      throw new Error(`IDOR vulnerability! User A got status ${idorRes.status} instead of 404`);
    }
    console.log('✅ [PASS] IDOR attack returned 404 Not Found (User cannot touch another user data)');
  }

  // 2. Tampered JWT Test
  console.log('Testing 2: Tampered JWT token...');
  const tamperedToken = token.substring(0, token.length - 8) + 'abcdefgh';
  const tamperRes = await fetch(`${BASE_URL}/reservations/me`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  if (tamperRes.status !== 401) {
    throw new Error(`Tampered token accepted! Got status ${tamperRes.status}`);
  }
  console.log('✅ [PASS] Tampered JWT rejected with 401 Unauthorized');

  // 3. alg: none attack Test
  console.log('Testing 3: alg:none signature bypass attack...');
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId: 'fakeUserId', role: 'admin' })).toString('base64url');
  const algNoneToken = `${header}.${payload}.`;
  const algNoneRes = await fetch(`${BASE_URL}/reservations/me`, {
    headers: { Authorization: `Bearer ${algNoneToken}` },
  });
  if (algNoneRes.status !== 401) {
    throw new Error(`alg:none accepted! Got status ${algNoneRes.status}`);
  }
  console.log('✅ [PASS] alg:none attack rejected with 401 Unauthorized');

  // 4. Role Escalation Test (Normal user hitting admin route)
  console.log('Testing 4: Role-based access control (Normal user on /api/admin/capacity)...');
  const adminRes = await fetch(`${BASE_URL}/admin/capacity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (adminRes.status !== 403) {
    throw new Error(`Privilege escalation! Normal user got status ${adminRes.status} on admin route`);
  }
  console.log('✅ [PASS] Admin route blocked for normal user with 403 Forbidden');

  console.log('\n🏁 Concurrency & Security Verification 100% COMPLETE AND PASSING!\n');
}

runLoadAndSecurityTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
