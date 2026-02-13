/**
 * Real data export and deletion for GDPR/CCPA/PIPEDA compliance.
 * - buildUserExport: gathers all user data into a structured JSON payload.
 * - anonymizeUser: anonymizes user PII and revokes sessions (right to be forgotten).
 */

const { prisma } = require('../config/database');

/** Omit passwordHash and ensure JSON-serializable (e.g. Date -> ISO string) */
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return JSON.parse(JSON.stringify(rest));
}

/**
 * Build a full structured export of the user's data.
 * Used when type=export is requested.
 */
async function buildUserExport(userId) {
  const [user, vehicles, subscriptions, cases, orders, expertCalls, towingRequests, repairs, alerts, consentLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        profilePhoto: true,
        dateOfBirth: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        preferences: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.vehicle.findMany({
      where: { userId },
      include: {
        scans: { orderBy: { scannedAt: 'desc' } },
        repairs: true,
      },
    }),
    prisma.subscription.findMany({ where: { userId } }),
    prisma.case.findMany({
      where: { userId },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true } },
        shop: { select: { id: true, name: true } },
      },
    }),
    prisma.order.findMany({
      where: { userId },
      include: { items: true },
    }),
    prisma.expertCall.findMany({
      where: { userId },
      include: { expert: { select: { id: true, name: true, title: true } } },
    }),
    prisma.towingRequest.findMany({ where: { userId } }),
    prisma.repair.findMany({
      where: { userId },
      include: { vehicle: { select: { id: true, make: true, model: true, year: true } } },
    }),
    prisma.alert.findMany({ where: { userId } }),
    prisma.consentLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  if (!user) return null;

  const payload = {
    exportedAt: new Date().toISOString(),
    user: sanitizeUser(user),
    vehicles: JSON.parse(JSON.stringify(vehicles)),
    subscriptions: JSON.parse(JSON.stringify(subscriptions)),
    cases: JSON.parse(JSON.stringify(cases)),
    orders: JSON.parse(JSON.stringify(orders)),
    expertCalls: JSON.parse(JSON.stringify(expertCalls)),
    towingRequests: JSON.parse(JSON.stringify(towingRequests)),
    repairs: JSON.parse(JSON.stringify(repairs)),
    alerts: JSON.parse(JSON.stringify(alerts)),
    consentHistory: JSON.parse(JSON.stringify(consentLogs)),
  };

  return payload;
}

/**
 * Anonymize user PII and revoke all refresh tokens (right to be forgotten).
 * User row is kept for referential integrity; PII is cleared.
 */
async function anonymizeUser(userId) {
  const anonymizedEmail = `deleted-${userId}@anonymized.fairfix.local`;

  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        passwordHash: null,
        firstName: null,
        lastName: null,
        phone: null,
        profilePhoto: null,
        dateOfBirth: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        preferences: null,
        notificationPreferences: null,
        anonymizedAt: new Date(),
      },
    }),
  ]);
}

module.exports = {
  buildUserExport,
  anonymizeUser,
};
