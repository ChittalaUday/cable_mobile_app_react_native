/**
 * Seeds Firebase Auth + Firestore with one user per role (admin, staff, subscriber).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-users.js
 * or, against the local emulators (see firebase.json):
 *   firebase emulators:exec --only auth,firestore "node scripts/seed-users.js"
 *
 * Safe to re-run: existing users are looked up by email instead of re-created,
 * and their role doc is upserted either way.
 */
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'cableapp-642c4';
const PASSWORD = process.env.SEED_PASSWORD || 'Passw0rd!';

const SEED_USERS = [
  { email: 'admin@satyacable.dev', displayName: 'Admin', role: 'admin' },
  { email: 'staff@satyacable.dev', displayName: 'Staff', role: 'staff' },
  { email: 'user@satyacable.dev', displayName: 'Customer', role: 'subscriber' },
];

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const firestore = getFirestore();

async function findOrCreateUser({ email, displayName }) {
  try {
    return await auth.getUserByEmail(email);
  }
  catch (error) {
    if (error.code !== 'auth/user-not-found')
      throw error;
    return auth.createUser({ email, password: PASSWORD, displayName });
  }
}

async function seedUser({ email, displayName, role }) {
  const user = await findOrCreateUser({ email, displayName });
  await firestore.collection('users').doc(user.uid).set(
    {
      role,
      name: displayName,
      email,
      photoURL: user.photoURL || null,
      phone: null,
      address: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { email, role, uid: user.uid };
}

async function main() {
  const seeded = [];
  for (const seedUserConfig of SEED_USERS)
    seeded.push(await seedUser(seedUserConfig));

  console.log(`\nSeeded ${seeded.length} users on project "${PROJECT_ID}":\n`);
  for (const { email, role, uid } of seeded)
    console.log(`  ${role.padEnd(10)} ${email.padEnd(24)} uid=${uid}`);
  console.log(`\nPassword for all seeded accounts: ${PASSWORD}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
