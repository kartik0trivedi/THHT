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
