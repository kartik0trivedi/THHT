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

## The Initial Setup: Google Sheets and AJAX

Google Apps Script makes it surprisingly easy to turn a spreadsheet into an API. I created a small script to act as the backend for the form:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    
    // Parse the incoming JSON data from the website
    const data = JSON.parse(e.postData.contents);
    const email = data.email;
    const dateAdded = new Date(); // System-generated date and time

    // Validation: Don't add empty rows
    if (!email || email.trim() === "") {
      throw new Error("Email field is missing or empty.");
    }

    // Append only Email and Date
    sheet.appendRow([email, dateAdded]);

    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Subscribed successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

On the frontend, I updated the Astro component (`Subscribe.astro`) to use a native JavaScript `fetch` call instead of Formspree's library.

```js
const form = document.getElementById("subscribe-form");
const scriptURL = "https://script.google.com/macros/s/AKfycbz.../exec";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const data = { email: form.email.value };

  try {
    await fetch(scriptURL, {
      method: "POST",
      mode: "no-cors", // Standard for Apps Script to avoid pre-flight issues
      cache: "no-cache",
      headers: { "Content-Type": "text/plain" }, // Avoids CORS pre-flight
      body: JSON.stringify(data),
    });
    
    // "no-cors" means we can't read the response body, so we assume success if no error was thrown
    successMsg.style.display = "block";
    form.reset();
  } catch (error) {
    errorMsg.style.display = "block";
  }
});
```

A key design decision here: I used `mode: "no-cors"` and `Content-Type: "text/plain"`. Because the Apps Script is hosted on a different domain (`script.google.com`), a standard `application/json` request would trigger a CORS pre-flight check that Apps Script doesn't natively handle well. Sending plain text circumvents this entirely, and the Apps Script still successfully parses the JSON string.

## The Security Problem

The setup worked perfectly, but it created a new issue. The `scriptURL` was sitting in plain sight.

The URL is not the Google Sheet ID itself — the sheet stays protected behind Google's authentication. But the Apps Script endpoint is a public-facing URL that accepts `POST` requests. Anyone who found it in the source code could write a script to spam it with fake emails and flood the sheet. That felt worth fixing.

## Why `.env` alone doesn't solve this

The instinct is to move the URL into a `.env` file. Astro supports this via `PUBLIC_` prefixed variables — but they get **inlined into the JavaScript bundle at build time**. The browser still receives the value; it's just one step more obscure. For a purely static site with no server, there is nowhere else to put it.

The only real solution is to keep the URL on a server.

## The fix: a Vercel serverless function

Astro's default output is static, but the Vercel adapter lets you opt individual routes into server rendering. This means the rest of the site stays fast and fully static while one endpoint runs as a serverless function.

### 1. Install the Vercel adapter

```bash
npx astro add vercel
```

This updates `astro.config.mjs` to include the adapter. No `output` mode change is needed — Astro v5+ defaults to static and lets individual files opt in to server rendering.

### 2. Create the API endpoint

`src/pages/api/subscribe.ts`:

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

`export const prerender = false` is the only line needed to tell Vercel to run this as a serverless function rather than generate a static file. The `APPS_SCRIPT_URL` environment variable is read at runtime on the server — it never touches the browser.

### 3. Store the URL in `.env`

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

`.env` is gitignored, so this never ends up in the repository.

### 4. Update the form

The client-side script now posts to `/api/subscribe` instead of directly to Google:

```js
const response = await fetch("/api/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: form.email.value }),
});

if (!response.ok) throw new Error("Server error");
```

Because this is a same-origin request, there is no CORS issue and no need for `mode: "no-cors"`. It also means the response can be properly checked — the old `no-cors` approach had to assume success since the browser would suppress the response body.

### 5. Add the environment variable to Vercel

In the Vercel dashboard, go to **Project → Settings → Environment Variables** and add `APPS_SCRIPT_URL` with the Apps Script URL as its value. Vercel injects this at runtime into the serverless function — it never appears in the build output or the deployed JavaScript.

## Verification

Two quick checks after deploying:

1. Open DevTools → Network and submit the form. The request should go to `/api/subscribe`, not `script.google.com`.
2. Search the page source (`Cmd+U`) for `script.google.com`. It should not appear.

The Vercel dashboard also lists `api/subscribe` under the **Functions** tab, confirming it deployed as a serverless function rather than a static file.

## What this actually protects

The Apps Script URL is now only known to Vercel's runtime environment. A bad actor inspecting the page source or the network traffic will see requests to `/api/subscribe` on the same domain — a dead end without the underlying URL. The sheet itself was never at risk, but the endpoint is no longer trivially abusable from a browser console.

A small change, but a cleaner setup.
