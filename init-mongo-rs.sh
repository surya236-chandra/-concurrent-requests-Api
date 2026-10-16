#!/bin/bash
set -e

echo ">>> Starting MongoDB in background with replica set 'rs0'..."
mongod --replSet rs0 --bind_ip_all --port 27017 &
MONGO_PID=$!

echo ">>> Waiting for MongoDB server to accept connections..."
until mongosh --port 27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  sleep 1
done

echo ">>> MongoDB is ready. Checking replica set initialization..."
mongosh --port 27017 --eval "
  try {
    const status = rs.status();
    if (status.ok === 1) {
      console.log('>>> Replica set rs0 already initialized.');
    }
  } catch (err) {
    console.log('>>> Initiating replica set rs0 with host mongo:27017...');
    const res = rs.initiate({
      _id: 'rs0',
      members: [{ _id: 0, host: 'mongo:27017' }]
    });
    console.log('>>> rs.initiate() completed:', JSON.stringify(res));
  }
"

echo ">>> Replica set rs0 is ready. Handing control to mongod process..."
wait $MONGO_PID
