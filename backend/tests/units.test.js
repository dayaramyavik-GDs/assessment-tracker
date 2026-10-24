const { randomUUID } = require('crypto');
const { app, request, startDB, stopDB, clearDB, registerUser } = require('./helpers');

beforeAll(startDB);
afterEach(clearDB);
afterAll(stopDB);

const unitBody = { code: 'ICT301', name: 'Mobile Development', semester: '2026-S2', targetGrade: 70 };
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function createUnit(token, body = unitBody) {
  return request(app).post('/api/units').set(auth(token)).send(body);
}

test('rejects requests without a token', async () => {
  expect((await request(app).get('/api/units')).status).toBe(401);
});

test('creates a unit and lists it with a summary', async () => {
  const { token } = await registerUser();
  expect((await createUnit(token)).status).toBe(201);
  const list = await request(app).get('/api/units').set(auth(token));
  expect(list.body).toHaveLength(1);
  expect(list.body[0].summary.targetGrade).toBe(70);
});

test('another user gets 404 for my unit', async () => {
  const me = await registerUser();
  const other = await registerUser();
  const { body } = await createUnit(me.token);
  const res = await request(app).get(`/api/units/${body.unit._id}`).set(auth(other.token));
  expect(res.status).toBe(404);
});

test('ignores a userId sent in the body (mass assignment)', async () => {
  const me = await registerUser();
  const other = await registerUser();
  const { body } = await createUnit(me.token, { ...unitBody, userId: other.user.id });
  expect(String(body.unit.userId)).toBe(String(me.user.id));
});

test('invalid id returns 400', async () => {
  const { token } = await registerUser();
  expect((await request(app).get('/api/units/123').set(auth(token))).status).toBe(400);
});

test('duplicate unit code in the same semester returns 409', async () => {
  const { token } = await registerUser();
  await createUnit(token);
  const res = await createUnit(token);
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('DUPLICATE_UNIT');
});

test('same clientId twice creates only one unit', async () => {
  const { token } = await registerUser();
  const body = { ...unitBody, clientId: randomUUID() };
  const a = await createUnit(token, body);
  const b = await createUnit(token, body);
  expect(a.status).toBe(201);
  expect(b.status).toBe(200);
  expect(b.body.unit._id).toBe(a.body.unit._id);
});

describe('assessments in a unit', () => {
  let token;
  let unitId;
  const post = (body) => request(app).post('/api/assessments').set(auth(token)).send(body);
  const base = () => ({ unitId, title: 'Assignment 1', type: 'assignment', dueAt: '2026-11-01T13:00:00.000Z' });

  beforeEach(async () => {
    ({ token } = await registerUser());
    unitId = (await createUnit(token)).body.unit._id;
  });

  test('blocks weightings above 100% in total', async () => {
    expect((await post({ ...base(), weighting: 60 })).status).toBe(201);
    const res = await post({ ...base(), title: 'Exam', type: 'exam', weighting: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEIGHTING_EXCEEDED');
  });

  test('rejects a mark above the max mark', async () => {
    const res = await post({ ...base(), weighting: 30, maxMark: 20, markReceived: 25 });
    expect(res.status).toBe(400);
  });

  test('unit summary shows the required mark', async () => {
    await post({ ...base(), weighting: 40, markReceived: 60 });
    await post({ ...base(), title: 'Exam', type: 'exam', weighting: 60 });
    const res = await request(app).get(`/api/units/${unitId}`).set(auth(token));
    expect(res.body.summary.earned).toBe(24);
    expect(res.body.summary.requiredOnRemaining).toBe(76.7); // (70 - 24) / 60
  });
});