# BrightMinds - Courses, Login & Payments Setup

Everything is built and tested. It will not go live until the credentials below
are filled in. Until then the site behaves normally and the login/enrol buttons
show a polite "being set up" message instead of erroring.

Work through the sections in order. Total time: about 40 minutes.

---

## ⚠ Rotate these credentials

Three secrets were exposed during setup and should be rotated before launch:

1. **Resend API key** - was committed in plain text in `server/.env.example`.
   That file is now scrubbed, but the key was readable by anyone with the
   folder. Revoke it at [resend.com](https://resend.com) → API Keys.
2. **Firebase service account private key** - pasted into a chat transcript.
   It bypasses every Firestore security rule. Rotate at
   Google Cloud Console → IAM & Admin → Service accounts → Keys:
   add a new JSON key, then **delete the old one**.
3. **Razorpay test key secret** - pasted into a chat transcript. Lower risk
   (test mode moves no real money), and you will generate fresh **live** keys
   before launch anyway.

`.env`, `.env.*` and service-account JSON files are all git-ignored, so filled-in
secrets cannot be committed.

---

## 1. Firebase - from zero

**There is no backend code to write here.** The backend already exists in this
repo (`api/`) and runs on Vercel. Firebase only provides two managed services:
Google sign-in (Auth) and the database (Firestore). This section creates them.

**Cost:** the free **Spark** plan is enough. Firebase will offer to upgrade you
to Blaze - you do not need it. Blaze is only required for Cloud Functions and
outbound networking, and we use neither; the payment logic lives on Vercel.

### 1a. Create the project
[console.firebase.google.com](https://console.firebase.google.com) → **Create a project**.

- **Name:** `BrightMinds` (or anything - this is only a label)
- **Project ID:** shown under the name, e.g. `brightminds-a1b2c`.
  ⚠ **Permanent.** It cannot be renamed later. Note it down.
- Google Analytics: **not required.** Skip it unless you want it.

### 1b. Register a web app
Inside the project: **Project Overview** → the **`</>`** (web) icon.

- App nickname: `BrightMinds Website`
- **Do not** tick "Also set up Firebase Hosting" - the site is on Vercel.
- Register app → Firebase shows a `firebaseConfig` block. **Copy it and keep it**;
  it fills the `VITE_FIREBASE_*` variables in step 1g.

These values are not secrets - they are shipped inside the JavaScript of every
page by design. Security comes from the rules in step 1g.

### 1c. Turn on Google sign-in
**Authentication** → **Get started** → **Sign-in method** tab → **Google** →
toggle **Enable**.

- Set a **public-facing name** (shown on the Google sign-in screen - use
  `BrightMinds`, students will see it)
- Set a **support email**
- **Save**

### 1d. Authorise your domains
**Authentication** → **Settings** tab → **Authorized domains** → **Add domain**
for each:

```
brightmindsclasses.in
www.brightmindsclasses.in
brightminds.in
www.brightminds.in
```

Plus your Vercel preview domain (`your-project.vercel.app`). `localhost` is
already there by default.

⚠ **If a domain is missing, Google sign-in fails silently on it** - the popup
opens and closes with no error. This is the most common setup mistake.

### 1e. Skip Cloud Storage

If the console offers **Storage → "Set up default bucket"**, close it. Nothing in
this site uploads files, so Cloud Storage is never used.

⚠ Do not click through it just to dismiss it. On many projects the bucket's
location also becomes the project's **default GCP resource location**, which is
**permanent** and can constrain other location-dependent services. The console
suggests `US-EAST1` by default - the wrong side of the planet for Indian
students. Create Firestore first (next step) and choose its location explicitly.

### 1f. Create the database
**Firestore Database** → **Create database**.

- **Mode:** *Production mode* (locked). Correct - step 1g replaces the defaults
  with our rules. Do not pick test mode; it leaves your data world-writable.
- **Location:** `asia-south1` (Mumbai) for Indian students.
  ⚠ **Permanent.** The location cannot be changed after creation.

You do **not** create any collections by hand. `users`, `orders`, `enrollments`,
`counters` and `webhookEvents` are created automatically on the first payment.

### 1g. Publish the rules and indexes

The rules are what stop a student from writing a fake enrolment straight into
your database from the browser console. The indexes are what let the dashboard
query it. Both are already written in this repo.

**Option A - one command (recommended):**

```bash
npm run firebase:login
npm run firebase:deploy -- --project YOUR_PROJECT_ID
```

This deploys `firestore.rules` and `firestore.indexes.json` together. No global
install needed - it runs the Firebase CLI through `npx`.

**Option B - by hand in the console:**

1. Open `firestore.rules`, copy the whole file, paste into
   Firestore → **Rules** → **Publish**.
2. Firestore → **Indexes** → **Composite** → **Add index**, twice:

   | Collection | Fields |
   |---|---|
   | `enrollments` | `uid` Ascending, `paidAt` Descending |
   | `enrollments` | `uid` Ascending, `courseId` Ascending, `status` Ascending |

   Indexes take a few minutes to finish building.

The admin allowlist is already set inside `firestore.rules`:

```
function adminEmails() {
  return [
    'khannaamar001@gmail.com',
    'hello@brightmindsclasses.in'
  ];
}
```

It must stay identical to `VITE_ADMIN_EMAILS` in `.env`. `npm run check:firebase`
verifies this for you.

### 1h. Get the server key
**Project settings** (gear icon) → **Service accounts** →
**Generate new private key** → a JSON file downloads.

⚠ This key **bypasses all security rules**. Never commit it, never paste it into
chat or a browser-side variable. Open the JSON and copy three values into `.env`:

| JSON field | Environment variable |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

Keep the `\n` sequences in the private key exactly as they appear and wrap
the whole value in double quotes:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

Stripping those `\n` escapes produces a cryptic `DECODER routines::unsupported`
error at runtime. `npm run check:firebase` catches it first.

### 1i. Check it
```bash
npm run check:firebase
```

Verifies key formats, that the browser and server configs point at the **same**
project, that the private key parses, that your admin emails match the rules -
then does a real write/read/delete against Firestore and an Auth call. It never
prints a secret.

Fix anything it flags before moving on to Razorpay.



---

## 2. Razorpay

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Account & Settings**
   → **API Keys** → **Generate Test Key**. Copy both halves into
   `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. **Settings → Webhooks → Add New Webhook**
   - URL: `https://brightmindsclasses.in/api/razorpay-webhook`
   - Secret: invent a long random string, and put the same value in
     `RAZORPAY_WEBHOOK_SECRET`
   - Active events: `payment.captured`, `payment.failed`, `order.paid`
3. Complete Razorpay KYC before switching to live keys (`rzp_live_...`).

The webhook is not optional. If a student's phone dies or they close the tab
right after paying, the webhook is what still enrols them and sends the receipt.

---

## 3. Email (Resend)

1. New API key → `RESEND_API_KEY`.
2. **Domains** → add `brightmindsclasses.in` → add the DNS records Resend shows
   you at your domain registrar → wait for "Verified".
3. Set `RESEND_FROM_EMAIL="BrightMinds <noreply@brightmindsclasses.in>"`.

Until the domain is verified, leave `RESEND_FROM_EMAIL` unset - emails will go
out from `onboarding@resend.dev`, which works but often lands in spam.

Set `ADMIN_EMAIL` to wherever you want new-enrolment notifications to arrive.

---

## 4. WhatsApp community link

WhatsApp → your community or group → **Invite link** → **Copy link**.

Paste the **same URL** into both:

```
WHATSAPP_COMMUNITY_LINK=https://chat.whatsapp.com/XXXXXXXX
VITE_WHATSAPP_COMMUNITY_LINK=https://chat.whatsapp.com/XXXXXXXX
```

The first goes into receipt emails (server-side), the second into the success
screen and dashboard (browser-side).

If you add this link *after* students have already enrolled, their dashboard
picks it up automatically - but their original receipt email will not have it.
So set it before the first real payment.

---

## 5. Add the variables to Vercel

Vercel → your project → **Settings → Environment Variables**. Add every
variable from `.env.example`, ticking **Production** and **Preview**, then
**redeploy**.

`VITE_*` variables are baked in at build time, so changing one always requires
a redeploy - editing it in the dashboard alone does nothing.

For local development, copy `.env.example` to `.env` and fill in the same
values.

---

## 6. Verify it works

After deploying, open `https://brightmindsclasses.in/api/health`. You should see:

```json
{
  "status": "ok",
  "configured": {
    "firebaseAdmin": true,
    "razorpayKeys": true,
    "razorpayMode": "test",
    "razorpayWebhook": true,
    "resend": true,
    "whatsappLink": true,
    "adminEmail": true
  }
}
```

Any `false` tells you exactly which variable is still missing. It never prints
a secret value.

### End-to-end test with a test card

1. Open the site → **Courses** → **Enrol now · ₹500**
2. Sign in with Google
3. Enter a mobile number → **Pay ₹500 securely**
4. Use Razorpay's test card:
   - Card `4111 1111 1111 1111`
   - Any future expiry, any CVV
   - OTP `1234` (test mode accepts any)
5. Check that all of these happen:
   - [ ] Success dialog appears with a receipt number (`BM-2026-0001`)
   - [ ] The WhatsApp button in that dialog opens your community
   - [ ] The receipt email arrives, and its WhatsApp button also works
   - [ ] You (admin) receive the "New enrolment" email
   - [ ] `/dashboard` lists the course with the receipt
   - [ ] `/admin` shows the row (sign in with an admin email)
   - [ ] Razorpay Dashboard → Webhooks shows a `200` delivery
   - [ ] Clicking Enrol again says "already enrolled" instead of charging twice

6. Repeat the whole test on a phone.

Then swap the test keys for live keys in Vercel, update the webhook to the live
one, and redeploy.

---

## 7. Local checks you can run any time

```bash
npm run verify
```

Runs the catalogue sync check, the payment-logic tests, the API handler tests,
and a production build. Current status: **34 tests passing**.

Individually:

| Command | What it checks |
|---|---|
| `npm run check:courses` | The displayed price matches the price the server charges |
| `npm run test:payments` | Signature verification, receipt rendering, HTML escaping, CORS |
| `npm run test:api` | Auth guards and webhook rejection on every endpoint |
| `npm run build` | Production build |

---

## 8. Editing the course

Everything a student reads lives in **`src/config/course.ts`** - heading, price,
curriculum, FAQs. Change it there and nothing else needs touching.

One exception: the **price is duplicated** in `api/_lib/courses.js`, on purpose.
The server never trusts a price sent from the browser, so it keeps its own copy.
If you change a price, change it in both files - `npm run check:courses` fails
the build if you forget.

The live course is `nda-1-april-2027`. To add a second course, append an object to `COURSES` in both files. The
homepage, the `/courses/:slug` page and the dashboard pick it up automatically.

---

## How the money flow actually works

```
Student clicks Enrol
   ↓
Google sign-in (Firebase Auth)
   ↓
POST /api/create-order      ← verifies the Firebase token,
                              looks the price up ON THE SERVER,
                              refuses a duplicate enrolment,
                              creates a Razorpay order
   ↓
Razorpay Checkout opens (UPI / card / net banking)
   ↓
   ├── Browser stays open → POST /api/verify-payment
   └── Browser closes      → POST /api/razorpay-webhook   (the safety net)
   ↓
Both paths call the same fulfilment step, which:
   • checks the HMAC signature
   • writes the enrolment inside a Firestore transaction
   • allocates a sequential receipt number (BM-2026-0001)
   • emails the receipt + WhatsApp link to the student
   • emails the enrolment details to you
```

Fulfilment is **idempotent**: the enrolment document is keyed by the Razorpay
order ID, so if both the browser and the webhook report the same payment, the
second one is a no-op. No double enrolments, no duplicate receipt emails.

The amount is **never** sent from the browser. The client sends a `courseId`;
the server decides what that costs. Changing the price in devtools does nothing.

---

## Files added

```
api/
  _lib/courses.js            Server-side price catalogue (the authority)
  _lib/email.js              Receipt + admin email templates
  _lib/firebaseAdmin.js      Admin SDK init and token verification
  _lib/fulfill.js            Idempotent enrolment + receipt numbering
  _lib/http.js               CORS, method guards, raw-body reader
  _lib/razorpay.js           Client + signature verification
  create-order.js            POST - starts a payment
  verify-payment.js          POST - confirms it from the browser
  razorpay-webhook.js        POST - confirms it from Razorpay
  health.js                  GET  - configuration status

src/
  config/course.ts           All course content - edit this
  contexts/AuthContext.tsx   Google sign-in, popup with redirect fallback
  lib/firebase.ts            Client SDK, degrades gracefully if unconfigured
  lib/api.ts                 Typed fetch helpers
  hooks/useRazorpay.ts       Checkout script loading and flow
  hooks/useEnrollments.ts    Live view of the student's enrolments
  components/CoursesSection.tsx   Homepage section
  components/EnrollButton.tsx     Sign in → details → pay → success
  components/AuthDialog.tsx       Google sign-in modal
  components/GoogleSignInButton.tsx
  components/ProtectedRoute.tsx
  components/ScrollToHash.tsx
  pages/CoursePage.tsx       /courses/:slug
  pages/Login.tsx            /login
  pages/Dashboard.tsx        /dashboard
  pages/Admin.tsx            /admin

firestore.rules              Security rules - must be published
firestore.indexes.json       Composite indexes
scripts/                     The three test suites
.env.example                 Every variable, documented
```
