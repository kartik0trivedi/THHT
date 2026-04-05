import fs from 'node:fs/promises';
import path from 'node:path';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute } from 'astro';

export async function getStaticPaths() {
  const posts = await getCollection('writing');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, pubDate } = props.data;
  
  const dateStr = pubDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fontPath = path.join(process.cwd(), 'public/fonts/atkinson-bold.woff');
  const fontData = await fs.readFile(fontPath);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          backgroundColor: '#fffcf9', // matched from var(--paper-warm)
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #e8e3dc 2%, transparent 0%), radial-gradient(circle at 75px 75px, #e8e3dc 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: '80px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '32px',
                color: '#6e6a64',
                marginBottom: '30px',
                fontFamily: 'Atkinson',
              },
              children: `Thinking Hard / Hardly Thinking — ${dateStr}`,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '76px',
                lineHeight: '1.2',
                color: '#2a2825',
                flexWrap: 'wrap',
                maxWidth: '900px',
                fontFamily: 'Atkinson',
              },
              children: title,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Atkinson',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  
  const image = resvg.render();
  const pngBuffer = image.asPng();

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      // Cache this image on Edge for a very long time
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
