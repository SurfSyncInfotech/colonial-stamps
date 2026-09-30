import slugify from 'slugify';

export function makeSlug(text) {
  return slugify(text, { lower: true, strict: true, trim: true });
}

export async function uniqueSlug(base, checkFn, suffix = '') {
  let slug = makeSlug(base + (suffix ? `-${suffix}` : ''));
  let attempt = 0;
  while (await checkFn(slug)) {
    attempt += 1;
    slug = makeSlug(`${base}-${attempt}`);
  }
  return slug;
}
