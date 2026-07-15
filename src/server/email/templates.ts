import "server-only";
import { formatZAR } from "@/lib/format";

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  method: "delivery" | "collection";
  items: { name: string; variant: string | null; qty: number; lineTotalZAR: number }[];
  subtotalZAR: number;
  deliveryFeeZAR: number;
  totalZAR: number;
  shippingService: string | null;
  addressText: string | null;
  trackingReference: string | null;
  trackingUrl: string | null;
}

const OLIVE = "#4b5a30";
const INK = "#2e2c26";
const SOFT = "#7a766c";
const CREAM = "#f7f3ec";
const LINE = "#e6ded1";

function layout(heading: string, intro: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Georgia,'Times New Roman',serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid ${LINE};border-radius:18px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${OLIVE};">Umthombo Creations</div>
          <h1 style="margin:10px 0 6px;font-size:26px;font-weight:normal;color:${INK};">${heading}</h1>
          <p style="margin:0;color:${SOFT};font-size:15px;line-height:1.5;">${intro}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;">${body}</td></tr>
        <tr><td style="padding:18px 32px;background:${CREAM};border-top:1px solid ${LINE};">
          <p style="margin:0;color:${SOFT};font-size:12px;line-height:1.6;">Handcrafted in Cape Town · Umthombo Creations</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function ctaButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:8px;background:${OLIVE};color:#fff;text-decoration:none;font-size:15px;font-weight:500;padding:13px 26px;border-radius:999px;">${label}</a>`;
}

/* ------------------------------------------------------------------ */
/*  Account / auth emails                                              */
/* ------------------------------------------------------------------ */
export function verificationEmail(name: string, url: string) {
  return {
    subject: "Verify your email · Umthombo Creations",
    html: layout(
      "Verify your email",
      `Hi ${escapeHtml(firstName(name))}, please confirm your email to activate your account.`,
      `${ctaButton(url, "Verify email")}<p style="margin:18px 0 0;font-size:12px;color:${SOFT};">If you didn’t create an account, you can safely ignore this email.</p>`
    ),
  };
}

export function passwordSetupEmail(name: string, url: string) {
  return {
    subject: "Set up your password · Umthombo Creations",
    html: layout(
      "Set your password",
      `Hi ${escapeHtml(firstName(name))}, confirm your email and choose a password to finish setting up your account.`,
      `${ctaButton(url, "Set my password")}<p style="margin:18px 0 0;font-size:12px;color:${SOFT};">This link expires soon. If you didn’t ask for this, you can ignore it.</p>`
    ),
  };
}

