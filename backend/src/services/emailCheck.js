// Checks that an email address is a real, usable mailbox address:
// 1. sensible format with a real top-level domain (done by Joi in validators/auth.js)
// 2. not a known disposable / throwaway email service
// 3. the domain is set up to receive email (DNS MX record, or an A/AAAA record as fallback)
const { Resolver } = require('dns').promises;

// Short timeouts so a slow or blocked DNS server can never hold up sign-up.
const resolver = new Resolver({ timeout: 2000, tries: 1 });
const DNS_LIMIT_MS = 4000; // the whole check gives up (and allows the email) after this
const env = require('../config/env');
const AppError = require('../utils/AppError');

// Common throwaway-email services. Add more as you find them.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com', 'anonaddy.me', 'burnermail.io',
  'discard.email', 'dispostable.com', 'emailondeck.com', 'fakeinbox.com', 'fakemail.net',
  'getairmail.com', 'getnada.com', 'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de',
  'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'inboxkitten.com', 'mailcatch.com', 'maildrop.cc', 'mailinator.com', 'mailinator.net',
  'mailnesia.com', 'mailpoof.com', 'mailsac.com', 'mintemail.com', 'mohmal.com', 'moakt.com',
  'mytemp.email', 'nada.email', 'sharklasers.com', 'spam4.me', 'spamgourmet.com', 'temp-mail.io',
  'temp-mail.org', 'tempail.com', 'tempmail.com', 'tempmail.dev', 'tempmail.net', 'tempmailo.com',
  'tempr.email', 'throwawaymail.com', 'trashmail.com', 'trashmail.de', 'trashmail.net',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'grr.la', 'pokemail.net', 'emltmp.com',
]);

// Domains reserved for documentation/testing that can never receive mail.
const RESERVED_DOMAINS = new Set(['example.com', 'example.net', 'example.org', 'test.com', 'localhost']);
const RESERVED_TLDS = ['.test', '.example', '.invalid', '.localhost', '.local'];

const invalid = (message) =>
  new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', [{ field: 'email', message }]);

function isDisposable(domain) {
  // also catches subdomains such as abc.mailinator.com
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

// Checks DNS is usable by looking up a domain that always has mail servers
async function dnsWorks() {
  try {
    const mx = await resolver.resolveMx('gmail.com');
    return mx.length > 0;
  } catch {
    return false;
  }
}

async function lookupAcceptsMail(domain) {
  try {
    const mx = await resolver.resolveMx(domain);
    // RFC 7505 "null MX" (exchange "" or ".") means the domain explicitly accepts no mail
    return mx.some((r) => r.exchange && r.exchange !== '.');
  } catch (err) {
    if (err.code === 'ENODATA') {
      // No MX record: mail falls back to the domain's own address (A/AAAA record)
      const [a, aaaa] = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
      return a.status === 'fulfilled' || aaaa.status === 'fulfilled';
    }
    // "Not found" only counts if DNS itself works; otherwise every domain would look fake
    if (err.code === 'ENOTFOUND' || err.code === 'NXDOMAIN') return !(await dnsWorks());
    // DNS timeout or server problem: don't block the user because of our network
    return true;
  }
}

async function domainAcceptsMail(domain) {
  let timer;
  const giveUp = new Promise((resolve) => { timer = setTimeout(() => resolve(true), DNS_LIMIT_MS); });
  try {
    return await Promise.race([lookupAcceptsMail(domain), giveUp]);
  } finally {
    clearTimeout(timer);
  }
}

async function assertDeliverableEmail(email) {
  const domain = email.split('@').pop().toLowerCase();
  if (RESERVED_DOMAINS.has(domain) || RESERVED_TLDS.some((t) => domain.endsWith(t))) {
    throw invalid('Please use a real email address you can access.');
  }
  if (isDisposable(domain)) {
    throw invalid('Temporary or disposable email addresses are not allowed.');
  }
  if (env.email.dnsCheck && !(await domainAcceptsMail(domain))) {
    throw invalid(`The domain "${domain}" can't receive email. Check the spelling of your address.`);
  }
}

module.exports = { assertDeliverableEmail, isDisposable, domainAcceptsMail, resolver, DNS_LIMIT_MS };
