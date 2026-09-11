/**
 * Re-compiles `userAccess/{uid}` documents for all users in Firestore.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/compile-user-access.js
 */
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'cableapp-642c4';

const SCOPE_HIERARCHY = { OWN: 1, ASSIGNED: 2, TEAM: 3, LOCATION: 4, ALL: 5 };

function mergeScopes(scopeA, scopeB) {
  return SCOPE_HIERARCHY[scopeA] >= SCOPE_HIERARCHY[scopeB] ? scopeA : scopeB;
}

function compileUserAccess(user, roles, version = 1) {
  const mergedPermissions = {};
  const activeRoleIds = new Set(user.roleIds || (user.role ? [user.role] : []));

  for (const role of roles) {
    if (!role.enabled || !activeRoleIds.has(role.id))
      continue;
    for (const [permKey, setting] of Object.entries(role.permissions || {})) {
      if (!setting || !setting.scope)
        continue;
      const currentScope = mergedPermissions[permKey];
      mergedPermissions[permKey] = currentScope ? mergeScopes(currentScope, setting.scope) : setting.scope;
    }
  }

  if (user.permissionOverrides) {
    for (const [permKey, override] of Object.entries(user.permissionOverrides)) {
      if (override.effect === 'DENY') {
        delete mergedPermissions[permKey];
      }
      else if (override.effect === 'ALLOW' && override.scope) {
        const currentScope = mergedPermissions[permKey];
        mergedPermissions[permKey] = currentScope ? mergeScopes(currentScope, override.scope) : override.scope;
      }
    }
  }

  const locationLookup = {};
  if (Array.isArray(user.locationIds)) {
    for (const locId of user.locationIds) {
      if (locId)
        locationLookup[locId] = true;
    }
  }

  const areaLookup = {};
  if (Array.isArray(user.areaIds)) {
    for (const areaId of user.areaIds) {
      if (areaId)
        areaLookup[areaId] = true;
    }
  }

  const tenantIds = Array.isArray(user.tenantIds)
    ? user.tenantIds
    : user.tenantId
      ? [user.tenantId]
      : [];

  return {
    uid: user.uid,
    permissions: mergedPermissions,
    locationIds: locationLookup,
    areaIds: areaLookup,
    tenantId: user.tenantId || tenantIds[0] || null,
    tenantIds,
    teamId: user.teamId || null,
    version,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

initializeApp({ projectId: PROJECT_ID });
const firestore = getFirestore();

async function compileAllUserAccess() {
  console.log(`\n⚙️ Compiling userAccess for all users on project "${PROJECT_ID}"...\n`);

  const rolesSnap = await firestore.collection('roles').get();
  const roles = rolesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const usersSnap = await firestore.collection('users').get();
  console.log(`Found ${usersSnap.docs.length} users and ${roles.length} roles.`);

  let count = 0;
  for (const doc of usersSnap.docs) {
    const user = { uid: doc.id, ...doc.data() };
    const compiled = compileUserAccess(user, roles);
    await firestore.collection('userAccess').doc(user.uid).set(compiled, { merge: true });
    count++;
    console.log(`  ✅ Compiled userAccess/${user.uid} (${Object.keys(compiled.permissions).length} permissions)`);
  }

  console.log(`\n✅ Completed compiling userAccess for ${count} users.\n`);
}

compileAllUserAccess().catch((err) => {
  console.error('Error compiling userAccess:', err);
  process.exit(1);
});