export function newProductEmail(
  name: string,
  p: {
    name: string;
    tagline: string;
    priceText: string;
    imageUrl: string;
    productUrl: string;
  }
) {
  const image = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="" width="100%" style="display:block;border-radius:14px;max-width:280px;margin-bottom:18px;"/>`
    : "";
  return {
    subject: `New from Umthombo: ${p.name}`,
    html: layout(
      "Something new 🌱",
      `Hi ${escapeHtml(firstName(name))}, we’ve just added something we think you’ll love.`,
      `${image}
       <h2 style="margin:0 0 4px;font-size:22px;font-weight:normal;color:${INK};">${escapeHtml(p.name)}</h2>
       <p style="margin:0 0 8px;font-size:14px;color:${SOFT};">${escapeHtml(p.tagline)}</p>
       <p style="margin:0 0 14px;font-size:16px;color:${INK};">${escapeHtml(p.priceText)}</p>
       ${ctaButton(p.productUrl, "View product")}
       <p style="margin:20px 0 0;font-size:11px;color:${SOFT};">You’re receiving this because you opted in to product updates. You can turn these off in your account settings.</p>`
    ),
  };
}

export function passwordResetEmail(name: string, url: string) {
  return {
    subject: "Reset your password · Umthombo Creations",
    html: layout(
      "Reset your password",
      `Hi ${escapeHtml(firstName(name))}, click below to choose a new password.`,
      `${ctaButton(url, "Reset password")}<p style="margin:18px 0 0;font-size:12px;color:${SOFT};">If you didn’t request this, ignore this email - your password stays the same.</p>`
    ),
  };
}

function itemsTable(d: OrderEmailData): string {
  const rows = d.items
    .map(
      (it) => `<tr>
        <td style="padding:7px 0;font-size:14px;color:${INK};">${it.qty} × ${escapeHtml(it.name)}${
          it.variant ? `<span style="color:${SOFT};"> · ${escapeHtml(it.variant)}</span>` : ""
        }</td>
        <td style="padding:7px 0;font-size:14px;color:${SOFT};text-align:right;white-space:nowrap;">${formatZAR(it.lineTotalZAR)}</td>
      </tr>`
    )
    .join("");
  const deliveryLine =
    d.method === "delivery"
      ? `<tr><td style="padding:5px 0;font-size:14px;color:${SOFT};">${
          d.shippingService ? escapeHtml(d.shippingService) : "Delivery"
        }</td><td style="padding:5px 0;font-size:14px;color:${SOFT};text-align:right;">${formatZAR(d.deliveryFeeZAR)}</td></tr>`
      : `<tr><td style="padding:5px 0;font-size:14px;color:${SOFT};">Collection</td><td style="padding:5px 0;font-size:14px;color:${SOFT};text-align:right;">Free</td></tr>`;

  // Derived, so it covers the bring-back discount, a coupon, both, or a legacy
  // order-wide discount — otherwise the totals appear not to add up. Labelled
  // generically because the parts aren't distinguishable from these numbers.
  const discountZAR = d.subtotalZAR - (d.totalZAR - d.deliveryFeeZAR);
  const discountLine =
    discountZAR > 0
      ? `<tr><td style="padding:4px 0;font-size:14px;color:${OLIVE};">Discount</td><td style="padding:4px 0;font-size:14px;color:${OLIVE};text-align:right;">−${formatZAR(discountZAR)}</td></tr>`
      : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}
    <tr><td colspan="2" style="border-top:1px solid ${LINE};padding-top:10px;"></td></tr>
    <tr><td style="padding:4px 0;font-size:14px;color:${SOFT};">Subtotal</td><td style="padding:4px 0;font-size:14px;color:${SOFT};text-align:right;">${formatZAR(d.subtotalZAR)}</td></tr>
    ${discountLine}
    ${deliveryLine}
    <tr>
      <td style="padding:10px 0 0;font-size:18px;color:${INK};">Total</td>
      <td style="padding:10px 0 0;font-size:18px;color:${INK};text-align:right;">${formatZAR(d.totalZAR)}</td>
    </tr>
  </table>`;
}

/** Customer: payment received / order confirmed. */
export function orderConfirmationEmail(d: OrderEmailData): {
  subject: string;
  html: string;
} {
  const address =
    d.method === "delivery" && d.addressText
      ? `<p style="margin:18px 0 0;font-size:13px;color:${SOFT};">Delivering to: ${escapeHtml(d.addressText)}</p>`
      : `<p style="margin:18px 0 0;font-size:13px;color:${SOFT};">Ready for collection  we’ll confirm a time.</p>`;
  return {
    subject: `Order ${d.orderNumber} confirmed  thank you!`,
    html: layout(
      "Thank you for your order",
      `Hi ${escapeHtml(firstName(d.customerName))}, we’ve received your payment and we’re getting everything ready.`,
      `<div style="margin-bottom:8px;font-size:13px;color:${SOFT};">Order ${d.orderNumber}</div>${itemsTable(d)}${address}`
    ),
  };
}

/** Admin: a new paid order landed. */
export function adminOrderEmail(d: OrderEmailData): {
  subject: string;
  html: string;
} {
  return {
    subject: `New paid order ${d.orderNumber}  ${formatZAR(d.totalZAR)}`,
    html: layout(
      "New paid order",
      `${escapeHtml(d.customerName)} just paid for order ${d.orderNumber}.`,
      `${itemsTable(d)}<p style="margin:18px 0 0;font-size:13px;color:${SOFT};">${
        d.method === "delivery"
          ? `Deliver to: ${escapeHtml(d.addressText ?? "")}`
          : "Collection"
      }<br/>${escapeHtml(d.customerEmail)}</p>`
    ),
  };
}

