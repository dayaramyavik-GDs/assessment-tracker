process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-1234567890';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing in tests only
process.env.CORS_ORIGINS = 'https://localhost';