/**
 * Checks the course Drive folder is readable by the site.
 *
 *   npm run check:drive
 *
 * Three things have to be true, and each one fails with a different message so
 * it is clear which step is outstanding: the Drive API has to be enabled on the
 * Google Cloud project, the folder has to be shared with the service account,
 * and the subject folders have to contain videos.
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
  const { subjects, totalVideos } = await listCourseLibrary();

  if (totalVideos === 0) {
    console.log(`  ${Y}The folder is readable, but no videos were found.${X}`);
    console.log(`  ${D}Put each video inside a subject folder. Google Docs and PDFs are ignored.${X}\n`);
    process.exit(1);
  }

  console.log(`  ${G}Readable.${X} ${subjects.length} subject${subjects.length === 1 ? '' : 's'}, ${totalVideos} video${totalVideos === 1 ? '' : 's'}.\n`);
  for (const subject of subjects) {
    console.log(`  ${subject.name}  ${D}(${subject.videos.length})${X}`);
    for (const video of subject.videos) {
      const mins = video.durationMs ? `${Math.round(video.durationMs / 60000)} min` : 'duration unknown';
      console.log(`    ${D}-${X} ${video.name}  ${D}${mins}${X}`);
    }
  }
  console.log(`\n  ${D}Students see exactly this list, and each video plays on the site.${X}\n`);
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