/** Customer: their parcel is on the way, with a tracking link. */
export function trackingEmail(d: OrderEmailData): {
  subject: string;
  html: string;
} {
  const track = d.trackingUrl
    ? `<a href="${d.trackingUrl}" style="display:inline-block;margin-top:18px;background:${OLIVE};color:#fff;text-decoration:none;font-size:14px;padding:12px 22px;border-radius:999px;">Track your parcel</a>
       <p style="margin:12px 0 0;font-size:12px;color:${SOFT};">Waybill ${escapeHtml(d.trackingReference ?? "")}</p>`
    : "";
  return {
    subject: `Your order ${d.orderNumber} is on its way`,
    html: layout(
      "Your parcel is on the way",
      `Hi ${escapeHtml(firstName(d.customerName))}, your order has been collected by the courier.`,
      `<div style="margin-bottom:8px;font-size:13px;color:${SOFT};">Order ${d.orderNumber}</div>${itemsTable(d)}${track}`
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Custom order requests                                              */
/* ------------------------------------------------------------------ */
export interface CustomRequestEmailData {
  requestNumber: string;
  customerName: string;
  title: string;
  requestType: string;
  statusUrl: string;
  isNewAccount: boolean;
}

/** Sent to the customer the moment they submit a request. */
export function customRequestReceivedEmail(d: CustomRequestEmailData): {
  subject: string;
  html: string;
} {
  const account = d.isNewAccount
    ? `<p style="margin:16px 0 0;font-size:13px;color:${SOFT};">We’ve set up an account so you can track this request - check your inbox for a link to set your password.</p>`
    : "";
  return {
    subject: `We’ve got your request ${d.requestNumber}`,
    html: layout(
      "Your request is in",
      `Hi ${escapeHtml(firstName(d.customerName))}, thank you - we’ll review your idea and come back with a quote.`,
      `<div style="font-size:13px;color:${SOFT};">Request ${escapeHtml(d.requestNumber)}</div>
       <p style="margin:8px 0 4px;font-size:16px;color:${INK};">${escapeHtml(d.title)}</p>
       <p style="margin:0 0 16px;font-size:13px;color:${SOFT};">${escapeHtml(d.requestType)}</p>
       <p style="margin:0 0 14px;font-size:14px;color:${INK};line-height:1.6;">If accepted, a deposit may apply - it’s always deducted from your total.</p>
       ${ctaButton(d.statusUrl, "Track your request")}
       ${account}`
    ),
  };
}

/** Lead alert to the shop owner. */
export function customRequestAdminEmail(d: {
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  title: string;
  requestType: string;
  adminUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `New custom request ${d.requestNumber} - ${d.title}`,
    html: layout(
      "New custom request",
      `${escapeHtml(d.customerName)} would like a bespoke piece.`,
      `<div style="font-size:13px;color:${SOFT};">Request ${escapeHtml(d.requestNumber)} · ${escapeHtml(d.requestType)}</div>
       <p style="margin:8px 0 14px;font-size:16px;color:${INK};">${escapeHtml(d.title)}</p>
       <p style="margin:0 0 4px;font-size:14px;color:${INK};">${escapeHtml(d.customerEmail)}</p>
       <p style="margin:0 0 16px;font-size:14px;color:${INK};">${escapeHtml(d.customerPhone)}</p>
       ${ctaButton(d.adminUrl, "Review request")}`
    ),
  };
}

/** Admin alert when a deposit or balance is paid. */
export function customRequestPaidAdminEmail(d: {
  requestNumber: string;
  customerName: string;
  kind: "Deposit" | "Balance";
  amountZAR: number;
  adminUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${d.kind} paid - ${d.requestNumber}`,
    html: layout(
      `${d.kind} paid 🎉`,
      `${escapeHtml(d.customerName)} has paid the ${d.kind.toLowerCase()} for ${escapeHtml(d.requestNumber)}.`,
      `<p style="margin:0 0 14px;font-size:15px;color:${INK};">Amount: <strong>${formatZAR(d.amountZAR)}</strong></p>
       ${d.kind === "Deposit" ? `<p style="margin:0 0 14px;font-size:14px;color:${SOFT};">Time to start building.</p>` : ""}
       ${ctaButton(d.adminUrl, "Open request")}`
    ),
  };
}

function whatsappLink(href: string | null | undefined): string {
  if (!href) return "";
  return `<p style="margin:18px 0 0;font-size:13px;color:${SOFT};">Questions? <a href="${href}" style="color:${OLIVE};">Chat with us on WhatsApp</a>.</p>`;
}

/** Quote accepted - price, ETA and (optional) deposit. */
export function customRequestQuotedEmail(d: {
  requestNumber: string;
  customerName: string;
  title: string;
  quotedPriceZAR: number;
  etaText: string | null;
  depositRequired: boolean;
  depositZAR: number | null;
  statusUrl: string;
  whatsappHref?: string | null;
  adminNote?: string | null;
}): { subject: string; html: string } {
  const eta = d.etaText
    ? `<p style="margin:0 0 4px;font-size:14px;color:${INK};">Estimated time: <strong>${escapeHtml(d.etaText)}</strong></p>`
    : "";
  const note = d.adminNote
    ? `<p style="margin:14px 0 0;font-size:14px;color:${INK};line-height:1.6;">${escapeHtml(d.adminNote)}</p>`
    : "";
  let money: string;
  if (d.depositRequired && d.depositZAR) {
    const balance = Math.max(0, d.quotedPriceZAR - d.depositZAR);
    money = `<p style="margin:0 0 4px;font-size:14px;color:${INK};">Total: <strong>${formatZAR(d.quotedPriceZAR)}</strong></p>
      <p style="margin:0 0 4px;font-size:14px;color:${INK};">Deposit to begin: <strong>${formatZAR(d.depositZAR)}</strong> <span style="color:${SOFT};">(deducted from your total)</span></p>
      <p style="margin:0 0 14px;font-size:14px;color:${SOFT};">Balance later: ${formatZAR(balance)}</p>
      ${ctaButton(d.statusUrl, "View quote & pay deposit")}`;
  } else {
    money = `<p style="margin:0 0 14px;font-size:14px;color:${INK};">Total: <strong>${formatZAR(d.quotedPriceZAR)}</strong></p>
      ${ctaButton(d.statusUrl, "View your quote")}`;
  }
  return {
    subject: `Your custom quote ${d.requestNumber}`,
    html: layout(
      "We can make this 🌱",
      `Hi ${escapeHtml(firstName(d.customerName))}, here’s your quote for “${escapeHtml(d.title)}”.`,
      `<div style="font-size:13px;color:${SOFT};margin-bottom:12px;">Request ${escapeHtml(d.requestNumber)}</div>${eta}${money}${note}${whatsappLink(d.whatsappHref)}`
    ),
  };
}

/** Request declined, with a reason. */
export function customRequestDeclinedEmail(d: {
  requestNumber: string;
  customerName: string;
  title: string;
  reason: string;
  whatsappHref?: string | null;
}): { subject: string; html: string } {
  return {
    subject: `About your request ${d.requestNumber}`,
    html: layout(
      "About your request",
      `Hi ${escapeHtml(firstName(d.customerName))}, thank you for thinking of us for “${escapeHtml(d.title)}”.`,
      `<p style="margin:0 0 14px;font-size:14px;color:${INK};line-height:1.6;">We’re sorry - we can’t take this one on right now.</p>
       <p style="margin:0;font-size:14px;color:${INK};line-height:1.6;"><span style="color:${SOFT};">Reason:</span> ${escapeHtml(d.reason)}</p>
       ${whatsappLink(d.whatsappHref)}`
    ),
  };
}

/** Generic status update (in progress / ready / completed / cancelled). */
export function customRequestStatusEmail(d: {
  requestNumber: string;
  customerName: string;
  title: string;
  heading: string;
  message: string;
  statusUrl: string;
  whatsappHref?: string | null;
}): { subject: string; html: string } {
  return {
    subject: `Update on your request ${d.requestNumber}`,
    html: layout(
      d.heading,
      `Hi ${escapeHtml(firstName(d.customerName))}, an update on “${escapeHtml(d.title)}”.`,
      `<p style="margin:0 0 14px;font-size:14px;color:${INK};line-height:1.6;">${escapeHtml(d.message)}</p>
       ${ctaButton(d.statusUrl, "View your request")}${whatsappLink(d.whatsappHref)}`
    ),
  };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
