/**
 * Guards against the frontend and the server disagreeing about a course price.
 * The server is the authority; this fails the build if the displayed price,
 * title or id drifts away from it.
 *
 *   npm run check:courses
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { COURSES: serverCourses } = await import(
  new URL('../api/_lib/courses.js', import.meta.url).href
);

const source = await readFile(path.join(root, 'src/config/course.ts'), 'utf8');

/** Pulls { id, title, price } out of each object literal in COURSES. */
function parseClientCourses(text) {
  const courses = [];
  const idPattern = /id:\s*'([^']+)'/g;
  let match;
  while ((match = idPattern.exec(text)) !== null) {
    const id = match[1];
    // Look at the slice following this id for the matching title and price.
    const slice = text.slice(match.index, match.index + 2000);
    const title = slice.match(/title:\s*'([^']+)'/)?.[1];
    const price = Number(slice.match(/price:\s*(\d+)/)?.[1]);
    if (title && Number.isFinite(price)) courses.push({ id, title, price });
  }
  return courses;
}

const clientCourses = parseClientCourses(source);
const problems = [];

if (clientCourses.length === 0) {
  problems.push('Could not parse any course out of src/config/course.ts');
}

for (const client of clientCourses) {
  const server = serverCourses[client.id];
  if (!server) {
    problems.push(`"${client.id}" exists in src/config/course.ts but not in api/_lib/courses.js`);
    continue;
  }
  if (server.price !== client.price) {
    problems.push(
      `"${client.id}" price mismatch — site shows ₹${client.price}, server charges ₹${server.price}`,
    );
  }
  if (server.title !== client.title) {
    problems.push(
      `"${client.id}" title mismatch — site: "${client.title}", server: "${server.title}"`,
    );
  }
}

for (const id of Object.keys(serverCourses)) {
  if (!clientCourses.some((c) => c.id === id)) {
    problems.push(`"${id}" exists in api/_lib/courses.js but not in src/config/course.ts`);
  }
}

if (problems.length > 0) {
  console.error('\n✗ Course catalogue is out of sync:\n');
  problems.forEach((problem) => console.error(`  • ${problem}`));
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Course catalogue in sync (${clientCourses.length} course${clientCourses.length === 1 ? '' : 's'}): ` +
    clientCourses.map((c) => `${c.title} ₹${c.price}`).join(', '),
);
