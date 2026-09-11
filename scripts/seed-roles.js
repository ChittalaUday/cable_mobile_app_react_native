/**
 * Seeds `roles` collection with default roles: `super_admin`, `admin`, `staff`, `customer`.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-roles.js
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'cableapp-642c4';

const ROLES = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Unrestricted system owner access across all resources',
    system: true,
    enabled: true,
    permissions: {
      'users.view': { scope: 'ALL' },
      'users.create': { scope: 'ALL' },
      'users.update': { scope: 'ALL' },
      'users.delete': { scope: 'ALL' },
      'customers.view': { scope: 'ALL' },
      'customers.create': { scope: 'ALL' },
      'customers.update': { scope: 'ALL' },
      'customers.delete': { scope: 'ALL' },
      'staff.view': { scope: 'ALL' },
      'staff.create': { scope: 'ALL' },
      'staff.update': { scope: 'ALL' },
      'complaints.view': { scope: 'ALL' },
      'complaints.create': { scope: 'ALL' },
      'complaints.update': { scope: 'ALL' },
      'complaints.assign': { scope: 'ALL' },
      'complaints.resolve': { scope: 'ALL' },
      'complaints.delete': { scope: 'ALL' },
      'payments.view': { scope: 'ALL' },
      'payments.create': { scope: 'ALL' },
      'payments.update': { scope: 'ALL' },
      'payments.collect': { scope: 'ALL' },
      'payments.delete': { scope: 'ALL' },
      'assets.view': { scope: 'ALL' },
      'assets.create': { scope: 'ALL' },
      'assets.update': { scope: 'ALL' },
      'assets.assign': { scope: 'ALL' },
      'assets.unassign': { scope: 'ALL' },
      'assets.transfer': { scope: 'ALL' },
      'assets.delete': { scope: 'ALL' },
      'locations.view': { scope: 'ALL' },
      'locations.create': { scope: 'ALL' },
      'dealers.view': { scope: 'ALL' },
      'inventory.view': { scope: 'ALL' },
      'reports.view': { scope: 'ALL' },
      'reports.export': { scope: 'ALL' },
      'settings.view': { scope: 'ALL' },
      'settings.update': { scope: 'ALL' },
      'roles.view': { scope: 'ALL' },
      'roles.create': { scope: 'ALL' },
      'roles.update': { scope: 'ALL' },
      'roles.delete': { scope: 'ALL' },
      'permissions.view': { scope: 'ALL' },
    },
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Operator Admin with full operational management access',
    system: true,
    enabled: true,
    permissions: {
      'users.view': { scope: 'ALL' },
      'customers.view': { scope: 'ALL' },
      'customers.create': { scope: 'ALL' },
      'customers.update': { scope: 'ALL' },
      'customers.delete': { scope: 'ALL' },
      'staff.view': { scope: 'ALL' },
      'staff.create': { scope: 'ALL' },
      'staff.update': { scope: 'ALL' },
      'complaints.view': { scope: 'ALL' },
      'complaints.create': { scope: 'ALL' },
      'complaints.update': { scope: 'ALL' },
      'complaints.assign': { scope: 'ALL' },
      'complaints.resolve': { scope: 'ALL' },
      'payments.view': { scope: 'ALL' },
      'payments.create': { scope: 'ALL' },
      'payments.collect': { scope: 'ALL' },
      'assets.view': { scope: 'ALL' },
      'assets.create': { scope: 'ALL' },
      'assets.update': { scope: 'ALL' },
      'locations.view': { scope: 'ALL' },
      'reports.view': { scope: 'ALL' },
      'reports.export': { scope: 'ALL' },
      'settings.view': { scope: 'ALL' },
      'roles.view': { scope: 'ALL' },
    },
  },
  {
    id: 'staff',
    name: 'Staff',
    description: 'Field staff and operators with area/assigned task access',
    system: true,
    enabled: true,
    permissions: {
      'customers.view': { scope: 'LOCATION' },
      'customers.create': { scope: 'LOCATION' },
      'customers.update': { scope: 'LOCATION' },
      'complaints.view': { scope: 'ASSIGNED' },
      'complaints.create': { scope: 'ASSIGNED' },
      'complaints.update': { scope: 'ASSIGNED' },
      'complaints.resolve': { scope: 'ASSIGNED' },
      'payments.view': { scope: 'ASSIGNED' },
      'payments.collect': { scope: 'ASSIGNED' },
      'assets.view': { scope: 'LOCATION' },
    },
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'Customer user with access restricted to own profile and tickets',
    system: true,
    enabled: true,
    permissions: {
      'complaints.view': { scope: 'OWN' },
      'complaints.create': { scope: 'OWN' },
      'payments.view': { scope: 'OWN' },
    },
  },
];

initializeApp({ projectId: PROJECT_ID });
const firestore = getFirestore();

async function seedRoles() {
  console.log(`\n🛡️ Seeding roles on project "${PROJECT_ID}"...\n`);
  const batch = firestore.batch();

  for (const role of ROLES) {
    const ref = firestore.collection('roles').doc(role.id);
    batch.set(ref, { ...role, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();
  console.log(`✅ Seeded ${ROLES.length} roles (super_admin, admin, staff, customer) into roles collection.`);
}

seedRoles().catch((err) => {
  console.error('Error seeding roles:', err);
  process.exit(1);
});
