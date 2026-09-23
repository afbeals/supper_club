import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PostForm, type ExistingPost } from '@/components/post/PostForm';

// Folder is named [slug], not [id], only because Next.js requires every dynamic
// segment nested under /posts/ to share one param name across route groups —
// (site)/posts/[slug] already claims "slug". The value passed here is still the
// post's numeric database id (see the New Post / dashboard links: /posts/<id>/edit).
export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const postId = Number(slug);
  const session = await getSession();
  if (!session || !Number.isInteger(postId)) {
    notFound();
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      ratings: true,
      bullets: { orderBy: { sortOrder: 'asc' } },
      images: { where: { subitemId: null }, orderBy: { sortOrder: 'asc' } },
      subitems: { orderBy: { sortOrder: 'asc' }, include: { images: { orderBy: { sortOrder: 'asc' } } } },
    },
  });

  if (!post || post.authorId !== session.userId) {
    notFound();
  }

  const existingPost: ExistingPost = {
    id: post.id,
    title: post.title,
    summary: post.summary,
    bodyHtml: post.bodyHtml,
    productId: post.productId,
    ratings: post.ratings.map((r) => ({ criterionId: r.criterionId, value: r.value, note: r.note })),
    bullets: post.bullets.map((b) => ({ kind: b.kind, text: b.text })),
    images: post.images.map((img) => ({
      path: img.path,
      thumbPath: img.thumbPath,
      width: img.width,
      height: img.height,
      mimeType: img.mimeType,
      byteSize: img.byteSize,
    })),
    subitems: post.subitems.map((s) => ({
      label: s.label,
      notes: s.notes ?? '',
      rating: s.rating,
      images: s.images.map((img) => ({
        path: img.path,
        thumbPath: img.thumbPath,
        width: img.width,
        height: img.height,
        mimeType: img.mimeType,
        byteSize: img.byteSize,
      })),
    })),
  };

  return <PostForm existingPost={existingPost} />;
}
