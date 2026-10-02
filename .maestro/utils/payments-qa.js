// A second device for the payment race flows: it talks to the same backend the
// app does, as the seeded SSCN admin, and leaves what it saw in `output.qa*`.
//
//   ACTION=setup    a fresh customer on Satya Basic → qaCustomerId, qaLineId, qaName, qaPhone
//   ACTION=pay      AMOUNT on that line ("null" marks it due)   → qaLastReceiptId
//   ACTION=reverse  refunds qaLastReceiptId                       → qaLastReceiptId (the refund)
//   ACTION=state    → qaBalance, qaLineBalance, qaReceipts, qaNextCharge; throws if the
//                   customer's balance is not the sum of its lines
//
// API_URL defaults to the backend the development build talks to (adb reverse :5050).
var base = (typeof API_URL === 'undefined' ? 'http://localhost:5050' : API_URL) + '/api/v1';
var device = 'e2e-maestro-second-device';

function headers(token, body) {
  var h = { 'X-Device-Id': device, 'X-Platform': 'android' };
  if (token)
    h.Authorization = 'Bearer ' + token;
  if (body)
    h['Content-Type'] = 'application/json';
  return h;
}

function request(method, path, token, body) {
  var options = { headers: headers(token, body !== undefined) };
  if (body !== undefined)
    options.body = JSON.stringify(body);
  var response = method === 'GET' ? http.get(base + path, options) : http.post(base + path, options);
  if (response.status >= 300)
    throw new Error(method + ' ' + path + ' → ' + response.status + ' ' + response.body);
  return json(response.body);
}

function uuid() {
  return 'qa-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
}

var token = request('POST', '/auth/login', null, { identifier: 'admin@sscn.com', password: 'Admin@123456' }).accessToken;

if (ACTION === 'setup') {
  var plan = request('GET', '/plans?status=active&limit=100', token).items.filter(function (p) { return p.slug === 'satya-basic'; })[0];
  var location = request('GET', '/locations?limit=1', token).items[0];
  var stamp = String(Date.now()).slice(-6);
  output.qaName = 'QA Race ' + stamp;
  output.qaPhone = '9667' + stamp;
  output.qaPlanAmount = plan.amount;
  var created = request('POST', '/customers', token, {
    name: output.qaName,
    phone: output.qaPhone,
    connection: { planId: plan.id, locationId: location.id },
  });
  output.qaCustomerId = created.id;
  output.qaLineId = created.subscriptions[0].id;
}
else if (ACTION === 'pay') {
  var amount = AMOUNT === 'null' ? null : AMOUNT;
  var body = { customerId: output.qaCustomerId, subscriptionId: output.qaLineId, amount: amount, reference: uuid(), latitude: 16.8697, longitude: 81.9342, gpsAccuracyM: 12 };
  if (amount === null)
    body.reason = 'Second device: not home';
  else
    body.method = 'cash';
  var receipt = request('POST', '/payments/subscription', token, body);
  output.qaLastReceiptId = receipt.id;
}
else if (ACTION === 'reverse') {
  output.qaLastReceiptId = request('POST', '/payments/' + output.qaLastReceiptId + '/reverse', token, { reason: 'Second device refund', reference: uuid() }).id;
}
else if (ACTION === 'state') {
  var detail = request('GET', '/customers/' + output.qaCustomerId, token);
  var line = detail.subscriptions[0];
  output.qaBalance = detail.outstandingBalance;
  output.qaLineBalance = line.outstandingBalance;
  output.qaNextCharge = line.nextPlanCharge;
  output.qaReceipts = request('GET', '/payments?limit=1&customerId=' + output.qaCustomerId, token).totals.receipts;
  var sum = detail.subscriptions.reduce(function (total, l) { return total + Math.round(Number(l.outstandingBalance) * 100); }, 0);
  if (sum !== Math.round(Number(detail.outstandingBalance) * 100))
    throw new Error('Customer balance ' + detail.outstandingBalance + ' is not the sum of its lines');
}
else {
  throw new Error('Unknown ACTION ' + ACTION);
}
console.log('payments-qa ' + ACTION + ': balance=' + output.qaBalance + ' receipts=' + output.qaReceipts + ' last=' + output.qaLastReceiptId);
