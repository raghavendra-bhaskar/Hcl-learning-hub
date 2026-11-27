import test from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma, User } from '@prisma/client';
import { upsertUserFromOkta } from '../src/middleware/auth.js';
import { prisma } from '../src/lib/prisma.js';

function mockUsers(context: test.TestContext, methods: {
  findFirst: (args: Prisma.UserFindFirstArgs) => Promise<User | null>;
  upsert: (args: Prisma.UserUpsertArgs) => Promise<User>;
}) {
  const original = { findFirst: prisma.user.findFirst, upsert: prisma.user.upsert };
  context.after(() => { Object.assign(prisma.user, original); });
  Object.assign(prisma.user, methods);
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'manager-local-id', email: 'manager@example.com', name: 'manager@example.com',
    oktaSub: null, role: 'MANAGER', managerId: null, passwordHash: null,
    isLocalUser: false, hasAvatar: false, avatarData: null,
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

test('first Okta login links the existing email and refreshes the manager profile in place', async context => {
  let record = user({ email: 'Manager@Example.com' });
  mockUsers(context, { findFirst: async (args) => {
    assert.deepEqual(args.where, { email: { equals: 'manager@example.com', mode: 'insensitive' } });
    return record;
  }, upsert: async (args) => {
    assert.deepEqual(args.where, { id: 'manager-local-id' });
    assert.equal(args.update.role, undefined);
    record = { ...record, email: String(args.update.email), name: String(args.update.name), oktaSub: String(args.update.oktaSub) };
    return record;
  } });
  const result = await upsertUserFromOkta({
    email: ' MANAGER@example.com ', sub: 'okta-manager-id',
    given_name: ' Leila ', family_name: ' Ezeddin ', preferred_username: 'manager@example.com',
  });
  assert.equal(result.id, 'manager-local-id');
  assert.equal(result.role, 'MANAGER');
  assert.equal(result.email, 'manager@example.com');
  assert.equal(result.name, 'Leila Ezeddin');
  assert.equal(result.oktaSub, 'okta-manager-id');
});

test('profile refresh supports firstName/lastName and preserves names and admin roles when absent', async context => {
  const record = user({ role: 'ADMIN', name: 'Existing Name', oktaSub: 'okta-manager-id' });
  const updates: Prisma.UserUpdateInput[] = [];
  mockUsers(context, { findFirst: async () => record, upsert: async (args) => {
    updates.push(args.update);
    return record;
  } });
  await upsertUserFromOkta({ email: record.email, sub: record.oktaSub, firstName: 'Leila', lastName: 'Ezeddin', groups: ['managers'] });
  await upsertUserFromOkta({ email: record.email, sub: record.oktaSub, preferred_username: record.email });
  assert.equal(updates[0].name, 'Leila Ezeddin');
  assert.equal(updates[0].role, undefined);
  assert.equal(updates[1].name, undefined);
});

test('later learner logins do not overwrite an authenticated manager name with their email', async context => {
  const manager = user({ name: 'Leila Ezeddin', oktaSub: 'okta-manager-id' });
  mockUsers(context, { findFirst: async () => null, upsert: async (args) => {
    if (args.where.email === manager.email) {
      assert.equal(args.update.name, undefined);
      return manager;
    }
    assert.equal(args.create.managerId, manager.id);
    return user({ id: 'learner-id', email: 'learner@example.com', role: 'USER', managerId: manager.id });
  } });
  let assignment: Prisma.UserManagerUpsertArgs | undefined;
  const originalAssignmentUpsert = prisma.userManager.upsert;
  context.after(() => { prisma.userManager.upsert = originalAssignmentUpsert; });
  Object.assign(prisma.userManager, { upsert: async (args: Prisma.UserManagerUpsertArgs) => {
    assignment = args;
    return { userId: 'learner-id', managerId: manager.id, assignedAt: new Date() };
  } });
  await upsertUserFromOkta({ email: 'learner@example.com', sub: 'okta-learner-id', manager: manager.email });
  assert.deepEqual(assignment?.create, { userId: 'learner-id', managerId: manager.id });
});

test('invalid identity claims and an email linked to another Okta subject cannot write users', async context => {
  const lookup = context.mock.fn(async () => user({ oktaSub: 'other-okta-id' }));
  const write = context.mock.fn(async () => { throw new Error('Unexpected write'); });
  mockUsers(context, { findFirst: lookup, upsert: write });
  for (const email of [undefined, '', 'not-an-email']) {
    await assert.rejects(upsertUserFromOkta({ email, sub: 'okta-id' }));
  }
  await assert.rejects(upsertUserFromOkta({ email: 'manager@example.com', sub: '' }));
  assert.equal(lookup.mock.callCount(), 0);
  await assert.rejects(
    upsertUserFromOkta({ email: 'manager@example.com', sub: 'okta-id' }),
    /already linked to a different Okta user/,
  );
  assert.equal(write.mock.callCount(), 0);
});
