/**
 * End-to-end tests of the whole marketplace against a real Postgres (PGlite) and a mocked
 * SSLCommerz. Steps run in order and build on each other, like a real day on the platform.
 *
 *   npm test
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { TestClient } from "./helpers/client.js";
import { ADMIN, startTestEnvironment } from "./helpers/setup.js";
import { markPaid } from "./helpers/sslcommerz-mock.js";

let env: Awaited<ReturnType<typeof startTestEnvironment>>;
let anon: TestClient;
let worker: TestClient;
let employer: TestClient;
let admin: TestClient;

const REDIRECT = "youremployee://payment-result";
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const ids: Record<string, string> = {};

/** Start a payment, "pay" on the mocked gateway, and follow the browser back to the success URL. */
async function pay(client: TestClient, purpose: string, referenceId?: string, redirectUrl = REDIRECT) {
  const init = await client.post("/api/payments/init", { purpose, referenceId, redirectUrl });
  assert.equal(init.status, 200, JSON.stringify(init.body));
  const valId = markPaid(init.body.tranId);
  const page = await anon.request("POST", "/api/payments/sslcommerz/success", new URLSearchParams({ tran_id: init.body.tranId, val_id: valId }));
  assert.match(page.body, /Payment successful/);
  assert.ok(page.body.includes(redirectUrl), "return page deep-links back into the app");
  return { tranId: init.body.tranId as string, valId, amount: init.body.amount as number };
}

before(async () => {
  env = await startTestEnvironment();
  anon = new TestClient(env.app);
  worker = new TestClient(env.app);
  employer = new TestClient(env.app);
  admin = new TestClient(env.app);
});

after(async () => {
  await env?.stop();
});

