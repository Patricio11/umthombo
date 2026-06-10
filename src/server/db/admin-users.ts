import "server-only";
import { sql, desc, eq, and, or, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { user, orders, reviews, products } from "@/server/db/schema";
import { getUserOrders, type AccountOrderRow } from "@/server/db/account-orders";
import { getUserAddresses } from "@/server/db/addresses";
import {
  getUserCustomRequests,
  type UserCustomRequestRow,
} from "@/server/db/queries";
import type { AddressView } from "@/lib/address-schema";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  banned: boolean;
  orderCount: number;
  createdAt: Date;
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      banned: user.banned,
      createdAt: user.createdAt,
      // Count linked orders + guest orders placed with the same email.
      orderCount: sql<number>`count(distinct ${orders.id})::int`,
    })
    .from(user)
    .leftJoin(
      orders,
      or(
        eq(orders.userId, user.id),
        and(
          isNull(orders.userId),
          sql`lower(${orders.customerEmail}) = lower(${user.email})`
        )
      )
    )
    .groupBy(user.id)
    .orderBy(desc(user.createdAt));
}

export interface AdminUserReview {
  id: string;
  productName: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  createdAt: Date;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  banned: boolean;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: Date;
  orders: AccountOrderRow[];
  requests: UserCustomRequestRow[];
  addresses: AddressView[];
  reviews: AdminUserReview[];
}

export async function getAdminUser(id: string): Promise<AdminUserDetail | null> {
  const [u] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!u) return null;

  const [userOrders, requests, addresses, userReviews] = await Promise.all([
    getUserOrders(id, u.email),
    getUserCustomRequests(id),
    getUserAddresses(id),
    db
      .select({
        id: reviews.id,
        productName: products.name,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        status: reviews.status,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(products, eq(products.id, reviews.productId))
      .where(eq(reviews.userId, id))
      .orderBy(desc(reviews.createdAt)),
  ]);

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    banned: u.banned,
    phone: u.phone,
    marketingOptIn: u.marketingOptIn,
    createdAt: u.createdAt,
    orders: userOrders,
    requests,
    addresses,
    reviews: userReviews,
  };
}

/** Count of admins — used to stop the last admin being deleted/disabled. */
export async function countAdmins(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, "admin"));
  return r?.n ?? 0;
}
