/**
 * Satya Cable & Broadband Network - Bulk Upload Script for Firestore
 *
 * Features:
 * 1. Bulk Operations: Uses Firestore Admin SDK `bulkWriter()` to execute batched
 *    writes efficiently (up to 500 writes per batch automatically queued and flushed),
 *    preventing write operation wastage and hitting rate limits.
 *
 * 2. Service Types & Provider Hierarchy:
 *    - Service Types: 'cable', 'internet', 'internet+iptv', 'apfiber'
 *    - Providers per Service Type:
 *        • cable: 'act' (ACT Cable Network - Current accounts), 'sitv' (SITV Cable)
 *        • internet: 'vbc' (VBC Broadband), 'bsnl' (BSNL Fiber)
 *        • internet+iptv: 'fiber_iptv' (Fiber + IPTV Combo)
 *        • apfiber: 'apsfl' (AP FiberNet)
 *
 * 3. Collection Separation & Bidirectional Relations:
 *    - `customers`: Customer personal details (name, phone, address). Contains `accountIds: string[]`
 *      and `activeServices: string[]` to allow one customer to own multiple service accounts across different types.
 *    - `customer_accounts`: Account-specific connection data (STB serial, VC number, status, provider, serviceType).
 *      Contains `customerId: string` pointing back to `customers/{customerId}`.
 *    - `services`: Mirror/Alias collection of customer_accounts for backward compatibility.
 *
 * 4. Packages & Provider Relations:
 *    - Package details inserted into `service_providers/{providerId}/packages/{packageId}`
 *      and top-level `packages/{packageId}` with relation to provider (`providerId: "cable_act"`).
 *    - `customer_accounts` docs maintain `packageIds: string[]` relation for package queries.
 *
 * Usage:
 *   node scripts/bulk_upload_customers.js
 * Or via npm/pnpm script:
 *   pnpm run seed:customers
 */

const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// -----------------------------------------------------------------------------
// Configuration & Credentials Setup
// -----------------------------------------------------------------------------
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'cableapp-642c4';
const SERVICE_ACCOUNT_FILE = path.join(__dirname, '..', 'cableapp-642c4-firebase-adminsdk-fbsvc-ee5e58c939.json');

