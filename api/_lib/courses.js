/**
 * Server-side course catalogue - the ONLY authority on price.
 * The client never sends an amount; it sends a courseId and the server
 * looks the price up here.
 *
 * ⚠ Keep `id`, `title` and `price` in sync with src/config/course.ts.
 *    `npm run check:courses` verifies this.
 */
export const COURSES = {
  'nda-1-april-2027': {
    id: 'nda-1-april-2027',
    title: 'NDA (I) April 2027',
    price: 499, // ₹ INR
    currency: 'INR',
  },
};

export const getCourse = (courseId) => COURSES[courseId] || null;

/** Razorpay works in the smallest currency unit. */
export const toPaise = (rupees) => Math.round(Number(rupees) * 100);
