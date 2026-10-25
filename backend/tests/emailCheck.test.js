const { isDisposable, domainAcceptsMail, resolver: dns } = require('../src/services/emailCheck');

afterEach(() => jest.restoreAllMocks());

const dnsError = (code) => Object.assign(new Error(code), { code });

test('isDisposable matches listed domains and their subdomains only', () => {
  expect(isDisposable('mailinator.com')).toBe(true);
  expect(isDisposable('inbox.mailinator.com')).toBe(true);
  expect(isDisposable('gmail.com')).toBe(false);
  expect(isDisposable('notmailinator.com')).toBe(false);
});

test('a domain with MX records accepts mail', async () => {
  jest.spyOn(dns, 'resolveMx').mockResolvedValue([{ exchange: 'mx.uni.edu.au', priority: 10 }]);
  expect(await domainAcceptsMail('uni.edu.au')).toBe(true);
});

test('a "null MX" domain does not accept mail', async () => {
  jest.spyOn(dns, 'resolveMx').mockResolvedValue([{ exchange: '', priority: 0 }]);
  expect(await domainAcceptsMail('nomail.com')).toBe(false);
});

test('a domain that does not exist does not accept mail', async () => {
  jest.spyOn(dns, 'resolveMx').mockImplementation((d) => (d === 'gmail.com'
    ? Promise.resolve([{ exchange: 'gmail-smtp-in.l.google.com', priority: 5 }])
    : Promise.reject(dnsError('ENOTFOUND'))));
  expect(await domainAcceptsMail('gmial.con')).toBe(false);
});

test('if DNS itself is broken, the email is allowed instead of rejected', async () => {
  jest.spyOn(dns, 'resolveMx').mockRejectedValue(dnsError('ENOTFOUND')); // every lookup fails
  expect(await domainAcceptsMail('gmail.com')).toBe(true);
});

test('no MX but an A record: mail falls back to the A record', async () => {
  jest.spyOn(dns, 'resolveMx').mockRejectedValue(dnsError('ENODATA'));
  jest.spyOn(dns, 'resolve4').mockResolvedValue(['203.0.113.5']);
  jest.spyOn(dns, 'resolve6').mockRejectedValue(dnsError('ENODATA'));
  expect(await domainAcceptsMail('small.com.au')).toBe(true);
});

test('a DNS timeout does not block the user', async () => {
  jest.spyOn(dns, 'resolveMx').mockRejectedValue(dnsError('ETIMEOUT'));
  expect(await domainAcceptsMail('slow.com')).toBe(true);
});

test('a DNS server that never answers is given up on after 4 seconds', async () => {
  jest.useFakeTimers();
  jest.spyOn(dns, 'resolveMx').mockReturnValue(new Promise(() => {})); // hangs forever
  const result = domainAcceptsMail('slow.com');
  jest.advanceTimersByTime(4000);
  expect(await result).toBe(true);
  jest.useRealTimers();
});
