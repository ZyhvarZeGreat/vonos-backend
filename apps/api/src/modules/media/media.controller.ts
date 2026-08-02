import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

const ALLOWED_HOST_SUFFIXES = [
  '.vonosautos.com',
  '.vonosautomarket.com',
  'vonosautos.com',
  'vonosautomarket.com',
] as const;

function isAllowedLegacyMediaUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(suffix),
  );
  if (!allowed) return null;
  // Only proxy product/media upload paths — never arbitrary pages.
  if (!parsed.pathname.includes('/uploads/')) return null;
  return parsed;
}

/**
 * Proxy legacy Ultimate POS product images. Those hosts hotlink-block our
 * app origin (browser <img> → 403); server fetch with their own Referer works.
 */
@Controller('media')
export class MediaController {
  @Get('legacy')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  async legacy(
    @Query('url') url: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!url?.trim()) {
      throw new BadRequestException('url is required');
    }
    const target = isAllowedLegacyMediaUrl(url.trim());
    if (!target) {
      throw new BadRequestException('url host/path not allowed');
    }

    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (compatible; VonosMediaProxy/1.0; +https://vonosgroup.com)',
        Referer: `${target.origin}/`,
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).end();
      return;
    }

    const contentType =
      upstream.headers.get('content-type')?.split(';')[0]?.trim() ||
      'application/octet-stream';
    if (!contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
      res.status(502).end();
      return;
    }

    res.setHeader('Content-Type', contentType);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Length', String(buf.byteLength));
    res.status(200).end(buf);
  }
}