let app;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  app = initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS), projectId: PROJECT_ID });
}
else if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
  app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
}
else {
  console.log(`ℹ️ Initializing Firebase Admin with default credentials for project: ${PROJECT_ID}`);
  app = initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore(app);

// -----------------------------------------------------------------------------
// Service Providers Registry Definition
// -----------------------------------------------------------------------------
const SERVICE_PROVIDERS = [
  {
    id: 'cable_act',
    serviceType: 'cable',
    serviceTypeName: 'Cable TV',
    provider: 'act',
    providerName: 'ACT Cable Network',
    isDefault: true,
    packageIds: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cable_sitv',
    serviceType: 'cable',
    serviceTypeName: 'Cable TV',
    provider: 'sitv',
    providerName: 'SITV Digital Cable',
    isDefault: false,
    packageIds: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'internet_vbc',
    serviceType: 'internet',
    serviceTypeName: 'High-Speed Broadband',
    provider: 'vbc',
    providerName: 'VBC Broadband Network',
    isDefault: false,
    packageIds: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'internet_bsnl',
    serviceType: 'internet',
    serviceTypeName: 'High-Speed Broadband',
    provider: 'bsnl',
    providerName: 'BSNL Bharat Fiber',
    isDefault: false,
    packageIds: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'internet_iptv_combo',
    serviceType: 'internet+iptv',
    serviceTypeName: 'Internet + IPTV Combo',
    provider: 'fiber_iptv',
    providerName: 'Fiber + IPTV Combo Digital',
    isDefault: false,
    packageIds: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'apfiber_apsfl',
    serviceType: 'apfiber',
    serviceTypeName: 'AP FiberNet (APSFL)',
    provider: 'apsfl',
    providerName: 'AP FiberNet Corporation',
    isDefault: false,
    packageIds: [],
    updatedAt: new Date().toISOString(),
  },
];

// Helper to generate a URL/Firestore friendly slug for package names
function getPkgSlug(pkgName) {
  if (!pkgName)
    return 'base_pack';
  return pkgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// -----------------------------------------------------------------------------
// HTML Report Parser (Fallback when JSON files are not present)
// -----------------------------------------------------------------------------
function parseReportHtml(filePath) {
  const htmlContent = fs.readFileSync(filePath, 'utf8');

  // Extract table row matches
  const trMatches = htmlContent.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  const rawAccounts = [];

  for (const tr of trMatches) {
    // Extract td contents
    const tdMatches = tr.match(/<td[\s\S]*?<\/td>/gi);
    if (!tdMatches || tdMatches.length < 10)
      continue;

    // Strip HTML tags and clean up text
    const cleanCells = tdMatches.map((cell) => {
      let text = cell.replace(/<[^>]+>/g, '').trim();
      text = text.replace(/^'/, ''); // remove leading single quote if any
      return text;
    });

    const [sno, acctNo, lcoCustId, stbSerial, vcNo, name, address, createdDate, phone, pkgName, status, msoShareDueStr] = cleanCells;

    if (!acctNo || acctNo.toLowerCase() === 'account no')
      continue;

    rawAccounts.push({
      accountNumber: acctNo,
      lcoCustomerId: lcoCustId || '',
      stbSerialNumber: stbSerial || '',
      vcNumber: vcNo || '',
      name: name || 'Unknown Customer',
      address: address || 'N/A',
      createdDate: createdDate || new Date().toISOString(),
      phone: phone || '919999999999',
      packageName: pkgName || 'Base Pack',
      status: (status || '').toLowerCase().includes('act') ? 'active' : 'inactive',
      msoShareDue: Number.parseFloat(msoShareDueStr || '0') || 0.0,
    });
  }

  return rawAccounts;
}

// -----------------------------------------------------------------------------
// Data Processing & Relationship Mapping
// -----------------------------------------------------------------------------
function processCustomerData() {
  const scriptsDir = __dirname;
  const dataDir = path.join(scriptsDir, 'data');
  const custJsonPath = path.join(dataDir, 'customers.json');
  const svcJsonPath = path.join(dataDir, 'services.json');
  const pkgJsonPath = path.join(dataDir, 'packages.json');
  const xlsPath = path.join(scriptsDir, 'Customer_account_status_report_2026-09-08 14_09_35.xls');

  let rawAccounts = [];

  // Try reading existing JSON or parse raw XLS
  if (fs.existsSync(custJsonPath) && fs.existsSync(svcJsonPath)) {
    console.log(`📦 Loading pre-parsed data from ${dataDir}...`);
    const customersArray = JSON.parse(fs.readFileSync(custJsonPath, 'utf8'));
    const servicesArray = JSON.parse(fs.readFileSync(svcJsonPath, 'utf8'));

    // Return structured collections directly
    return buildCollectionsFromExisting(customersArray, servicesArray);
  }
  else if (fs.existsSync(xlsPath)) {
    console.log(`📦 Parsing customer account status report: ${xlsPath}...`);
    rawAccounts = parseReportHtml(xlsPath);
  }
  else {
    throw new Error(`❌ No data source found! Please make sure ${xlsPath} or JSON files in ${dataDir} exist.`);
  }

  console.log(`   Found ${rawAccounts.length} raw account records.`);

  const DUMMY_PHONES = new Set(['919111111111', '919490712587', '', '919999999999']);
  const dedupKeyToCustId = {};
  let customerCounter = 10001;

  const customersMap = {};
  const accountsList = [];
  const packagesMap = {};

  for (const item of rawAccounts) {
    const phoneClean = (item.phone || '').replace(/\D/g, '');
    const normPhone = DUMMY_PHONES.has(phoneClean) ? '' : phoneClean;
    const normName = (item.name || '').toLowerCase().trim();
    const normAddr = (item.address || '').toLowerCase().trim();

    const dedupKey = normPhone
      ? `phone:${normPhone}`
      : `name_addr:${normName}_${normAddr}`;

    let custId;
    if (!dedupKeyToCustId[dedupKey]) {
      custId = `CUST-${customerCounter++}`;
      dedupKeyToCustId[dedupKey] = custId;

      customersMap[custId] = {
        id: custId,
        customerCode: `SAT-${custId}`,
        name: item.name || 'Unknown Customer',
        phone: item.phone || '919999999999',
        address: item.address || 'N/A',
        accountIds: [], // To be populated with relations
        activeServices: new Set(),
        createdAt: item.createdDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    else {
      custId = dedupKeyToCustId[dedupKey];
    }

    // Link account to customer
    customersMap[custId].accountIds.push(item.accountNumber);
    customersMap[custId].activeServices.add('cable');

    // Process Package
    const pkgName = item.packageName || 'Base Pack';
    const pkgSlug = getPkgSlug(pkgName);
    if (!packagesMap[pkgSlug]) {
      packagesMap[pkgSlug] = {
        id: pkgSlug,
        packageName: pkgName,
        serviceType: 'cable',
        provider: 'act',
        providerId: 'cable_act',
        providerName: 'ACT Cable Network',
        price: 0.0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    }

    // Account Document (service: 'cable', provider: 'act')
    const accountDoc = {
      id: item.accountNumber,
      accountNumber: item.accountNumber,
      customerId: custId, // Relation back to Customer
      lcoCustomerId: item.lcoCustomerId || '',
      stbSerialNumber: item.stbSerialNumber || '',
      vcNumber: item.vcNumber || '',
      serviceType: 'cable',
      serviceTypeName: 'Cable TV',
      provider: 'act',
      providerName: 'ACT Cable Network',
      providerId: 'cable_act',
      packageIds: [pkgSlug],
      packages: [pkgName],
      status: item.status || 'active',
      msoShareDue: item.msoShareDue || 0.0,
      createdAt: item.createdDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    accountsList.push(accountDoc);
  }

  // Convert activeServices set to array for Firestore
  const customersList = Object.values(customersMap).map(c => ({
    ...c,
    activeServices: Array.from(c.activeServices),
  }));

  const packagesList = Object.values(packagesMap);

  return { customersList, accountsList, packagesList };
}

function buildCollectionsFromExisting(customersArray, servicesArray) {
  const packagesMap = {};
  const customerAccountIdsMap = {};
  const customerServicesMap = {};

  const accountsList = servicesArray.map((s) => {
    const pkgName = (s.packages && s.packages[0]) ? s.packages[0] : 'Base Pack';
    const pkgSlug = (s.packageIds && s.packageIds[0]) ? s.packageIds[0] : getPkgSlug(pkgName);

    if (!packagesMap[pkgSlug]) {
      packagesMap[pkgSlug] = {
        id: pkgSlug,
        packageName: pkgName,
        serviceType: s.serviceCategory || 'cable',
        provider: s.provider || 'act',
        providerId: s.providerId || 'cable_act',
        providerName: s.providerName || 'ACT Cable Network',
        price: 0.0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    }

    const custId = s.customerId;
    if (!customerAccountIdsMap[custId]) {
      customerAccountIdsMap[custId] = [];
      customerServicesMap[custId] = new Set();
    }
    customerAccountIdsMap[custId].push(s.accountNumber || s.id);
    customerServicesMap[custId].add(s.serviceCategory || 'cable');

    return {
      id: s.id || s.accountNumber,
      accountNumber: s.accountNumber || s.id,
      customerId: custId,
      lcoCustomerId: s.lcoCustomerId || '',
      stbSerialNumber: s.stbSerialNumber || '',
      vcNumber: s.vcNumber || '',
      serviceType: s.serviceCategory || 'cable',
      serviceTypeName: s.serviceCategoryName || 'Cable TV',
      provider: s.provider || 'act',
      providerId: s.providerId || 'cable_act',
      providerName: s.providerName || 'ACT Cable Network',
      packageIds: [pkgSlug],
      packages: [pkgName],
      status: s.status || 'active',
      msoShareDue: s.msoShareDue || 0.0,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const customersList = customersArray.map(c => ({
    ...c,
    accountIds: customerAccountIdsMap[c.id] || [],
    activeServices: Array.from(customerServicesMap[c.id] || ['cable']),
    updatedAt: new Date().toISOString(),
  }));

  const packagesList = Object.values(packagesMap);

  return { customersList, accountsList, packagesList };
}

// -----------------------------------------------------------------------------
// Bulk Upload Execution via BulkWriter
// -----------------------------------------------------------------------------
async function runBulkUpload() {
  console.log('==================================================================');
  console.log('🚀 SATYA CABLE - FIRESTORE BULKWRITER CUSTOMER DATA UPLOADER');
  console.log('==================================================================');

  const { customersList, accountsList, packagesList } = processCustomerData();

  console.log(`\n📊 Data Overview to Upload:`);
  console.log(`   - Customers Collection:        ${customersList.length} documents`);
  console.log(`   - Accounts & Services:         ${accountsList.length} documents`);
  console.log(`   - Packages Collection:         ${packagesList.length} documents`);
  console.log(`   - Service Providers Registry:  ${SERVICE_PROVIDERS.length} documents`);

  // Initialize BulkWriter
  const bulkWriter = db.bulkWriter();
  let totalQueued = 0;
  let successCount = 0;
  let errorCount = 0;

  bulkWriter.onWriteResult((ref) => {
    successCount++;
    if (successCount % 250 === 0 || successCount === totalQueued) {
      console.log(`   ✅ Firestore BulkWriter Progress: ${successCount}/${totalQueued} docs committed...`);
    }
  });

  bulkWriter.onWriteError((ref, error, attempts) => {
    errorCount++;
    console.error(`   ❌ Write error for ${ref.path} (Attempt ${attempts}):`, error.message);
    if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
      console.warn(`   ⚠️ Rate limit / quota reached. BulkWriter will auto-retry up to limit.`);
    }
    return attempts <= 3; // Retry up to 3 times for transient errors
  });

  console.log(`\n🔥 Queueing documents for BulkWriter...`);

  // 1. Upload Service Providers Registry
  const actProvider = SERVICE_PROVIDERS.find(p => p.id === 'cable_act');
  if (actProvider) {
    actProvider.packageIds = packagesList.map(p => p.id);
  }

  for (const provider of SERVICE_PROVIDERS) {
    const ref = db.collection('service_providers').doc(provider.id);
    bulkWriter.set(ref, provider, { merge: true });
    totalQueued++;
  }

  // 2. Upload Packages (Top-level & Provider Subcollection)
  for (const pkg of packagesList) {
    // Root packages collection
    const rootRef = db.collection('packages').doc(pkg.id);
    bulkWriter.set(rootRef, pkg, { merge: true });
    totalQueued++;

    // Provider subcollection packages (service_providers/cable_act/packages/{pkgId})
    const providerPkgRef = db
      .collection('service_providers')
      .doc('cable_act')
      .collection('packages')
      .doc(pkg.id);
    bulkWriter.set(providerPkgRef, pkg, { merge: true });
    totalQueued++;
  }

  // 3. Upload Customers Collection
  for (const cust of customersList) {
    const ref = db.collection('customers').doc(cust.id);
    bulkWriter.set(ref, cust, { merge: true });
    totalQueued++;
  }

  // 4. Upload Customer Accounts Collection (`customer_accounts` & mirror to `services`)
  for (const acct of accountsList) {
    // Primary customer_accounts collection
    const acctRef = db.collection('customer_accounts').doc(acct.id);
    bulkWriter.set(acctRef, acct, { merge: true });
    totalQueued++;

    // Mirror to services collection for legacy query compatibility
    const svcRef = db.collection('services').doc(acct.id);
    bulkWriter.set(svcRef, acct, { merge: true });
    totalQueued++;
  }

  console.log(`⚡ Flushing ${totalQueued} queued write operations to Firestore via BulkWriter...`);

  await bulkWriter.close();

  console.log('\n==================================================================');
  console.log('🎉 BULK UPLOAD TO FIRESTORE COMPLETE!');
  console.log(`   - Total Operations Committed: ${successCount} / ${totalQueued}`);
  console.log(`   - Customers Created/Updated:  ${customersList.length}`);
  console.log(`   - Accounts Created/Updated:   ${accountsList.length}`);
  console.log(`   - Packages Created/Updated:   ${packagesList.length}`);
  console.log(`   - Service Providers Seeded:   ${SERVICE_PROVIDERS.length}`);
  console.log('==================================================================');
}

// Execute main upload function
runBulkUpload().catch((err) => {
  console.error('\n⛔ FATAL ERROR DURING BULK UPLOAD:', err);
  process.exit(1);
});
