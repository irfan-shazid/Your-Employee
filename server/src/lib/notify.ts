import { prisma } from "../db/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

type Db = Prisma.TransactionClient | typeof prisma;

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

/** In-app notification. Pass a transaction client to make it part of a larger write. */
export async function notify(input: NotificationInput, db: Db = prisma) {
  await db.notification.create({ data: input });
}

export async function notifyMany(inputs: NotificationInput[], db: Db = prisma) {
  if (inputs.length) await db.notification.createMany({ data: inputs });
}

/** Tell every admin about something that needs their attention (new registrations…). */
export async function notifyAdmins(title: string, body: string, data: Record<string, string>) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await notifyMany(admins.map((a) => ({ userId: a.id, type: "ADMIN_APPROVAL", title, body, data })));
}
