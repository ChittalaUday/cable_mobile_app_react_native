#!/usr/bin/env python3
"""
Satya Cable & Broadband Network - Firestore Bulk Upload Script (Python)

Features:
1. Bulk Operations: Uses Firestore Python SDK `bulk_writer()` to execute batched
   writes efficiently (up to 500 writes per batch automatically queued and flushed).
   
2. Service Types & Provider Hierarchy:
   - Service Types: 'cable', 'internet', 'internet+iptv', 'apfiber'
   - Providers per Service Type:
       • cable: 'act' (ACT Cable Network - Current accounts), 'sitv' (SITV Cable)
       • internet: 'vbc' (VBC Broadband), 'bsnl' (BSNL Fiber)
       • internet+iptv: 'fiber_iptv' (Fiber + IPTV Combo)
       • apfiber: 'apsfl' (AP FiberNet)

3. Collection Separation & Relations:
   - `customers`: Customer personal details. Contains `accountIds` array & `activeServices` array.
   - `customer_accounts`: Connection details. Contains `customerId` reference pointing back to `customers`.
   - `services`: Mirror collection of `customer_accounts` for compatibility.
   - `service_providers` & `packages`: Registry for providers & package details.

Usage:
   python3 scripts/bulk_upload_customers.py
"""

import os
import re
import json
from datetime import datetime, timezone
from google.cloud import firestore
from google.oauth2 import service_account

# -----------------------------------------------------------------------------
# Config & Credentials Setup
# -----------------------------------------------------------------------------
PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "cableapp-642c4")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
SERVICE_ACCOUNT_FILE = os.path.join(ROOT_DIR, "cableapp-642c4-firebase-adminsdk-fbsvc-ee5e58c939.json")

def get_now_iso():
    return datetime.now(timezone.utc).isoformat()

def get_db_client():
    sa_env = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_env and os.path.exists(sa_env):
        print(f"🔑 Authenticating using GOOGLE_APPLICATION_CREDENTIALS: {sa_env}")
        creds = service_account.Credentials.from_service_account_file(sa_env)
        return firestore.Client(project=PROJECT_ID, credentials=creds)
    elif os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"🔑 Authenticating using service account file: {SERVICE_ACCOUNT_FILE}")
        creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
        return firestore.Client(project=PROJECT_ID, credentials=creds)
    else:
        print(f"ℹ️ Initializing Firestore Client with default credentials for project: {PROJECT_ID}")
        return firestore.Client(project=PROJECT_ID)

# -----------------------------------------------------------------------------
# Service Providers Registry
# -----------------------------------------------------------------------------
SERVICE_PROVIDERS = [
    {
        "id": "cable_act",
        "serviceType": "cable",
        "serviceTypeName": "Cable TV",
        "provider": "act",
        "providerName": "ACT Cable Network",
        "isDefault": True,
        "packageIds": [],
        "updatedAt": get_now_iso()
    },
    {
        "id": "cable_sitv",
        "serviceType": "cable",
        "serviceTypeName": "Cable TV",
        "provider": "sitv",
        "providerName": "SITV Digital Cable",
        "isDefault": False,
        "packageIds": [],
        "updatedAt": get_now_iso()
    },
    {
        "id": "internet_vbc",
        "serviceType": "internet",
        "serviceTypeName": "High-Speed Broadband",
        "provider": "vbc",
        "providerName": "VBC Broadband Network",
        "isDefault": False,
        "packageIds": [],
        "updatedAt": get_now_iso()
    },
    {
        "id": "internet_bsnl",
        "serviceType": "internet",
        "serviceTypeName": "High-Speed Broadband",
        "provider": "bsnl",
        "providerName": "BSNL Bharat Fiber",
        "isDefault": False,
        "packageIds": [],
        "updatedAt": get_now_iso()
    },
    {
        "id": "internet_iptv_combo",
        "serviceType": "internet+iptv",
        "serviceTypeName": "Internet + IPTV Combo",
        "provider": "fiber_iptv",
        "providerName": "Fiber + IPTV Combo Digital",
        "isDefault": False,
        "packageIds": [],
        "updatedAt": get_now_iso()
    },
    {
        "id": "apfiber_apsfl",
        "serviceType": "apfiber",
        "serviceTypeName": "AP FiberNet (APSFL)",
        "provider": "apsfl",
        "providerName": "AP FiberNet Corporation",
        "isDefault": False,
        "packageIds": [],
        "updatedAt": get_now_iso()
    }
]

def get_pkg_slug(pkg_name):
    if not pkg_name:
        return "base_pack"
    slug = re.sub(r'[^a-z0-9]+', '_', pkg_name.lower()).strip('_')
    return slug or "base_pack"

