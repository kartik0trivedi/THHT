---
title: "Hiding API URLs in a Static Astro Site on Vercel"
description: "How to move a hardcoded third-party URL out of client-side JavaScript and into a Vercel serverless function."
pubDate: "2026-04-04"
tags: ["engineering", "web"]
postType: "standard"
---

This blog runs on Astro, hosted on Vercel. Recently, I migrated my newsletter subscription form away from Formspree to a custom Google Sheets backend. While the initial setup was straightforward, I quickly realized that my Google Apps Script deployment URL was sitting hardcoded in the client-side JavaScript, visible to anyone who opened DevTools.

Here is a look at the migration process, the design decisions involved, and how I eventually secured the endpoint.

## Leaving Formspree

The site originally used [Formspree](https://formspree.io/) for newsletter subscriptions. Formspree is fantastic for general contact forms where you need features like advanced spam filtering and email forwarding. However, for a simple mailing list where I just needed to collect emails to eventually export, it felt like overkill. I didn't need the form to email me; I just needed a lightweight database.

My goals for the migration were simple:

1. Send emails directly to a Google Sheet.
2. Keep the existing AJAX-based submission (no clunky page reloads).
3. Preserve the site's "paper-warm" aesthetic and UI feedback.

## The Initial Setup: Google Sheets as a Backend

Google Apps Script makes it surprisingly easy to turn a spreadsheet into something that can receive data from the web. The excellent guide by [Levi Nunnink](https://github.com/levinunnink/html-form-to-google-sheet) covers the core setup well — the short version is:

1. Create a Google Sheet with column headers (e.g. `Email`, `Date`).
2. Open **Extensions → Apps Script** from the sheet and paste in a script that handles incoming form data.
3. Deploy the script as a **Web App** (set to run as you, accessible by anyone).
4. Copy the deployment URL — this is the endpoint your form will `POST` to.

The script itself listens for incoming data and appends it as a new row. Here is the one I used:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    
    const data = JSON.parse(e.postData.contents);
    const email = data.email;
    const dateAdded = new Date();

    if (!email || email.trim() === "") {
      throw new Error("Email field is missing or empty.");
    }

    sheet.appendRow([email, dateAdded]);

    return ContentService.createTextOutput(
      JSON.stringify({ "result": "success" })
    ).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ "result": "error", "message": error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

On the frontend, I updated the Astro component to use a native JavaScript `fetch` call — this sends the form data to the Apps Script URL in the background without reloading the page.

```js
const scriptURL = "https://script.google.com/macros/s/AKfycbz.../exec";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ email: form.email.value }),
    });

    successMsg.style.display = "block";
    form.reset();
  } catch (error) {
    errorMsg.style.display = "block";
  }
});
```

There is a quirk worth explaining here: `mode: "no-cors"` and `Content-Type: "text/plain"`. Browsers enforce a rule called **CORS** (Cross-Origin Resource Sharing) that restricts how a page on one domain can talk to a server on another. When a browser wants to send JSON to an external URL, it first sends a "pre-flight" check asking the server: *are you okay with this?* Google Apps Script does not respond to that check in the way browsers expect, so the request fails before it even starts. The workaround is to send plain text instead — this type of request is considered simple enough that the browser skips the pre-flight entirely. The Apps Script still receives and parses the JSON string correctly; it just arrives as plain text rather than a declared JSON payload.

The trade-off with `no-cors` is that the browser hides the server's response from your JavaScript. You cannot tell if the submission actually succeeded — you can only tell if the network request itself failed. So I defaulted to showing a success message if no error was thrown, which is not ideal but acceptable for a low-stakes mailing list form.

## The Security Problem

The setup worked, but it created a new issue. The `scriptURL` was sitting in the JavaScript source, visible to anyone who opened the browser's developer tools and looked at the page source.

The URL is not the Google Sheet ID — the sheet stays protected behind Google's authentication. But the Apps Script endpoint is a public-facing URL that accepts `POST` requests from anywhere. Anyone who found it could write a script to spam it with thousands of fake emails and flood the sheet. That felt worth fixing.

## Why `.env` Alone Does Not Solve This

The natural first instinct is to move the URL into a `.env` file. These files are a common convention for storing configuration and secrets locally — they sit in the project folder but are excluded from version control via `.gitignore`, so they never get committed to GitHub. That part is useful.

The problem is what happens at build time. Astro supports exposing `.env` variables to the browser via a `PUBLIC_` prefix, but that works by **inlining the value directly into the compiled JavaScript** during the build step. The resulting bundle that gets deployed — and served to every visitor — contains the URL in plain text. Moving it to `.env` tidies up the source code, but the deployed output is identical. A slightly more determined person with DevTools would find it just as easily.

The only way to truly hide a value from the browser is to never send it to the browser in the first place. That means keeping it on a server.

## The Fix: a Vercel Serverless Function

A serverless function is code that runs on a server on demand, without you having to manage that server yourself. Vercel, where this site is hosted, can run serverless functions alongside a static site — and the free Hobby plan includes enough headroom (100,000 invocations per month) that a personal newsletter form will never come close to a limit.

Astro's default output is static, but the Vercel adapter lets individual routes opt into server-side rendering. The rest of the site stays fast and fully static; one small endpoint runs as a serverless function.

### 1. Install the Vercel adapter

```bash
npx astro add vercel
```

This adds the adapter to `astro.config.mjs`. No other config change is needed — Astro v5+ defaults to static output and lets individual files opt in.

### 2. Create the API endpoint

Create `src/pages/api/subscribe.ts`. This file becomes the serverless function:

```ts
export const prerender = false;

export async function POST({ request }: { request: Request }) {
  const { email } = await request.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const scriptURL = import.meta.env.APPS_SCRIPT_URL;

  await fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ email }),
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

`export const prerender = false` is the single line that tells Astro and Vercel to treat this route as a server-side function rather than a static file. The `APPS_SCRIPT_URL` variable is read at runtime, on Vercel's servers — it is never included in anything sent to the browser.

### 3. Store the URL locally in `.env`

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

This file lives in your project folder for local development but is listed in `.gitignore`, so it is never committed. When running `npm run dev`, Astro reads it automatically.

### 4. Update the form

The client-side script now posts to `/api/subscribe` — the same domain as the site — instead of directly to Google:

```js
const response = await fetch("/api/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: form.email.value }),
});

if (!response.ok) throw new Error("Server error");
```

Because the form and the API endpoint are on the same domain, the browser's CORS rules do not apply, and `mode: "no-cors"` is no longer needed. This also means the response can be read properly — the function returns a clear `ok: true` or an error, rather than the previous approach of hoping for the best.

### 5. Add the environment variable to Vercel

For local development, the `.env` file is enough. For production, Vercel needs to know the value independently. In the Vercel dashboard, go to **Project → Settings → Environment Variables** and add:

- **Key**: `APPS_SCRIPT_URL`
- **Value**: the full Apps Script deployment URL
- **Environment**: Production

Vercel injects this at runtime into the serverless function. It never appears in the build output or the deployed JavaScript.

## Verification

Two quick checks after deploying:

1. Open DevTools → **Network** and submit the form. The request should go to `/api/subscribe`, not `script.google.com`.
2. View the page source (`Cmd+U`) and search for `script.google.com`. It should not appear.

The Vercel dashboard also lists `api/subscribe` under the **Functions** tab, confirming it deployed as a serverless function rather than a static file.

## What This Actually Protects

The Apps Script URL is now only known to Vercel's runtime environment. Anyone inspecting the page source or watching network traffic will see requests going to `/api/subscribe` on the same domain — a dead end without the underlying URL. The Google Sheet itself was never at risk, but the endpoint is no longer trivially abusable from a browser console.

A small change, but a cleaner setup.
