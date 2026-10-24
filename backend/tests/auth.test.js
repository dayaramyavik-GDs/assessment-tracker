const { app, request, startDB, stopDB, clearDB, registerUser } = require('./helpers');

beforeAll(startDB);
afterEach(clearDB);
afterAll(stopDB);

describe('auth', () => {
  test('registers and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Ann', email: 'ann@example.com', password: 'Passw0rd1' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  test('rejects a duplicate email with 409', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'B', email: 'DUP@example.com', password: 'Passw0rd1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('rejects a weak password and a bad email with field details', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'C', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });

  test('wrong password and unknown email give the same 401 message', async () => {
    await registerUser({ email: 'dee@example.com' });
    const a = await request(app).post('/api/auth/login').send({ email: 'dee@example.com', password: 'Wrong1234' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong1234' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  test('blocks NoSQL operator injection in login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test('/auth/me needs a valid token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi')).status).toBe(401);
    const { token } = await registerUser();
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
});
