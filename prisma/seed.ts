import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { prisma } from '../src/lib/db';
import { saveUploadedImage } from '../src/lib/uploads';

// A flat-color JPEG buffer, just large enough to be a valid, servable image —
// stands in for a real photo since no external image assets are available to
// seed with. Goes through the real saveUploadedImage() pipeline (not a direct
// file write) so it's resized/re-encoded the same way an upload would be.
async function placeholder(width: number, height: number, color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

async function main() {
  const admin = await prisma.user.create({
    data: {
      email: 'admin@supperclub.local',
      name: 'Admin',
      passwordHash: bcrypt.hashSync('changeme123', 12),
      role: 'ADMIN',
    },
  });

  const writer = await prisma.user.create({
    data: {
      email: 'writer@supperclub.local',
      name: 'Sample Writer',
      passwordHash: bcrypt.hashSync('changeme123', 12),
      role: 'WRITER',
    },
  });

  const book = await prisma.productType.create({
    data: {
      name: 'Book',
      slug: 'book',
      description: 'Novels, non-fiction, anything with a spine.',
      criteria: {
        create: [
          { name: 'Writing / prose', sortOrder: 0 },
          { name: 'Pacing', sortOrder: 1 },
          { name: 'Characters', sortOrder: 2 },
          { name: 'Would recommend', sortOrder: 3 },
        ],
      },
    },
    include: { criteria: true },
  });

  const restaurant = await prisma.productType.create({
    data: {
      name: 'Restaurant',
      slug: 'restaurant',
      description: 'Places to eat.',
      criteria: {
        create: [
          { name: 'Food', sortOrder: 0 },
          { name: 'Service', sortOrder: 1 },
          { name: 'Atmosphere', sortOrder: 2 },
          { name: 'Value', sortOrder: 3 },
        ],
      },
    },
    include: { criteria: true },
  });

  const novel = await prisma.product.create({
    data: {
      productTypeId: book.id,
      name: 'Project Hail Mary',
      slug: 'project-hail-mary',
      subtitle: 'by Andy Weir',
      url: '',
      description: 'A lone astronaut wakes up with amnesia and has to save humanity.',
      createdById: admin.id,
    },
  });

  const diner = await prisma.product.create({
    data: {
      productTypeId: restaurant.id,
      name: 'Corner Bistro',
      slug: 'corner-bistro',
      subtitle: 'Downtown, French-ish',
      url: '',
      description: 'Small plates, big wine list, always a wait on weekends.',
      createdById: admin.id,
    },
  });

  // A second restaurant reviewed by BOTH seeded users — gives Compare
  // reviews (/products/[slug]/compare) a real, seeded product to show.
  const ramen = await prisma.product.create({
    data: {
      productTypeId: restaurant.id,
      name: 'Tanoshii Ramen',
      slug: 'tanoshii-ramen',
      subtitle: 'Izakaya-style ramen counter, 12 seats, no reservations',
      url: '',
      description: 'Counter-only ramen spot. Line out the door most nights.',
      createdById: admin.id,
    },
  });

  const [writing, pacing, characters] = book.criteria;
  if (!writing || !pacing || !characters) {
    throw new Error('Expected 4 seeded criteria on the Book product type');
  }

  const hailMaryPost = await prisma.post.create({
    data: {
      status: 'PUBLISHED',
      authorId: writer.id,
      productId: novel.id,
      title: 'Project Hail Mary is the page-turner everyone says it is',
      slug: 'project-hail-mary-review',
      summary: 'Couldn’t put it down. The buddy-comedy angle is unexpected.',
      bodyHtml: '<p>Started slow, then I read the back half in one sitting. The reveal structure works better on a first read than a reread.</p>',
      publishedAt: new Date(),
      ratings: {
        create: [
          { criterionId: writing.id, value: 8 },
          { criterionId: pacing.id, value: 9 },
          { criterionId: characters.id, value: 8 },
        ],
      },
      bullets: {
        create: [
          { kind: 'PRO', text: 'Genuinely funny in places', sortOrder: 0 },
          { kind: 'CON', text: 'Science exposition runs long early on', sortOrder: 0 },
        ],
      },
      // Chapter subitems: notes only. No rating or images — both stay optional and
      // are simply left unset here.
      subitems: {
        create: [
          {
            label: 'Chapter 3',
            notes: 'The reveal about Rocky changes how the early chapters read.',
            sortOrder: 0,
          },
          {
            label: 'Chapter 12',
            notes: 'The math on the Astrophage math checks out surprisingly well.',
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const [food, service, atmosphere] = restaurant.criteria;
  if (!food || !service || !atmosphere) {
    throw new Error('Expected 4 seeded criteria on the Restaurant product type');
  }

  // Review-level photos (not item/subitem images) for the Corner Bistro
  // review — run through the real upload pipeline so they're actual files
  // the /api/media route can serve, not just DB rows pointing at nothing.
  const bistroInterior = await saveUploadedImage(await placeholder(1200, 800, { r: 92, g: 64, b: 51 }));
  const bistroDessert = await saveUploadedImage(await placeholder(1200, 800, { r: 214, g: 168, b: 130 }));

  await prisma.post.create({
    data: {
      status: 'PUBLISHED',
      authorId: admin.id,
      productId: diner.id,
      title: 'Corner Bistro, revisited',
      slug: 'corner-bistro-review',
      summary: 'Still great, still loud.',
      bodyHtml: '<p>The duck confit is worth the wait. Ask for a table in the back if noise bothers you.</p>',
      publishedAt: new Date(),
      ratings: {
        create: [
          { criterionId: food.id, value: 9 },
          { criterionId: service.id, value: 7 },
          { criterionId: atmosphere.id, value: 6 },
        ],
      },
      bullets: {
        create: [
          { kind: 'PRO', text: 'Duck confit', sortOrder: 0 },
          { kind: 'CON', text: 'Gets loud after 7pm', sortOrder: 0 },
        ],
      },
      images: {
        create: [
          {
            path: bistroInterior.path,
            thumbPath: bistroInterior.thumbPath,
            width: bistroInterior.width,
            height: bistroInterior.height,
            mimeType: bistroInterior.mimeType,
            byteSize: bistroInterior.byteSize,
            caption: 'Dining room, Saturday night',
            sortOrder: 0,
          },
          {
            path: bistroDessert.path,
            thumbPath: bistroDessert.thumbPath,
            width: bistroDessert.width,
            height: bistroDessert.height,
            mimeType: bistroDessert.mimeType,
            byteSize: bistroDessert.byteSize,
            caption: 'Dessert case by the door',
            sortOrder: 1,
          },
        ],
      },
      // Food-item subitems: notes + their own rating, independent of the
      // restaurant's overall Food/Service/Atmosphere/Value ratings above.
      subitems: {
        create: [
          {
            label: 'Duck confit',
            notes: 'Crispy skin, meat falls off the bone. Worth ordering every time.',
            rating: 9,
            sortOrder: 0,
          },
          {
            label: 'French onion soup',
            notes: 'Good, but the cheese layer was thin this visit.',
            rating: 6,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  // Two reviews of the same product, by the two seeded users — this is the
  // scenario that makes "Compare reviews" appear on the Tanoshii Ramen hub
  // page and be reachable end to end from seed data alone.
  await prisma.post.create({
    data: {
      status: 'PUBLISHED',
      authorId: admin.id,
      productId: ramen.id,
      title: 'Worth the wait, but ask for the spicy miso',
      slug: 'tanoshii-ramen-review-admin',
      summary: 'Best bowl in the neighborhood, if you don’t mind standing in line.',
      bodyHtml: '<p>Got there at 6:15 on a Friday and still waited 25 minutes. The spicy miso is worth it.</p>',
      publishedAt: new Date(),
      ratings: {
        create: [
          { criterionId: food.id, value: 9 },
          { criterionId: service.id, value: 6 },
          { criterionId: atmosphere.id, value: 8 },
        ],
      },
      bullets: {
        create: [
          { kind: 'PRO', text: 'Broth has real depth, not just salt', sortOrder: 0 },
          { kind: 'CON', text: 'No reservations, so the wait is brutal on weekends', sortOrder: 0 },
        ],
      },
    },
  });

  const ramenWriterPost = await prisma.post.create({
    data: {
      status: 'PUBLISHED',
      authorId: writer.id,
      productId: ramen.id,
      title: 'Great broth, chaotic front-of-house',
      slug: 'tanoshii-ramen-review-writer',
      summary: 'The ramen redeems a slightly frantic dining room.',
      bodyHtml: '<p>Service lost track of our order once, but the chashu bowl made up for it.</p>',
      publishedAt: new Date(),
      ratings: {
        create: [
          { criterionId: food.id, value: 8 },
          { criterionId: service.id, value: 5 },
          { criterionId: atmosphere.id, value: 6 },
        ],
      },
      bullets: {
        create: [
          { kind: 'PRO', text: 'Chashu bowl is the one to get', sortOrder: 0 },
          { kind: 'CON', text: 'Order got mixed up mid-meal', sortOrder: 0 },
        ],
      },
    },
  });

  // Comments and a reply — created sequentially so the reply's parentId can
  // reference the real id of the comment it's replying to.
  const ramenQuestion = await prisma.comment.create({
    data: {
      postId: ramenWriterPost.id,
      authorId: admin.id,
      bodyText: 'Did you try the chashu or just the classic?',
    },
  });
  await prisma.comment.create({
    data: {
      postId: ramenWriterPost.id,
      authorId: writer.id,
      parentId: ramenQuestion.id,
      bodyText: 'Chashu — go early, it sells out.',
    },
  });

  const hailMaryQuestion = await prisma.comment.create({
    data: {
      postId: hailMaryPost.id,
      authorId: admin.id,
      bodyText: 'Which part clicked for you — the amnesia opening or the back half?',
    },
  });
  await prisma.comment.create({
    data: {
      postId: hailMaryPost.id,
      authorId: writer.id,
      parentId: hailMaryQuestion.id,
      bodyText: 'Definitely the back half, once the pacing kicks in.',
    },
  });

  // A draft-status post for one of the seeded users — no publishedAt, no
  // ratings yet, so the Dashboard's draft state has something real to show.
  await prisma.post.create({
    data: {
      status: 'DRAFT',
      authorId: writer.id,
      productId: diner.id,
      title: 'Second visit to Corner Bistro',
      slug: 'corner-bistro-second-visit-draft',
      summary: '',
      bodyHtml: '<p>Notes so far: went back for the tasting menu, still need to write this up properly.</p>',
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