describe("public endpoints", () => {
  it("reports health", async () => {
    const res = await anon.get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  it("serves categories, all 64 districts and pricing", async () => {
    const { body } = await anon.get("/api/meta");
    assert.equal(body.categories.length, 22);
    assert.equal(body.divisions.reduce((n: number, d: { districts: string[] }) => n + d.districts.length, 0), 64);
    assert.deepEqual([body.pricing.workerMonthly, body.pricing.jobPost, body.pricing.hire], [50, 10, 10]);
    ids.category = body.categories.find((c: { slug: string }) => c.slug === "construction").id;
  });

  it("rejects /me without a session", async () => {
    assert.equal((await anon.get("/api/me")).status, 401);
  });
});

describe("onboarding", () => {
  it("validates and saves a worker profile (pending review)", async () => {
    assert.equal((await worker.signUp("Rahim Uddin", "rahim@test.dev")).status, 200);

    const invalid = await worker.put("/api/me/worker", { fullName: "R", phone: "12345" });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.error.details.phone);

    const res = await worker.put("/api/me/worker", {
      fullName: "Rahim Uddin",
      phone: "+880 1712-345678",
      gender: "MALE",
      dateOfBirth: "1995-04-12",
      nidNumber: "1234567890",
      division: "Dhaka",
      district: "Gazipur",
      area: "Tongi",
      skills: ["Brick Laying", "brick laying", "Plaster"],
      experienceYears: 5,
      expectedWage: 800,
      wageType: "DAILY",
      availability: "DAILY",
      categoryIds: [ids.category],
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.worker.status, "PENDING");
    assert.equal(res.body.worker.phone, "01712345678", "phone normalised");
    assert.deepEqual(res.body.worker.skills, ["brick laying", "plaster"], "skills lowercased + de-duplicated");
    ids.worker = res.body.worker.id;
  });

  it("takes the new role into account immediately (session cache refreshed)", async () => {
    const res = await worker.get("/api/jobs");
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "NOT_APPROVED");
    assert.equal((await worker.put("/api/me/employer", { type: "INDIVIDUAL" })).status, 400);
  });

  it("validates and saves an employer profile", async () => {
    await employer.signUp("Karim Ahmed", "karim@test.dev");
    const base = { type: "BUSINESS", fullName: "Karim Ahmed", phone: "01812345678", division: "Dhaka", district: "Gazipur", area: "Board Bazar" };

    const noName = await employer.put("/api/me/employer", base);
    assert.equal(noName.status, 400);

    const wrongDistrict = await employer.put("/api/me/employer", { ...base, companyName: "Karim Traders", tradeLicense: "TL-1", division: "Sylhet" });
    assert.equal(wrongDistrict.status, 400);
    assert.match(wrongDistrict.body.error.details.district, /does not belong/);

    const res = await employer.put("/api/me/employer", { ...base, companyName: "Karim Traders", tradeLicense: "TL-7788" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.employer.status, "PENDING");
    ids.employer = res.body.employer.id;
    assert.equal((await employer.post("/api/jobs", {})).status, 403);
  });
});

describe("admin approvals", () => {
  it("signs the admin in", async () => {
    assert.equal((await admin.signIn(ADMIN.email, ADMIN.password)).status, 200);
    assert.equal((await admin.get("/api/me")).body.user.role, "ADMIN");
    assert.equal((await worker.get("/api/admin/stats")).status, 403);
  });

  it("lists pending profiles and was notified about them", async () => {
    const stats = await admin.get("/api/admin/stats");
    assert.equal(stats.body.workers.PENDING, 1);
    assert.equal(stats.body.employers.PENDING, 1);
    const queue = await admin.get("/api/admin/workers?status=PENDING");
    assert.equal(queue.body.items[0].id, ids.worker);
    assert.ok((await admin.get("/api/notifications/unread-count")).body.count >= 2);
  });

  it("requires a reason to reject, then approves both profiles", async () => {
    assert.equal((await admin.post(`/api/admin/workers/${ids.worker}/decision`, { action: "reject" })).status, 400);
    const w = await admin.post(`/api/admin/workers/${ids.worker}/decision`, { action: "approve" });
    assert.equal(w.body.worker.status, "APPROVED");
    const e = await admin.post(`/api/admin/employers/${ids.employer}/decision`, { action: "approve" });
    assert.equal(e.body.employer.status, "APPROVED");
  });
});

describe("worker subscription (৳50)", () => {
  it("keeps unsubscribed workers out of the directory", async () => {
    const list = await employer.get("/api/workers");
    assert.ok(!list.body.items.some((w: { id: string }) => w.id === ids.worker));
    const apply = await worker.post("/api/jobs/anything/apply", {});
    assert.equal(apply.status, 402);
  });

  it("refuses redirects outside the app and forged callbacks", async () => {
    const bad = await worker.post("/api/payments/init", { purpose: "WORKER_SUBSCRIPTION", redirectUrl: "https://evil.example/x" });
    assert.equal(bad.status, 400);

    const init = await worker.post("/api/payments/init", { purpose: "WORKER_SUBSCRIPTION", redirectUrl: REDIRECT });
    const forged = await anon.request("POST", "/api/payments/sslcommerz/success", new URLSearchParams({ tran_id: init.body.tranId, val_id: "FAKE" }));
    assert.match(forged.body, /Payment failed/);
    assert.equal((await worker.get(`/api/payments/${init.body.tranId}`)).body.payment.status, "FAILED");
  });

  it("activates the plan exactly once even when IPN repeats the callback", async () => {
    const { tranId, valId, amount } = await pay(worker, "WORKER_SUBSCRIPTION");
    assert.equal(amount, 50);
    const before = (await worker.get("/api/me")).body.worker.subscriptionExpiresAt;

    const ipn = await anon.request("POST", "/api/payments/sslcommerz/ipn", new URLSearchParams({ tran_id: tranId, val_id: valId }));
    assert.equal(ipn.body, "OK");
    const me = (await worker.get("/api/me")).body.worker;
    assert.equal(me.subscriptionExpiresAt, before, "IPN after success must not add days again");
    assert.equal(me.subscriptionActive, true);
    assert.equal((await worker.get(`/api/payments/${tranId}`)).body.payment.status, "SUCCESS");
  });

  it("makes the worker discoverable by category, district and skill — without private data", async () => {
    const byCategory = await employer.get(`/api/workers?categoryId=${ids.category}&district=Gazipur`);
    const found = byCategory.body.items.find((w: { id: string }) => w.id === ids.worker);
    assert.ok(found);
    assert.equal(found.phone, undefined);
    assert.equal(found.nidNumber, undefined);
    const bySkill = await employer.get("/api/workers?q=Plaster");
    assert.ok(bySkill.body.items.some((w: { id: string }) => w.id === ids.worker));
  });
});

describe("job post → apply → hire → complete → review", () => {
  it("publishes a job only after the ৳10 payment", async () => {
    const res = await employer.post("/api/jobs", {
      title: "Need a mason for a boundary wall",
      categoryId: ids.category,
      description: "Build a 40 ft boundary wall. Materials are provided on site.",
      wageAmount: 900,
      wageType: "DAILY",
      workersNeeded: 1,
      startDate: day(2),
      durationDays: 3,
      division: "Dhaka",
      district: "Gazipur",
      area: "Board Bazar",
      isUrgent: true,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.job.status, "PENDING_PAYMENT");
    ids.job = res.body.job.id;
    assert.ok(!(await worker.get("/api/jobs")).body.items.some((j: { id: string }) => j.id === ids.job));

    assert.equal((await pay(employer, "JOB_POST", ids.job)).amount, 10);
    const feed = await worker.get(`/api/jobs?categoryId=${ids.category}&district=Gazipur`);
    const job = feed.body.items.find((j: { id: string }) => j.id === ids.job);
    assert.ok(job);
    assert.equal(job.myApplication, null);
    assert.equal(job.employer.displayName, "Karim Traders");
    assert.equal(job.employer.phone, undefined, "employer phone never in public job data");
  });

  it("notifies matching workers about the new job", async () => {
    await new Promise((r) => setTimeout(r, 100)); // announcement runs after the payment commit
    const notes = await worker.get("/api/notifications");
    assert.ok(notes.body.items.some((n: { type: string }) => n.type === "JOB_MATCH"));
  });

  it("lets the worker apply once", async () => {
    assert.equal((await worker.post(`/api/jobs/${ids.job}/apply`, { message: "5 years of experience." })).status, 201);
    assert.equal((await worker.post(`/api/jobs/${ids.job}/apply`, {})).status, 409);
    const feed = await worker.get("/api/jobs");
    assert.equal(feed.body.items.find((j: { id: string }) => j.id === ids.job).myApplication.status, "PENDING");
  });

  it("hires the applicant after the ৳10 hiring fee and reveals contacts", async () => {
    const apps = await employer.get(`/api/jobs/${ids.job}/applications`);
    assert.equal(apps.body.items.length, 1);

    const hire = await employer.post(`/api/applications/${apps.body.items[0].id}/hire`, { useCredit: true });
    assert.equal(hire.status, 201);
    assert.equal(hire.body.requiresPayment, true);
    ids.hire = hire.body.hire.id;
    assert.ok(!(await worker.get("/api/hires")).body.items.some((h: { id: string }) => h.id === ids.hire), "unpaid hire hidden from worker");

    await pay(employer, "HIRE", ids.hire);
    const detail = await employer.get(`/api/hires/${ids.hire}`);
    assert.equal(detail.body.hire.status, "ACTIVE");
    assert.equal(detail.body.hire.contact.phone, "01712345678");
    assert.equal((await worker.get(`/api/hires/${ids.hire}`)).body.hire.contact.phone, "01812345678");
    assert.equal((await employer.get(`/api/jobs/${ids.job}`)).body.job.status, "FILLED");
  });

  it("completes the hire and records one review", async () => {
    assert.equal((await employer.post(`/api/hires/${ids.hire}/review`, { rating: 5 })).status, 409, "no review before completion");
    assert.equal((await employer.post(`/api/hires/${ids.hire}/complete`)).status, 200);
    assert.equal((await employer.post(`/api/hires/${ids.hire}/review`, { rating: 4, comment: "Good, punctual work" })).status, 201);
    assert.equal((await employer.post(`/api/hires/${ids.hire}/review`, { rating: 5 })).status, 409);

    const profile = await employer.get(`/api/workers/${ids.worker}`);
    assert.equal(profile.body.worker.ratingAvg, 4);
    assert.equal(profile.body.worker.ratingCount, 1);
    assert.equal(profile.body.worker.jobsCompleted, 1);
    assert.equal(profile.body.reviews[0].comment, "Good, punctual work");
    assert.equal(profile.body.contact.phone, "01712345678");
  });
});

describe("direct hire: decline refunds a credit", () => {
  const offer = () => ({
    workerId: ids.worker,
    categoryId: ids.category,
    title: "Help moving furniture",
    wageAmount: 700,
    wageType: "DAILY",
    startDate: day(1),
    division: "Dhaka",
    district: "Gazipur",
    area: "Tongi",
    useCredit: true,
  });

  it("sends a paid offer (Expo Go redirect allowed in development)", async () => {
    const res = await employer.post("/api/hires", offer());
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.requiresPayment, true);
    ids.offer = res.body.hire.id;
    await pay(employer, "HIRE", ids.offer, "exp://192.168.0.5:8081/--/payment-result");

    const seen = await worker.get(`/api/hires/${ids.offer}`);
    assert.equal(seen.body.hire.status, "OFFERED");
    assert.equal(seen.body.hire.contact, null);
    assert.equal((await employer.post("/api/hires", offer())).status, 409, "one pending offer per worker");
  });

  it("gives the employer a free credit when the worker declines, then spends it", async () => {
    assert.equal((await worker.post(`/api/hires/${ids.offer}/decline`)).status, 200);
    assert.equal((await employer.get("/api/me")).body.employer.hireCredits, 1);

    const second = await employer.post("/api/hires", offer());
    assert.equal(second.body.requiresPayment, false);
    assert.equal(second.body.hire.status, "OFFERED");
    assert.equal((await employer.get("/api/me")).body.employer.hireCredits, 0);

    assert.equal((await worker.post(`/api/hires/${second.body.hire.id}/accept`)).status, 200);
    const active = await employer.get(`/api/hires/${second.body.hire.id}`);
    assert.equal(active.body.hire.status, "ACTIVE");
    assert.ok(active.body.hire.contact.phone);
  });
});

describe("payment reconciliation", () => {
  it("settles a paid transaction whose callback never arrived, stacking plan days", async () => {
    const expiresBefore = new Date((await worker.get("/api/me")).body.worker.subscriptionExpiresAt).getTime();
    const init = await worker.post("/api/payments/init", { purpose: "WORKER_SUBSCRIPTION", redirectUrl: REDIRECT });
    markPaid(init.body.tranId); // user paid, but closed the browser before returning

    await env.prisma.payment.update({ where: { tranId: init.body.tranId }, data: { createdAt: new Date(Date.now() - 60_000) } });
    const status = await worker.get(`/api/payments/${init.body.tranId}`);
    assert.equal(status.body.payment.status, "SUCCESS");

    const expiresAfter = new Date((await worker.get("/api/me")).body.worker.subscriptionExpiresAt).getTime();
    assert.equal(Math.round((expiresAfter - expiresBefore) / 86_400_000), 30, "renewal adds 30 days on top");
  });
});

describe("admin tools", () => {
  it("reports revenue per Bangladesh day", async () => {
    const stats = (await admin.get("/api/admin/stats")).body;
    // 50 plan + 10 job + 10 hire + 10 offer + 50 renewal
    assert.equal(stats.revenue.total, 130);
    assert.equal(stats.revenue.last7Days.length, 7);
    assert.equal(stats.revenue.last7Days.at(-1).amount, 130, "today is the last bucket");
    assert.equal((await admin.get("/api/admin/payments?status=SUCCESS")).body.items.length, 5);
  });

  it("manages categories", async () => {
    const created = await admin.post("/api/admin/categories", { name: "Boat Worker", nameBn: "নৌকা শ্রমিক", icon: "boat" });
    assert.equal(created.status, 201);
    assert.equal(created.body.category.slug, "boat-worker");
    assert.equal((await admin.post("/api/admin/categories", { name: "Boat Worker", nameBn: "x", icon: "boat" })).status, 409);
  });

  it("removes a job and tells the employer why", async () => {
    assert.equal((await admin.post(`/api/admin/jobs/${ids.job}/remove`, { reason: "Duplicate post" })).status, 200);
    const notes = await employer.get("/api/notifications");
    assert.ok(notes.body.items.some((n: { type: string; body: string }) => n.type === "JOB_REMOVED" && n.body.includes("Duplicate post")));
  });
});

describe("notifications", () => {
  it("counts and clears unread notifications", async () => {
    assert.ok((await worker.get("/api/notifications/unread-count")).body.count >= 4);
    await worker.post("/api/notifications/read", {});
    assert.equal((await worker.get("/api/notifications/unread-count")).body.count, 0);
  });
});

describe("media", () => {
  const png = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(120, 7)]).toString("base64");

  it("stores public avatars and serves them with long-lived caching", async () => {
    const up = await worker.post("/api/media", { data: png, mime: "image/png", purpose: "avatar" });
    assert.equal(up.status, 201);
    const res = await env.app.request(`http://localhost:4000${up.body.url}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.match(res.headers.get("cache-control") ?? "", /immutable/);
  });

  it("rejects files whose bytes don't match their type", async () => {
    const fake = Buffer.from("not an image at all, just some text that is long enough to pass the size check....").toString("base64");
    assert.equal((await worker.post("/api/media", { data: fake, mime: "image/jpeg", purpose: "avatar" })).status, 400);
  });

  it("keeps NID photos private to the owner and admins", async () => {
    const nid = await worker.post("/api/media", { data: png, mime: "image/png", purpose: "nid" });
    assert.equal((await anon.get(nid.body.url)).status, 404);
    assert.equal((await employer.get(nid.body.url)).status, 404);
    assert.equal((await worker.get(nid.body.url)).status, 200);
    assert.equal((await admin.get(nid.body.url)).status, 200);
  });
});

describe("sessions & accounts", () => {
  it("forgets the cached session on sign-out", async () => {
    const temp = new TestClient(env.app);
    await temp.signIn("rahim@test.dev", "Password123");
    assert.equal((await temp.get("/api/me")).status, 200);
    await temp.post("/api/auth/sign-out", {});
    assert.equal((await temp.get("/api/me")).status, 401);
  });

  it("deletes an account and its session", async () => {
    const temp = new TestClient(env.app);
    await temp.signUp("Temp User", "temp@test.dev");
    const cookieJar = temp; // keep the client (and its cookies) around after deletion
    assert.equal((await cookieJar.delete("/api/me")).status, 200);
    assert.equal((await cookieJar.get("/api/me")).status, 401);
  });
});

describe("rate limiting", () => {
  it("blocks brute-force sign-in attempts", async () => {
    const attacker = new TestClient(env.app);
    let limited = false;
    for (let i = 0; i < 12 && !limited; i++) {
      limited = (await attacker.signIn("nobody@test.dev", "wrong-password")).status === 429;
    }
    assert.ok(limited);
  });
});
