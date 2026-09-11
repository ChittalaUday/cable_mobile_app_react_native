/**
 * Seeds `appRegistry` collection with searchable/discoverable screens & actions.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-app-registry.js
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'cableapp-642c4';

const APP_REGISTRY_ITEMS = [
  // Screens
  {
    id: 'screen-customers',
    key: 'customers',
    type: 'screen',
    title: 'Customers',
    description: 'View and manage customer accounts and subscriptions',
    route: '/(app)/customers',
    icon: 'users',
    keywords: ['customers', 'subscribers', 'users', 'accounts'],
    requiredPermission: 'customers.view',
    searchable: true,
    enabled: true,
    order: 10,
  },
  {
    id: 'screen-complaints',
    key: 'complaints',
    type: 'screen',
    title: 'Complaints',
    description: 'Manage service tickets and customer complaints',
    route: '/(app)/complaints',
    icon: 'alert-circle',
    keywords: ['complaints', 'tickets', 'issues', 'service', 'support'],
    requiredPermission: 'complaints.view',
    searchable: true,
    enabled: true,
    order: 20,
  },
  {
    id: 'screen-payments',
    key: 'payments',
    type: 'screen',
    title: 'Payments',
    description: 'View collection records and process payments',
    route: '/(app)/payments',
    icon: 'credit-card',
    keywords: ['payments', 'collections', 'billing', 'dues', 'receipts'],
    requiredPermission: 'payments.view',
    searchable: true,
    enabled: true,
    order: 30,
  },
  {
    id: 'screen-reports',
    key: 'reports',
    type: 'screen',
    title: 'Reports & Analytics',
    description: 'Analytics, revenue overview, and collection reports',
    route: '/(app)/admin/analytics',
    icon: 'bar-chart',
    keywords: ['reports', 'analytics', 'revenue', 'dashboard', 'stats'],
    requiredPermission: 'reports.view',
    searchable: true,
    enabled: true,
    order: 40,
  },
  {
    id: 'screen-settings',
    key: 'settings',
    type: 'screen',
    title: 'Settings',
    description: 'Application and network operator configuration',
    route: '/(app)/settings',
    icon: 'settings',
    keywords: ['settings', 'config', 'preferences', 'profile'],
    requiredPermission: 'settings.view',
    searchable: true,
    enabled: true,
    order: 50,
  },

  // Actions
  {
    id: 'action-add-customer',
    key: 'customers.create',
    type: 'action',
    title: 'Add Customer',
    description: 'Register a new customer account',
    route: '/(app)/customers/create',
    icon: 'user-plus',
    keywords: ['add customer', 'new customer', 'new subscriber', 'create customer'],
    requiredPermission: 'customers.create',
    searchable: true,
    enabled: true,
    featured: true,
  },
  {
    id: 'action-collect-payment',
    key: 'payments.collect',
    type: 'action',
    title: 'Collect Payment',
    description: 'Record a new customer bill payment',
    route: '/(app)/payments/collect',
    icon: 'dollar-sign',
    keywords: ['collect payment', 'pay bill', 'record payment', 'collect'],
    requiredPermission: 'payments.collect',
    searchable: true,
    enabled: true,
    featured: true,
  },
  {
    id: 'action-create-complaint',
    key: 'complaints.create',
    type: 'action',
    title: 'Log Complaint',
    description: 'Report a new service outage or complaint ticket',
    route: '/(app)/complaints/create',
    icon: 'plus-circle',
    keywords: ['log complaint', 'new ticket', 'report issue', 'create complaint'],
    requiredPermission: 'complaints.create',
    searchable: true,
    enabled: true,
    featured: true,
  },
];

initializeApp({ projectId: PROJECT_ID });
const firestore = getFirestore();

async function seedAppRegistry() {
  console.log(`\n📱 Seeding appRegistry on project "${PROJECT_ID}"...\n`);
  const batch = firestore.batch();

  for (const item of APP_REGISTRY_ITEMS) {
    const ref = firestore.collection('appRegistry').doc(item.id);
    batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();
  console.log(`✅ Seeded ${APP_REGISTRY_ITEMS.length} items into appRegistry collection.`);
}

seedAppRegistry().catch((err) => {
  console.error('Error seeding appRegistry:', err);
  process.exit(1);
});
