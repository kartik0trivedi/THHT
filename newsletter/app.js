import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const app = express();
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Newsletter HTML template ---

function renderNewsletter({ title, htmlBody, preheader, slug }) {
  const preheaderTag = preheader
    ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | TH/HT</title>
  <style type="text/css">
    body { margin:0; padding:0; min-width:100%; background-color:#faf9f7; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Arial,sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-spacing:0; font-family:Georgia,'Times New Roman',serif; color:#1a1a1a; }
    td { padding:0; }
    img { border:0; display:block; }
    h1 { font-size:28px; line-height:1.25; margin-top:10px; margin-bottom:20px; color:#1a1a1a; }
    h2 { font-size:20px; line-height:1.3; margin-top:32px; margin-bottom:12px; color:#1a1a1a; }
    p { font-size:17px; line-height:1.75; margin-top:0; margin-bottom:20px; color:#3d3d3d; }
    a { color:#c0392b; }
    em { font-style:italic; }
    hr { border:none; border-top:1px solid #e8e4de; margin:32px 0; }
    .accent { color:#c0392b; font-family:-apple-system,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
    .btn { background-color:#1a1a1a; color:#ffffff !important; text-decoration:none; padding:12px 24px; border-radius:6px; display:inline-block; font-family:-apple-system,Arial,sans-serif; font-size:15px; font-weight:600; }
    .footer-p { font-size:12px !important; color:#6b6b6b !important; margin-bottom:8px; line-height:1.5; }
    @media screen and (max-width:600px) { .main { width:100% !important; } h1 { font-size:24px !important; } p { font-size:16px !important; } }
  </style>
</head>
<body>
  ${preheaderTag}
  <div style="width:100%;table-layout:fixed;background-color:#faf9f7;padding-bottom:40px;">

    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding:15px 0;" align="center">
          <p style="font-family:-apple-system,Arial,sans-serif;font-size:11px;margin:0;color:#6b6b6b;">
            Trouble viewing? <a style="color:#6b6b6b;" href="https://thht.in/writing/${slug}">Read it on the web</a>.
          </p>
        </td>
      </tr>
    </table>

    <table class="main" cellspacing="0" cellpadding="0" align="center"
      style="background-color:#ffffff;margin:0 auto;width:100%;max-width:600px;border-spacing:0;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;border:1px solid #e8e4de;">
      <tr>
        <td style="padding:40px 40px 30px 40px;text-align:center;border-bottom:1px solid #e8e4de;">
          <a href="https://thht.in" style="text-decoration:none;">
            <img src="https://www.thht.in/_astro/thht-logo.zpB2MduO_Z96otW.svg"
              width="150" height="84" alt="Thinking Hard / Hardly Thinking"
              style="display:block;margin:0 auto;">
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:40px;">
          <span class="accent">Latest Writing</span>
          <h1>${title}</h1>
          ${htmlBody}
          <hr>
          <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
            <tr><td><a href="https://thht.in/writing/${slug}" class="btn">Read on the web →</a></td></tr>
          </table>
        </td>
      </tr>
    </table>

    <table cellspacing="0" cellpadding="0" align="center"
      style="width:100%;max-width:600px;margin:0 auto;text-align:center;padding:30px 20px;font-family:-apple-system,Arial,sans-serif;">
      <tr>
        <td>
          <p class="footer-p"><em>Thinking Hard / Hardly Thinking — Ideas worth muddling through.</em></p>
          <p class="footer-p">You are receiving this because you signed up at <a href="https://thht.in" style="color:#6b6b6b;">thht.in</a>.</p>
          <p class="footer-p">
            <a href="$[LI:UNSUBSCRIBE]$" style="color:#6b6b6b;">Unsubscribe</a>
            &nbsp;|&nbsp;
            <a href="$[LI:SUB_PREF]$" style="color:#6b6b6b;">Preferences</a>
          </p>
        </td>
      </tr>
    </table>

  </div>
</body>
</html>`;
}

// --- API routes ---

app.get('/api/posts', (_req, res) => {
  const dir = path.join(ROOT, 'src/content/writing');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
  const posts = files.map(file => {
    const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    return { slug: file.replace('.md', ''), title: data.title, pubDate: data.pubDate };
  });
  res.json(posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)));
});

app.get('/api/preview/:slug', (req, res) => {
  const file = path.join(ROOT, 'src/content/writing', `${req.params.slug}.md`);
  if (!fs.existsSync(file)) return res.status(404).send('Post not found');
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const htmlBody = md.render(content);
  res.send(renderNewsletter({
    title: data.title,
    htmlBody,
    preheader: req.query.preheader || '',
    slug: req.params.slug,
  }));
});

// --- Zoho helpers ---

async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });
  const r = await fetch('https://accounts.zoho.com/oauth/v2/token', { method: 'POST', body: params });
  const data = await r.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

function buildScheduleParams(isoString) {
  const d = new Date(isoString);
  let hour = d.getHours();
  const ampm = hour >= 12 ? 'pm' : 'am';
  hour = hour % 12 || 12;
  return {
    scheduledate: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`,
    schedulehour: String(hour),
    scheduleminute: String(d.getMinutes()).padStart(2, '0'),
    am_pm: ampm,
  };
}

app.post('/api/send', async (req, res) => {
  const { slug, subject, preheader, scheduleISO } = req.body;

  try {
    const token = await getAccessToken();

    // Create campaign
    const contentURL = `https://thht.in/newsletter/${slug}${preheader ? `?preheader=${encodeURIComponent(preheader)}` : ''}`;
    const createParams = new URLSearchParams({
      campaignname: subject,
      from_email: process.env.ZOHO_FROM_EMAIL,
      subject,
      list_details: JSON.stringify([{ listkey: process.env.ZOHO_LIST_KEY, segmentid: '0' }]),
      content_url: contentURL,
      resfmt: 'JSON',
    });
    console.log('[create params]', Object.fromEntries(createParams));

    const createRes = await fetch('https://campaigns.zoho.com/api/v1.1/createCampaign', {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: createParams,
    });
    const createData = await createRes.json();
    console.log('[create]', createData);

    const campaignKey = createData.campaign_key;
    if (!campaignKey) throw new Error(`Campaign creation failed: ${JSON.stringify(createData)}`);

    // Send or schedule
    const sendParams = new URLSearchParams({ campaignkey: campaignKey, resfmt: 'JSON' });
    let sendURL = 'https://campaigns.zoho.com/api/v1.1/sendcampaign';

    if (scheduleISO) {
      sendURL += '?isschedule=true';
      const sched = buildScheduleParams(scheduleISO);
      Object.entries(sched).forEach(([k, v]) => sendParams.append(k, v));
    }

    const sendRes = await fetch(sendURL, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sendParams,
    });
    const sendData = await sendRes.json();
    console.log('[send]', sendData);

    res.json({ ok: true, status: sendData.campaign_status, raw: sendData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Newsletter app → http://localhost:3000');
});
