/**
 * Publish the "car-thermostat-explained" blog article into the CMS.
 *
 * Reads the single entry from the shared BLOG_POSTS source
 * (apps/web/lib/marketing/blog-posts.ts) and inserts it as a published
 * CmsPost for the group marketing site. If the post already exists for the
 * group scope — published, draft, or soft-deleted — the script changes
 * nothing and exits successfully, so it is safe to re-run.
 *
 * Usage (from apps/api), pointing at the target database:
 *   DATABASE_URL='postgresql://…' npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/publish-thermostat-post.ts
 *   npm run prisma:publish-thermostat -w api
 *
 * Options:
 *   --dry-run   Report what would happen without writing.
 */
import { existsSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import { BLOG_POSTS } from '../../../web/lib/marketing/blog-posts';

const SLUG = 'car-thermostat-explained';
const SCOPE_KEY = 'group';

// Prisma Client does not load .env on its own (the Prisma CLI does), so load
// apps/api/.env when the caller has not exported DATABASE_URL.
if (!process.env.DATABASE_URL && existsSync('.env') && 'loadEnvFile' in process) {
  (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile('.env');
}

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Export it, run from apps/api with a .env file, or pass it inline.',
    );
  }

  const post = BLOG_POSTS.find((row) => row.slug === SLUG);
  if (!post) {
    throw new Error(
      `Blog post "${SLUG}" not found in apps/web/lib/marketing/blog-posts.ts`,
    );
  }

  const existing = await prisma.cmsPost.findUnique({
    where: { scopeKey_slug: { scopeKey: SCOPE_KEY, slug: post.slug } },
    select: { id: true, status: true, publishedAt: true, deletedAt: true },
  });

  if (existing) {
    console.log(
      JSON.stringify(
        {
          action: 'skipped',
          reason: 'post already exists for this scope',
          id: existing.id,
          slug: post.slug,
          status: existing.status,
          publishedAt: existing.publishedAt?.toISOString() ?? null,
          softDeleted: existing.deletedAt !== null,
        },
        null,
        2,
      ),
    );
    return;
  }

  const publishedAt = new Date(`${post.publishedAt}T09:00:00.000Z`);
  const maxSortOrder = await prisma.cmsPost.aggregate({
    where: { scopeKey: SCOPE_KEY, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          action: 'would-create',
          slug: post.slug,
          title: post.title,
          sections: post.sections.length,
          status: 'published',
          publishedAt: publishedAt.toISOString(),
          sortOrder,
        },
        null,
        2,
      ),
    );
    return;
  }

  const created = await prisma.cmsPost.create({
    data: {
      scopeKey: SCOPE_KEY,
      tenantId: null,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      coverImageUrl: post.image,
      author: post.author,
      status: 'published',
      publishedAt,
      readMinutes: post.readMinutes,
      intro: post.intro,
      sortOrder,
      sections: {
        create: post.sections.map((section, index) => ({
          sectionId: section.id,
          sortOrder: index,
          title: section.title,
          paragraphs: section.paragraphs,
        })),
      },
    },
    select: { id: true },
  });

  console.log(
    JSON.stringify(
      {
        action: 'published',
        id: created.id,
        slug: post.slug,
        title: post.title,
        sections: post.sections.length,
        publishedAt: publishedAt.toISOString(),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
