import {sqliteTable,text,integer,index,uniqueIndex} from "drizzle-orm/sqlite-core";
export const orders=sqliteTable("orders",{
 id:text("id").primaryKey(), ownerHash:text("owner_hash").notNull(), settings:text("settings").notNull(),
 status:text("status").notNull().default("draft"), book:text("book"), generated:integer("generated").notNull().default(0),
 photoKey:text("photo_key"), photoType:text("photo_type"), pdfKey:text("pdf_key"),
 amount:integer("amount").notNull(), currency:text("currency").notNull().default("pln"),
 paymentStatus:text("payment_status").notNull().default("unpaid"), stripeSession:text("stripe_session"), email:text("email"),
 deliveryStatus:text("delivery_status").notNull().default("pending"), emailId:text("email_id"), emailAttemptAt:integer("email_attempt_at"),
 lockToken:text("lock_token"),lockUntil:integer("lock_until").notNull().default(0),
 createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
},t=>[index("idx_orders_owner_created").on(t.ownerHash,t.createdAt),uniqueIndex("idx_orders_stripe_session").on(t.stripeSession)]);
export const quotas=sqliteTable("generation_quotas",{key:text("key").primaryKey(),count:integer("count").notNull().default(0)});
export const adminLoginAttempts=sqliteTable("admin_login_attempts",{key:text("key").primaryKey(),count:integer("count").notNull().default(0),windowStart:integer("window_start").notNull(),blockedUntil:integer("blocked_until").notNull().default(0)});
