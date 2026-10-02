// Counts the receipts the API holds for CUSTOMER_ID and leaves the number in
// output.receiptCount. Runs on the host, so it talks to the backend directly
// (API_URL, default the e2e backend on :5051) as the seeded SSCN admin.
var base = (typeof API_URL === 'undefined' ? 'http://localhost:5051' : API_URL) + '/api/v1';
var device = { 'X-Device-Id': 'e2e-maestro-payments', 'X-Platform': 'android' };

var login = http.post(base + '/auth/login', {
  headers: { 'X-Device-Id': device['X-Device-Id'], 'X-Platform': 'android', 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'admin@sscn.com', password: 'Admin@123456' }),
});
var token = json(login.body).accessToken;

var page = http.get(base + '/payments?limit=1&customerId=' + CUSTOMER_ID, {
  headers: { 'X-Device-Id': device['X-Device-Id'], 'X-Platform': 'android', 'Authorization': 'Bearer ' + token },
});
output.receiptCount = json(page.body).totals.receipts;
console.log('receipts for ' + CUSTOMER_ID + ': ' + output.receiptCount);
