import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Початковий довідник ролей: системні й кілька музичних. Нові музичні ролі потім додає супер-адмін. */
const ROLES = [
  { key: 'member', kind: 'system', nameEn: 'Member', nameUk: 'Учасник', isRemovable: false },
  { key: 'editor', kind: 'system', nameEn: 'Editor', nameUk: 'Редактор', isRemovable: true },
  { key: 'admin', kind: 'system', nameEn: 'Admin', nameUk: 'Адміністратор', isRemovable: true },
  { key: 'bassist', kind: 'music', nameEn: 'Bassist', nameUk: 'Басист', isRemovable: true },
  { key: 'vocalist', kind: 'music', nameEn: 'Vocalist', nameUk: 'Співак', isRemovable: true },
  { key: 'pianist', kind: 'music', nameEn: 'Pianist', nameUk: 'Піаніст', isRemovable: true },
] as const;

/** Демонстраційні пісні з вигаданим текстом (без чужих авторських текстів). */
const SONGS = [
  {
    title: 'Demo song one',
    artist: 'Demo artist',
    language: 'en',
    originalKey: 'G',
    body: [
      '[G]Lyrics line [D]one goes [Em]here',
      '[C]Second line of [D]placeholder [G]text',
      '',
      '[G]Chorus line [D]goes right [Em]here',
      '[C]Another chorus [D]line [G]ends',
    ].join('\n'),
  },
  {
    title: 'Демо-пісня',
    artist: 'Демо-виконавець',
    language: 'uk',
    originalKey: 'Am',
    body: [
      '[Am]Перший рядок [F]тексту [C]тут',
      '[G]Другий рядок [Am]для проби [E]акордів',
      '',
      '[F]Приспів [C]іде [G]далі [Am]тут',
    ].join('\n'),
  },
  {
    title: 'Slash and flat chords',
    artist: 'Demo artist',
    language: 'en',
    originalKey: 'Bb',
    body: ['[Bb]Slash chord [Eb/G]here and [F7]there', '[Gm7]Minor seventh [Cm]then [F]home [Bb]again'].join('\n'),
  },
] as const;

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { nameEn: role.nameEn, nameUk: role.nameUk },
      create: role,
    });
  }

  const existing = await prisma.song.count();
  if (existing === 0) {
    await prisma.song.createMany({ data: SONGS.map((s) => ({ ...s })) });
  }

  console.log(`Seed done: ${ROLES.length} roles, songs in DB: ${await prisma.song.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
