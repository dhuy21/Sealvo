/**
 * E2E seed: a verified account with one package of words that Flash Match can play today.
 * Idempotent: every run resets the package to the words below, at level x, due today.
 *
 * Usage (never run automatically: `prisma migrate deploy` does not seed):
 *   DATABASE_URL=... E2E_USERNAME=... E2E_PASSWORD=... npm run db:seed -w @sealvo/api
 */

import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Read by apps/web/e2e/protected.spec.ts
const PACKAGE_NAME = 'E2E Package';
const SUBJECT = 'E2E';

// Flash Match needs at least 6 words at level x; examples mark the word with **…** (Phrase Completion)
const WORDS = [
  ['apple', 'pomme', '/ˈæp.əl/', 'I eat an **apple** every morning.'],
  ['book', 'livre', '/bʊk/', 'She is reading a **book** about history.'],
  ['house', 'maison', '/haʊs/', 'Their **house** is near the river.'],
  ['water', 'eau', '/ˈwɔː.tər/', 'Drink a glass of **water** after running.'],
  ['friend', 'ami', '/frend/', 'My best **friend** lives in Lyon.'],
  ['garden', 'jardin', '/ˈɡɑːr.dən/', 'We grow tomatoes in the **garden**.'],
  ['window', 'fenêtre', '/ˈwɪn.doʊ/', 'Please open the **window**.'],
  ['bridge', 'pont', '/brɪdʒ/', 'The old **bridge** crosses the Seine.'],
];

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

if (!username || !password) {
  console.error('[seed] E2E_USERNAME and E2E_PASSWORD are required.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('[seed] Refusing to seed with NODE_ENV=production.');
  process.exit(1);
}

const email = `${username.toLowerCase()}@example.com`;
const prisma = new PrismaClient();

try {
  const passwordHash = await hash(password, 12);

  const existing = await prisma.users.findUnique({ where: { username } });
  if (existing && existing.email !== email) {
    throw new Error(
      `username "${username}" belongs to a real account (${existing.email}), not overwriting it`,
    );
  }

  const user = existing
    ? await prisma.users.update({
        where: { id: existing.id },
        data: { password: passwordHash, is_verified: true },
      })
    : await prisma.users.create({
        data: {
          id: randomBytes(4).toString('hex').substring(0, 7),
          username,
          email,
          password: passwordHash,
          is_verified: true,
        },
      });

  const packageId = await prisma.$transaction(async (tx) => {
    const found = await tx.packages.findFirst({
      where: { user_id: user.id, package_name: PACKAGE_NAME },
      select: { package_id: true },
    });
    // Inactive: the reminder job skips inactive packages, so the account gets no daily email
    const pkg =
      found ??
      (await tx.packages.create({
        data: {
          user_id: user.id,
          package_name: PACKAGE_NAME,
          package_description: 'Seeded for the Playwright E2E suite',
          mode: 'private',
          is_active: false,
        },
        select: { package_id: true },
      }));

    const previous = await tx.learning.findMany({
      where: { package_id: pkg.package_id },
      select: { detail_id: true },
    });
    await tx.learning.deleteMany({ where: { package_id: pkg.package_id } });
    await tx.word_details.deleteMany({
      where: {
        detail_id: { in: previous.map((l) => l.detail_id) },
        learning: { none: {} },
      },
    });

    for (const [word, meaning, pronunciation, example] of WORDS) {
      const { word_id } = await tx.words.upsert({
        where: {
          word_subject_language_code: {
            word,
            subject: SUBJECT,
            language_code: 'en-US',
          },
        },
        create: { word, subject: SUBJECT, language_code: 'en-US' },
        update: {},
        select: { word_id: true },
      });
      const { detail_id } = await tx.word_details.create({
        data: { word_id, type: 'noun', meaning, pronunciation, example },
        select: { detail_id: true },
      });
      // date_memorized defaults to now: a level x word is due the same day
      await tx.learning.create({
        data: { package_id: pkg.package_id, detail_id, level: 'x' },
      });
    }
    return pkg.package_id;
  });

  console.log(
    `[seed] User "${username}" (${user.id}), package ${packageId} with ${WORDS.length} words at level x.`,
  );
} catch (err) {
  console.error(
    `[seed] Failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
