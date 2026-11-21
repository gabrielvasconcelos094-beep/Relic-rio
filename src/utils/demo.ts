/**
 * Conjunto de demonstração — útil para conhecer o aplicativo antes de guardar algo real.
 * Todo registro criado aqui recebe `demo: true` e pode ser removido de uma vez em
 * Configurações > Armazenamento, sem tocar nos dados do usuário.
 */
import { put } from '@/db/idb';
import { STORES } from '@/db/idb';
import type { Attachment, Capsule, Collection, Memory, Person } from '@/db/types';
import { emptyMemory } from '@/db/archive';
import { newId } from './id';
import { todayCivil } from './date';
import { sha256Blob } from './hash';

function tintedImage(label: string, from: string, to: string): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  const grad = ctx.createLinearGradient(0, 0, 640, 480);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '500 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 320, 250);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85));
}

function shiftYear(years: number, month: number, day: number): string {
  const now = new Date();
  return todayCivil(new Date(now.getFullYear() - years, month - 1, day));
}

export async function loadDemoData(): Promise<{ memories: number; people: number }> {
  const ts = new Date().toISOString();
  const today = new Date();

  const people: Person[] = [
    {
      id: newId('per'),
      name: 'Ana Prado',
      photoId: null,
      metAt: shiftYear(9, 3, 12),
      description: 'Amiga da faculdade',
      notes: 'Escreve cartas à mão até hoje.',
      tags: ['universidade'],
      createdAt: ts,
      updatedAt: ts,
      demo: true,
    },
    {
      id: newId('per'),
      name: 'Dona Lúcia',
      photoId: null,
      metAt: null,
      description: 'Minha avó',
      notes: '',
      tags: ['família'],
      createdAt: ts,
      updatedAt: ts,
      demo: true,
    },
    {
      id: newId('per'),
      name: 'Rafael',
      photoId: null,
      metAt: shiftYear(4, 8, 2),
      description: 'Colega de trabalho que virou amigo',
      notes: '',
      tags: [],
      createdAt: ts,
      updatedAt: ts,
      demo: true,
    },
  ];

  const base = (over: Partial<Memory>): Memory => ({
    ...emptyMemory(),
    createdAt: ts,
    updatedAt: ts,
    demo: true,
    ...over,
  });

  const memories: Memory[] = [
    base({
      title: 'Carta de aniversário da Ana',
      occurredAt: shiftYear(2, today.getMonth() + 1, today.getDate()),
      categoryIds: ['cat_aniversarios', 'cat_palavras'],
      personIds: [people[0].id],
      tags: ['carta', 'alguém se lembrou de mim'],
      sourceId: 'src_carta',
      text:
        'Escrevi à mão porque teclado nenhum daria conta. Obrigada por ter ficado, mesmo nos anos em que eu não era fácil de acompanhar. Você é das pessoas que eu escolheria de novo.',
      feeling: 'Chorei no meio da leitura e depois reli duas vezes.',
      context: 'Chegou pelo correio, numa semana em que eu estava especialmente cansada.',
      favorite: true,
      hardDay: true,
    }),
    base({
      title: 'A avó guardou minha redação de 2009',
      occurredAt: shiftYear(1, 5, 18),
      occurredPrecision: 'day',
      categoryIds: ['cat_familia', 'cat_afeto'],
      personIds: [people[1].id],
      tags: ['infância', 'muito importante'],
      text:
        'Abriu a gaveta e tirou a folha dobrada em quatro. Disse que leu tantas vezes que decorou o final.',
      feeling: 'Uma ternura difícil de explicar.',
      hardDay: true,
    }),
    base({
      title: 'Rafael apareceu no hospital',
      occurredAt: shiftYear(3, 11, 7),
      categoryIds: ['cat_amizade', 'cat_gentilezas'],
      personIds: [people[2].id],
      tags: ['momento difícil', 'alguém se lembrou de mim'],
      text:
        'Não avisou. Chegou com café ruim de máquina e ficou quatro horas sentado num banco duro, falando de bobagem para eu não pensar no resto.',
      feeling: 'Nunca me senti tão acompanhado.',
      favorite: true,
      hardDay: true,
    }),
    base({
      title: 'Elogio que eu não esperava',
      occurredAt: shiftYear(0, Math.max(1, today.getMonth()), 14),
      categoryIds: ['cat_palavras', 'cat_conquistas'],
      personIds: [people[2].id],
      tags: ['trabalho'],
      sourceId: 'src_whatsapp',
      text:
        '“Você tem um jeito de explicar que faz as pessoas deixarem de ter medo da pergunta.” Anotei no celular ali mesmo para não esquecer.',
    }),
    base({
      title: 'Caderno de capa verde',
      occurredAt: shiftYear(5, 12, 24),
      categoryIds: ['cat_presentes', 'cat_datas'],
      personIds: [people[1].id],
      tags: ['surpresa'],
      text: 'Com uma dedicatória curta na primeira página, escrita a lápis para eu poder apagar se quisesse. Nunca apaguei.',
      favorite: true,
    }),
    base({
      title: 'Reencontro depois de sete anos',
      occurredAt: shiftYear(1, 9, 30),
      categoryIds: ['cat_momentos', 'cat_amizade'],
      personIds: [people[0].id, people[2].id],
      tags: ['reencontro'],
      occurredPrecision: 'approximate',
      occurredNote: 'no fim daquela viagem',
      text: 'Sentamos na calçada até tarde. Ninguém falou sobre o tempo que passou — não era necessário.',
      context: 'Foi no fim de uma viagem que eu quase não fiz.',
    }),
    base({
      title: 'Obrigado pelo bilhete na porta',
      occurredAt: shiftYear(2, 6, 3),
      occurredPrecision: 'month',
      sourceId: 'src_outro',
      categoryIds: ['cat_gentilezas', 'cat_gratidao'],
      tags: ['gentileza de desconhecido'],
      text: 'Alguém do prédio deixou um bilhete dizendo que a música que eu toco de manhã melhora o dia dela.',
      hardDay: true,
    }),
  ];

  for (const p of people) await put(STORES.people, p);
  for (const m of memories) await put(STORES.memories, m);

  const images: { label: string; from: string; to: string; memoryIndex: number; caption: string }[] = [
    { label: 'carta', from: '#e7d6c2', to: '#c9a98b', memoryIndex: 0, caption: 'A primeira página, dobrada em quatro' },
    { label: 'caderno', from: '#dfe5d8', to: '#9fb296', memoryIndex: 4, caption: 'A dedicatória a lápis' },
    { label: 'calçada', from: '#e3cfc4', to: '#b1705a', memoryIndex: 5, caption: 'Fim da noite' },
  ];

  for (const img of images) {
    const blob = await tintedImage(img.label, img.from, img.to);
    if (!blob) continue;
    const att: Attachment = {
      id: newId('att'),
      memoryId: memories[img.memoryIndex].id,
      ownerKind: 'memory',
      ownerId: memories[img.memoryIndex].id,
      name: `${img.label}.jpg`,
      mime: 'image/jpeg',
      size: blob.size,
      kind: 'image',
      caption: img.caption,
      createdAt: ts,
      blob,
      sha256: await sha256Blob(blob),
      textContent: '',
      personId: null,
      occurredAt: null,
      sourceId: null,
      demo: true,
    };
    await put(STORES.attachments, att);
  }

  const collection: Collection = {
    id: newId('col'),
    name: 'Coisas bonitas que me disseram',
    description: 'Palavras que eu quero poder reler.',
    color: 'rosa',
    icon: 'heart',
    coverId: null,
    createdAt: ts,
    updatedAt: ts,
    demo: true,
  };
  await put(STORES.collections, collection);
  for (const index of [0, 3, 6]) {
    const m = memories[index];
    await put(STORES.memories, { ...m, collectionIds: [collection.id] });
  }

  const capsule: Capsule = {
    id: newId('cap'),
    title: 'Para quando eu duvidar de novo',
    letter:
      'Se você está lendo isto, provavelmente está num daqueles dias. Reler as três primeiras memórias deste relicário costuma bastar. As pessoas continuam ali.',
    memoryIds: [memories[0].id, memories[2].id],
    openAt: todayCivil(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())),
    createdAt: ts,
    updatedAt: ts,
    openedAt: null,
    demo: true,
  };
  await put(STORES.capsules, capsule);

  return { memories: memories.length, people: people.length };
}
