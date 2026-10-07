/**
 * Checks the course Drive folder is readable by the site, and that Drive is not
 * still offering the videos for download.
 *
 *   npm run check:drive
 *
 * Each setup step fails with its own message, so it is always clear which one
 * is outstanding: the Drive API being enabled on the Google Cloud project, the
 * folder being shared with the service account, videos being present, and
 * "Viewers can download, print and copy" being turned off.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';

for (const raw of (await readFile(path.join(root, '.env'), 'utf8')).split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  let v = line.slice(eq + 1).trim();
  if (v.length > 1 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) v = v.slice(1, -1);
  process.env[line.slice(0, eq).trim()] = v;
}

console.log('\nCourse video library\n');

const account = process.env.FIREBASE_CLIENT_EMAIL;

if (!process.env.COURSE_DRIVE_FOLDER_ID) {
  console.log(`  ${R}COURSE_DRIVE_FOLDER_ID is not set.${X}`);
  console.log(`  ${D}Add it to .env and to Vercel, then redeploy.${X}\n`);
  process.exit(1);
}

try {
  const { listCourseLibrary } = await import('../api/_lib/drive.js');
  const { subjects, totalVideos, downloadable } = await listCourseLibrary();

  if (totalVideos === 0) {
    console.log(`  ${Y}The folder is readable, but no videos were found.${X}`);
    console.log(`  ${D}Put each video inside a subject folder. Documents and PDFs are ignored.${X}\n`);
    process.exit(1);
  }

  console.log(`  ${G}Readable.${X} ${subjects.length} subject${subjects.length === 1 ? '' : 's'}, ${totalVideos} video${totalVideos === 1 ? '' : 's'}.\n`);

  // The same choice the server makes for a signed-in visitor who has not paid.
  const freeIds = (process.env.COURSE_FREE_VIDEO_IDS || '')
    .split(/[,\s]+/).map((v) => v.trim()).filter(Boolean);
  const freeCount = Number(process.env.COURSE_FREE_VIDEO_COUNT || 2);
  const free = new Set(
    freeIds.length
      ? freeIds
      : subjects
        .flatMap((s) => s.videos)
        .sort((a, b) => new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime())
        .slice(0, freeCount)
        .map((v) => v.id),
  );

  for (const subject of subjects) {
    console.log(`  ${subject.name}  ${D}(${subject.videos.length})${X}`);
    for (const video of subject.videos) {
      const mins = video.durationMs ? `${Math.round(video.durationMs / 60000)} min` : 'duration unknown';
      const chapter = video.chapter ? `${D}[${video.chapter}]${X} ` : '';
      const tag = free.has(video.id) ? `  ${G}FREE${X}` : '';
      console.log(`    ${D}-${X} ${chapter}${video.name}  ${D}${mins}${X}${tag}`);
    }
  }

  console.log(`\n  ${D}Students see exactly this list, and each video plays on the site.${X}`);
  console.log(`  ${D}The ${free.size} marked FREE also play for a signed-in visitor who has not${X}`);
  console.log(`  ${D}paid. Change which ones with COURSE_FREE_VIDEO_COUNT or _IDS.${X}`);

  if (downloadable.length === 0) {
    console.log(`\n  ${G}Downloads are off.${X} ${D}The player will not offer a download button.${X}\n`);
  } else {
    console.log(`\n  ${R}Drive will still let students download ${downloadable.length} of ${totalVideos} video${totalVideos === 1 ? '' : 's'}.${X}`);
    console.log(`  ${D}The embedded player shows Drive's own download button for these files.${X}\n`);
    for (const name of downloadable) console.log(`    ${D}-${X} ${name}`);
    console.log(`\n  ${D}Fix, per file, in Drive: right-click the video > Share > the gear icon >${X}`);
    console.log(`  ${D}untick "Viewers and commenters can see the option to download, print,${X}`);
    console.log(`  ${D}and copy". Only the file's OWNER or an editor can change this, so any${X}`);
    console.log(`  ${D}video uploaded by another teacher has to be changed from that account.${X}\n`);
    process.exit(1);
  }
} catch (error) {
  const message = error.message || String(error);
  console.log(`  ${R}Could not read the folder.${X}\n`);

  if (/has not been used in project|is disabled/.test(message)) {
    console.log('  The Google Drive API is switched off for this project.');
    console.log(`  ${D}Open the link in the message below and press Enable, then wait a minute.${X}`);
  } else if (error.status === 404) {
    console.log('  The folder was not found, which almost always means it is not shared.');
    console.log(`  ${D}In Drive: Share > add ${account} as Viewer.${X}`);
  } else if (error.status === 403) {
    console.log('  Access was refused.');
    console.log(`  ${D}In Drive: Share > add ${account} as Viewer.${X}`);
  } else if (/service account is not configured/.test(message)) {
    console.log(`  ${D}FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are missing from .env.${X}`);
  }

  console.log(`\n  ${D}${message}${X}\n`);
  process.exit(1);
}
