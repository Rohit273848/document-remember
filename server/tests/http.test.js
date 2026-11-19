import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/hearth_test';
process.env.JWT_SECRET ||= 'unit-test-secret-value-at-least-thirty-two-characters';
process.env.NODE_ENV = 'test';
const { default: app } = await import('../app.js');

test('health route returns the service status without opening a database connection', () => {
  const layer = app._router.stack.find((item) => item.route?.path === '/api/health');
  assert.ok(layer, 'health route is registered');
  const response = { json(body) { this.body = body; return this; } };
  layer.route.stack[0].handle({}, response);
  assert.deepEqual(response.body, { status: 'ok', service: 'hearth-api' });
});

test('unknown paths use the standard error shape', async () => {
  const { notFound, errorHandler } = await import('../middleware/errorHandler.js');
  let error;
  notFound({}, {}, (value) => { error = value; });
  const response = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  errorHandler(error, {}, response, () => {});
  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { error: { message: 'The requested page was not found.', code: 'NOT_FOUND' } });
});

test('Cloudinary uses the image resource type for image uploads', async () => {
  const { getStorageResourceType } = await import('../services/storage.js');
  assert.equal(getStorageResourceType('image/jpeg'), 'image');
  assert.equal(getStorageResourceType('image/png'), 'image');
  assert.equal(getStorageResourceType('image/webp'), 'image');
  assert.equal(getStorageResourceType('application/pdf'), 'raw');
});

test('renewal checks the multipart family ID before validation removes it', async () => {
  const { default: documentsRouter } = await import('../routes/documents.js');
  const FamilyMember = (await import('../models/FamilyMember.js')).default;
  const route = documentsRouter.stack.find((item) => item.route?.path === '/:id/renew')?.route;
  assert.ok(route, 'renewal route is registered');
  const originalFindOne = FamilyMember.findOne;
  const familyId = '64b000000000000000000001';
  FamilyMember.findOne = () => ({ populate: async () => ({ role: 'keeper', familyId: { _id: familyId, familyName: 'Test family' } }) });
  try {
    assert.equal(route.stack[0].handle.name, 'uploadDocument');
    const req = { params: { id: '64b000000000000000000002' }, query: {}, body: { familyId, expiryDate: '2030-01-01' }, user: { id: '64b000000000000000000003' } };
    await new Promise((resolve, reject) => route.stack[1].handle(req, {}, (error) => error ? reject(error) : resolve()));
    await new Promise((resolve, reject) => route.stack[2].handle(req, {}, (error) => error ? reject(error) : resolve()));
    assert.equal(req.family.familyName, 'Test family');
    assert.equal(req.body.familyId, undefined, 'validation may strip familyId after access has been checked');
  } finally {
    FamilyMember.findOne = originalFindOne;
  }
});

test('reminder email includes a readable subject, safe HTML, and a text fallback', async () => {
  const { buildReminderEmail } = await import('../services/email.js');
  const mail = buildReminderEmail({ documentTitle: 'Passport', message: 'Passport <old> expires in 30 days.', url: 'https://example.com/documents/123?a=1&b=2' });
  assert.equal(mail.subject, 'Renewal reminder: Passport');
  assert.match(mail.text, /Passport <old> expires in 30 days\./);
  assert.match(mail.html, /Passport &lt;old&gt; expires in 30 days\./);
  assert.match(mail.html, /href="https:\/\/example\.com\/documents\/123\?a=1&amp;b=2"/);
  assert.match(mail.html, /Open family documents/);
});
