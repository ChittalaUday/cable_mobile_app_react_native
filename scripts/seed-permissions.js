/**
 * Seeds `permissionRegistry` collection with all standard permissions.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-permissions.js
 * or against emulators:
 *   firebase emulators:exec --only firestore "node scripts/seed-permissions.js"
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'cableapp-642c4';

const PERMISSION_REGISTRY_ITEMS = [
  // Users
  { key: 'users.view', resource: 'users', action: 'view', name: 'View Users', module: 'users', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'users.create', resource: 'users', action: 'create', name: 'Create Users', module: 'users', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'users.update', resource: 'users', action: 'update', name: 'Update Users', module: 'users', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'users.delete', resource: 'users', action: 'delete', name: 'Delete Users', module: 'users', allowedScopes: ['ALL'], enabled: true, system: true },

  // Customers
  { key: 'customers.view', resource: 'customers', action: 'view', name: 'View Customers', module: 'customers', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'customers.create', resource: 'customers', action: 'create', name: 'Create Customers', module: 'customers', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'customers.update', resource: 'customers', action: 'update', name: 'Update Customers', module: 'customers', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'customers.delete', resource: 'customers', action: 'delete', name: 'Delete Customers', module: 'customers', allowedScopes: ['ALL'], enabled: true, system: true },

  // Staff
  { key: 'staff.view', resource: 'staff', action: 'view', name: 'View Staff', module: 'staff', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'staff.create', resource: 'staff', action: 'create', name: 'Create Staff', module: 'staff', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'staff.update', resource: 'staff', action: 'update', name: 'Update Staff', module: 'staff', allowedScopes: ['ALL'], enabled: true, system: true },

  // Complaints
  { key: 'complaints.view', resource: 'complaints', action: 'view', name: 'View Complaints', module: 'complaints', allowedScopes: ['OWN', 'ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'complaints.create', resource: 'complaints', action: 'create', name: 'Create Complaints', module: 'complaints', allowedScopes: ['OWN', 'ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'complaints.update', resource: 'complaints', action: 'update', name: 'Update Complaints', module: 'complaints', allowedScopes: ['ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'complaints.assign', resource: 'complaints', action: 'assign', name: 'Assign Complaints', module: 'complaints', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'complaints.resolve', resource: 'complaints', action: 'resolve', name: 'Resolve Complaints', module: 'complaints', allowedScopes: ['ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'complaints.delete', resource: 'complaints', action: 'delete', name: 'Delete Complaints', module: 'complaints', allowedScopes: ['ALL'], enabled: true, system: true },

  // Payments
  { key: 'payments.view', resource: 'payments', action: 'view', name: 'View Payments', module: 'payments', allowedScopes: ['OWN', 'ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'payments.create', resource: 'payments', action: 'create', name: 'Create Payments', module: 'payments', allowedScopes: ['ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'payments.update', resource: 'payments', action: 'update', name: 'Update Payments', module: 'payments', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'payments.collect', resource: 'payments', action: 'collect', name: 'Collect Payments', module: 'payments', allowedScopes: ['ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'payments.delete', resource: 'payments', action: 'delete', name: 'Delete Payments', module: 'payments', allowedScopes: ['ALL'], enabled: true, system: true },

  // Assets
  { key: 'assets.view', resource: 'assets', action: 'view', name: 'View Assets', module: 'assets', allowedScopes: ['ASSIGNED', 'LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'assets.create', resource: 'assets', action: 'create', name: 'Create Assets', module: 'assets', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'assets.update', resource: 'assets', action: 'update', name: 'Update Assets', module: 'assets', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'assets.assign', resource: 'assets', action: 'assign', name: 'Assign Assets', module: 'assets', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'assets.unassign', resource: 'assets', action: 'unassign', name: 'Unassign Assets', module: 'assets', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'assets.transfer', resource: 'assets', action: 'transfer', name: 'Transfer Assets', module: 'assets', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'assets.delete', resource: 'assets', action: 'delete', name: 'Delete Assets', module: 'assets', allowedScopes: ['ALL'], enabled: true, system: true },

  // Locations & Dealers
  { key: 'locations.view', resource: 'locations', action: 'view', name: 'View Locations', module: 'locations', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },
  { key: 'locations.create', resource: 'locations', action: 'create', name: 'Create Locations', module: 'locations', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'dealers.view', resource: 'dealers', action: 'view', name: 'View Dealers', module: 'dealers', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'inventory.view', resource: 'inventory', action: 'view', name: 'View Inventory', module: 'inventory', allowedScopes: ['LOCATION', 'ALL'], enabled: true, system: true },

  // Reports, Settings, Roles
  { key: 'reports.view', resource: 'reports', action: 'view', name: 'View Reports', module: 'reports', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'reports.export', resource: 'reports', action: 'export', name: 'Export Reports', module: 'reports', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'settings.view', resource: 'settings', action: 'view', name: 'View Settings', module: 'settings', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'settings.update', resource: 'settings', action: 'update', name: 'Update Settings', module: 'settings', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'roles.view', resource: 'roles', action: 'view', name: 'View Roles', module: 'roles', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'roles.create', resource: 'roles', action: 'create', name: 'Create Roles', module: 'roles', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'roles.update', resource: 'roles', action: 'update', name: 'Update Roles', module: 'roles', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'roles.delete', resource: 'roles', action: 'delete', name: 'Delete Roles', module: 'roles', allowedScopes: ['ALL'], enabled: true, system: true },
  { key: 'permissions.view', resource: 'permissions', action: 'view', name: 'View Permissions', module: 'permissions', allowedScopes: ['ALL'], enabled: true, system: true },
];

initializeApp({ projectId: PROJECT_ID });
const firestore = getFirestore();

async function seedPermissions() {
  console.log(`\n🔐 Seeding permissionRegistry on project "${PROJECT_ID}"...\n`);
  const batch = firestore.batch();

  for (const item of PERMISSION_REGISTRY_ITEMS) {
    const ref = firestore.collection('permissionRegistry').doc(item.key);
    batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();
  console.log(`✅ Seeded ${PERMISSION_REGISTRY_ITEMS.length} permissions into permissionRegistry collection.`);
}

seedPermissions().catch((err) => {
  console.error('Error seeding permissions:', err);
  process.exit(1);
});