def parse_report_html(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        html_content = f.read()

    tr_matches = re.findall(r'<tr[\s\S]*?</tr>', html_content, re.IGNORECASE)
    raw_accounts = []

    for tr in tr_matches:
        td_matches = re.findall(r'<td[\s\S]*?</td>', tr, re.IGNORECASE)
        if not td_matches or len(td_matches) < 10:
            continue

        clean_cells = []
        for cell in td_matches:
            text = re.sub(r'<[^>]+>', '', cell).strip()
            if text.startswith("'"):
                text = text[1:]
            clean_cells.append(text)

        acct_no = clean_cells[1] if len(clean_cells) > 1 else ""
        if not acct_no or acct_no.lower() == "account no":
            continue

        raw_accounts.append({
            "accountNumber": acct_no,
            "lcoCustomerId": clean_cells[2] if len(clean_cells) > 2 else "",
            "stbSerialNumber": clean_cells[3] if len(clean_cells) > 3 else "",
            "vcNumber": clean_cells[4] if len(clean_cells) > 4 else "",
            "name": clean_cells[5] if len(clean_cells) > 5 else "Unknown Customer",
            "address": clean_cells[6] if len(clean_cells) > 6 else "N/A",
            "createdDate": clean_cells[7] if len(clean_cells) > 7 else get_now_iso(),
            "phone": clean_cells[8] if len(clean_cells) > 8 else "919999999999",
            "packageName": clean_cells[9] if len(clean_cells) > 9 else "Base Pack",
            "status": "active" if "act" in (clean_cells[10].lower() if len(clean_cells) > 10 else "") else "inactive",
            "msoShareDue": float(clean_cells[11].replace(',', '')) if len(clean_cells) > 11 and clean_cells[11] else 0.0
        })

    return raw_accounts

def load_data():
    data_dir = os.path.join(SCRIPT_DIR, "data")
    cust_json = os.path.join(data_dir, "customers.json")
    svc_json = os.path.join(data_dir, "services.json")
    xls_path = os.path.join(SCRIPT_DIR, "Customer_account_status_report_2026-09-08 14_09_35.xls")

    if os.path.exists(cust_json) and os.path.exists(svc_json):
        print(f"📦 Reading dataset from JSON files in {data_dir}...")
        with open(cust_json, 'r', encoding='utf-8') as f:
            customers_raw = json.load(f)
        with open(svc_json, 'r', encoding='utf-8') as f:
            services_raw = json.load(f)

        packages_map = {}
        cust_accounts_map = {}
        cust_services_map = {}

        accounts_list = []
        for s in services_raw:
            pkg_name = s.get("packages", ["Base Pack"])[0] if s.get("packages") else "Base Pack"
            pkg_slug = s.get("packageIds", [get_pkg_slug(pkg_name)])[0] if s.get("packageIds") else get_pkg_slug(pkg_name)

            if pkg_slug not in packages_map:
                packages_map[pkg_slug] = {
                    "id": pkg_slug,
                    "packageName": pkg_name,
                    "serviceType": s.get("serviceCategory", "cable"),
                    "provider": s.get("provider", "act"),
                    "providerId": s.get("providerId", "cable_act"),
                    "providerName": s.get("providerName", "ACT Cable Network"),
                    "price": 0.0,
                    "isActive": True,
                    "createdAt": get_now_iso()
                }

            c_id = s.get("customerId")
            if c_id not in cust_accounts_map:
                cust_accounts_map[c_id] = []
                cust_services_map[c_id] = set()
            
            acct_id = s.get("accountNumber") or s.get("id")
            cust_accounts_map[c_id].append(acct_id)
            cust_services_map[c_id].add(s.get("serviceCategory", "cable"))

            accounts_list.append({
                "id": acct_id,
                "accountNumber": acct_id,
                "customerId": c_id,
                "lcoCustomerId": s.get("lcoCustomerId", ""),
                "stbSerialNumber": s.get("stbSerialNumber", ""),
                "vcNumber": s.get("vcNumber", ""),
                "serviceType": s.get("serviceCategory", "cable"),
                "serviceTypeName": s.get("serviceCategoryName", "Cable TV"),
                "provider": s.get("provider", "act"),
                "providerName": s.get("providerName", "ACT Cable Network"),
                "providerId": s.get("providerId", "cable_act"),
                "packageIds": [pkg_slug],
                "packages": [pkg_name],
                "status": s.get("status", "active"),
                "msoShareDue": s.get("msoShareDue", 0.0),
                "createdAt": s.get("createdAt", get_now_iso()),
                "updatedAt": get_now_iso()
            })

        customers_list = []
        for c in customers_raw:
            c_id = c["id"]
            customers_list.append({
                "id": c_id,
                "customerCode": c.get("customerCode", f"SAT-{c_id}"),
                "name": c.get("name", "Unknown Customer"),
                "phone": c.get("phone", "919999999999"),
                "address": c.get("address", "N/A"),
                "accountIds": cust_accounts_map.get(c_id, []),
                "activeServices": list(cust_services_map.get(c_id, {"cable"})),
                "createdAt": c.get("createdAt", get_now_iso()),
                "updatedAt": get_now_iso()
            })

        return customers_list, accounts_list, list(packages_map.values())
    elif os.path.exists(xls_path):
        print(f"📦 Parsing customer report XLS/HTML: {xls_path}...")
        raw_accounts = parse_report_html(xls_path)
        print(f"   Found {len(raw_accounts)} raw account records.")

        dummy_phones = {'919111111111', '919490712587', '', '919999999999'}
        dedup_map = {}
        cust_counter = 10001
        cust_dict = {}
        accounts_list = []
        packages_map = {}

        for item in raw_accounts:
            phone_clean = re.sub(r'[^0-9]', '', item["phone"])
            norm_phone = "" if phone_clean in dummy_phones else phone_clean
            norm_name = item["name"].lower().strip()
            norm_addr = item["address"].lower().strip()

            dedup_key = f"phone:{norm_phone}" if norm_phone else f"name_addr:{norm_name}_{norm_addr}"
            if dedup_key not in dedup_map:
                c_id = f"CUST-{cust_counter}"
                cust_counter += 1
                dedup_map[dedup_key] = c_id
                cust_dict[c_id] = {
                    "id": c_id,
                    "customerCode": f"SAT-{c_id}",
                    "name": item["name"],
                    "phone": item["phone"],
                    "address": item["address"],
                    "accountIds": [],
                    "activeServices": set(),
                    "createdAt": item["createdDate"],
                    "updatedAt": get_now_iso()
                }
            else:
                c_id = dedup_map[dedup_key]

            cust_dict[c_id]["accountIds"].append(item["accountNumber"])
            cust_dict[c_id]["activeServices"].add("cable")

            pkg_name = item["packageName"]
            pkg_slug = get_pkg_slug(pkg_name)
            if pkg_slug not in packages_map:
                packages_map[pkg_slug] = {
                    "id": pkg_slug,
                    "packageName": pkg_name,
                    "serviceType": "cable",
                    "provider": "act",
                    "providerId": "cable_act",
                    "providerName": "ACT Cable Network",
                    "price": 0.0,
                    "isActive": True,
                    "createdAt": get_now_iso()
                }

            accounts_list.append({
                "id": item["accountNumber"],
                "accountNumber": item["accountNumber"],
                "customerId": c_id,
                "lcoCustomerId": item["lcoCustomerId"],
                "stbSerialNumber": item["stbSerialNumber"],
                "vcNumber": item["vcNumber"],
                "serviceType": "cable",
                "serviceTypeName": "Cable TV",
                "provider": "act",
                "providerName": "ACT Cable Network",
                "providerId": "cable_act",
                "packageIds": [pkg_slug],
                "packages": [pkg_name],
                "status": item["status"],
                "msoShareDue": item["msoShareDue"],
                "createdAt": item["createdDate"],
                "updatedAt": get_now_iso()
            })

        customers_list = []
        for c in cust_dict.values():
            c["activeServices"] = list(c["activeServices"])
            customers_list.append(c)

        return customers_list, accounts_list, list(packages_map.values())
    else:
        raise FileNotFoundError(f"❌ Customer dataset report not found: {xls_path}")

def run_bulk_upload():
    print("==================================================================")
    print("🚀 SATYA CABLE - FIRESTORE BULK UPLOADER (PYTHON)")
    print("==================================================================")

    db = get_db_client()
    customers_list, accounts_list, packages_list = load_data()

    print(f"\n📊 Summary of Records to Seed:")
    print(f"   - Customers:         {len(customers_list)}")
    print(f"   - Customer Accounts: {len(accounts_list)}")
    print(f"   - Packages:          {len(packages_list)}")
    print(f"   - Service Providers: {len(SERVICE_PROVIDERS)}")

    act_provider = next((p for p in SERVICE_PROVIDERS if p["id"] == "cable_act"), None)
    if act_provider:
        act_provider["packageIds"] = [p["id"] for p in packages_list]

    bulk_writer = db.bulk_writer()
    total_queued = 0

    print("\n🔥 Queueing write operations into Firestore BulkWriter...")

    # 1. Service Providers
    for provider in SERVICE_PROVIDERS:
        ref = db.collection("service_providers").document(provider["id"])
        bulk_writer.set(ref, provider, merge=True)
        total_queued += 1

    # 2. Packages
    for pkg in packages_list:
        root_ref = db.collection("packages").document(pkg["id"])
        bulk_writer.set(root_ref, pkg, merge=True)
        total_queued += 1

        provider_pkg_ref = db.collection("service_providers").document("cable_act").collection("packages").document(pkg["id"])
        bulk_writer.set(provider_pkg_ref, pkg, merge=True)
        total_queued += 1

    # 3. Customers
    for cust in customers_list:
        ref = db.collection("customers").document(cust["id"])
        bulk_writer.set(ref, cust, merge=True)
        total_queued += 1

    # 4. Customer Accounts & Services
    for acct in accounts_list:
        acct_ref = db.collection("customer_accounts").document(acct["id"])
        bulk_writer.set(acct_ref, acct, merge=True)
        total_queued += 1

        svc_ref = db.collection("services").document(acct["id"])
        bulk_writer.set(svc_ref, acct, merge=True)
        total_queued += 1

    print(f"⚡ Flushing {total_queued} batched write operations via BulkWriter...")
    bulk_writer.close()

    print("\n==================================================================")
    print("🎉 FIRESTORE BULK UPLOAD COMPLETE!")
    print(f"   - Total Operations Executed: {total_queued}")
    print("==================================================================")

if __name__ == "__main__":
    run_bulk_upload()
