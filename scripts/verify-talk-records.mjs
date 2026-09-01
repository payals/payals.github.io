#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const talksPath = path.join(root, 'data', 'talks.json');
const cvPath = path.join(root, 'data', 'cv.md');
const evidenceDir = path.join(root, '_talk-evidence');
const manifestPath = path.join(evidenceDir, 'manifest.json');
const errors = [];
const evidenceLevels = new Set([
  'scheduled_upcoming',
  'dated_schedule',
  'official_program_listing',
]);
const leadForbiddenFields = [
  'date',
  'title',
  'event_url',
  'archive_url',
  'evidence_id',
  'evidence_level',
  'venue',
  'status',
  'slides_url',
  'video_url',
  'delivered',
  'delivery_claim',
  'delivery_status',
];
const sha256Pattern = /^[a-f0-9]{64}$/;
const scheduleCaveat = 'Official dated schedule listings establish scheduling, not independent proof that a session was delivered.';
const programCaveat = 'Official program listing only. The surviving schedule has no dated slot, so this record does not claim the talk was delivered.';
const programNote = 'The official program lists the session, but the surviving schedule has no dated slot. This record does not claim delivery.';

function addError(location, message) {
  errors.push(`${location}: ${message}`);
}

async function readText(filePath, label) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    addError(label, error.code === 'ENOENT' ? 'file does not exist' : error.message);
    return null;
  }
}

async function readJson(filePath, label) {
  const text = await readText(filePath, label);
  if (text === null) return null;

  try {
    return { value: JSON.parse(text), text };
  } catch (error) {
    addError(label, `invalid JSON (${error.message})`);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(record, field, location) {
  if (typeof record[field] !== 'string' || record[field].trim() === '') {
    addError(location, `required field "${field}" must be a non-empty string`);
    return false;
  }
  return true;
}

function validateArchiveUrl(value, location) {
  if (value !== undefined &&
      (typeof value !== 'string' || !value.startsWith('https://web.archive.org/'))) {
    addError(location, 'archive_url must start with https://web.archive.org/');
  }
}

function dateAnchor(record, location) {
  if (record.date !== undefined) {
    if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      addError(location, 'date must use YYYY-MM-DD');
      return null;
    }

    const parsed = new Date(`${record.date}T00:00:00Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== record.date) {
      addError(location, `date "${record.date}" is not a real calendar date`);
      return null;
    }
    return Number(record.date.replaceAll('-', ''));
  }

  if (typeof record.date_label !== 'string' || record.date_label.trim() === '') {
    addError(location, 'requires either date or a non-empty date_label');
    return null;
  }

  const rangeStart = record.date_label.match(/^([A-Z][a-z]{2}) (\d{1,2})(?:-\d{1,2})?, ((?:19|20)\d{2})$/);
  if (!rangeStart) {
    addError(location, 'date_label must use Mon D-D, YYYY for sorting');
    return null;
  }
  const parsed = new Date(`${rangeStart[1]} ${rangeStart[2]}, ${rangeStart[3]} UTC`);
  if (Number.isNaN(parsed.valueOf())) {
    addError(location, `date_label "${record.date_label}" does not contain a real start date`);
    return null;
  }
  return Number(parsed.toISOString().slice(0, 10).replaceAll('-', ''));
}

function manifestEntries(manifest) {
  return isObject(manifest) && Array.isArray(manifest.records) ? manifest.records : null;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
}

function manifestFilePath(filename, extension, location) {
  if (typeof filename !== 'string' || filename.trim() === '') {
    addError(location, `manifest ${extension} filename must be a non-empty string`);
    return null;
  }
  if (path.extname(filename) !== `.${extension}`) {
    addError(location, `manifest ${extension} filename must end with .${extension}`);
    return null;
  }
  const filePath = path.resolve(evidenceDir, filename);
  if (path.dirname(filePath) !== evidenceDir || path.basename(filePath) !== filename) {
    addError(location, `manifest ${extension} filename "${filename}" is not safe`);
    return null;
  }
  return filePath;
}

const [talksResult, cv] = await Promise.all([
  readJson(talksPath, 'data/talks.json'),
  readText(cvPath, 'data/cv.md'),
]);

const talks = Array.isArray(talksResult?.value) ? talksResult.value : [];
if (talksResult && !Array.isArray(talksResult.value)) {
  addError('data/talks.json', 'top-level value must be an array');
}

const ids = new Map();
const sourced = [];
const leads = [];
let seenLead = false;
let previousAnchor = null;

talks.forEach((record, index) => {
  const location = `data/talks.json[${index}]`;
  if (!isObject(record)) {
    addError(location, 'record must be an object');
    return;
  }

  if (requireString(record, 'id', location)) {
    if (ids.has(record.id)) {
      addError(location, `duplicate id "${record.id}" (first used at index ${ids.get(record.id)})`);
    } else {
      ids.set(record.id, index);
    }
  }

  if (record.record_type !== 'sourced' && record.record_type !== 'archive_lead') {
    addError(location, 'record_type must be "sourced" or "archive_lead"');
    return;
  }

  if (record.record_type === 'archive_lead') {
    seenLead = true;
    leads.push(record);
    for (const field of ['label', 'era', 'detail']) requireString(record, field, location);
    for (const field of leadForbiddenFields) {
      if (Object.hasOwn(record, field)) {
        addError(location, `archive lead must not contain "${field}"`);
      }
    }
    return;
  }

  sourced.push(record);
  if (seenLead) addError(location, 'sourced records must appear before archive leads');
  for (const field of ['title', 'venue', 'evidence_level', 'evidence_id', 'event_url', 'status', 'note']) {
    requireString(record, field, location);
  }
  if (!evidenceLevels.has(record.evidence_level)) {
    addError(location, `evidence_level must be one of: ${[...evidenceLevels].join(', ')}`);
  }
  validateArchiveUrl(record.archive_url, location);

  const anchor = dateAnchor(record, location);
  if (anchor !== null && previousAnchor !== null && anchor > previousAnchor) {
    addError(location, 'sourced records must be ordered by descending date/date_label sort anchor');
  }
  if (anchor !== null) previousAnchor = anchor;
});

if (cv !== null) {
  if (!cv.includes(scheduleCaveat)) {
    addError('data/cv.md', 'missing dated-schedule evidence caveat');
  }
  for (const record of sourced) {
    if (typeof record.title === 'string' && !cv.includes(record.title)) {
      addError('data/cv.md', `missing sourced title "${record.title}"`);
    }
    if (record.archive_label && !cv.toLowerCase().includes(record.archive_label.toLowerCase())) {
      addError('data/cv.md', `missing qualified archive label "${record.archive_label}"`);
    }
  }
  const programRecords = sourced.filter((record) => record.evidence_level === 'official_program_listing');
  const programCaveatCount = cv.split(programCaveat).length - 1;
  if (programCaveatCount < programRecords.length) {
    addError('data/cv.md', `requires ${programRecords.length} program-only caveats, found ${programCaveatCount}`);
  }
  for (const record of leads) {
    if (typeof record.label === 'string' && !cv.includes(record.label)) {
      addError('data/cv.md', `missing archive lead label "${record.label}"`);
    }
  }
}

const manifestResult = await readJson(manifestPath, '_talk-evidence/manifest.json');
const entries = manifestResult ? manifestEntries(manifestResult.value) : null;
if (manifestResult && entries === null) {
  addError('_talk-evidence/manifest.json', 'records must be an array');
}

const manifestById = new Map();
let verifiedFiles = 0;
if (entries) {
  for (const [index, entry] of entries.entries()) {
    const location = `_talk-evidence/manifest.json entry ${index}`;
    if (!isObject(entry)) {
      addError(location, 'entry must be an object');
      continue;
    }
    if (!requireString(entry, 'id', location)) continue;
    const evidenceId = entry.id;
    requireString(entry, 'source_url', location);
    if (entry.wayback_url !== null) {
      if (typeof entry.wayback_url !== 'string' ||
          !entry.wayback_url.startsWith('https://web.archive.org/')) {
        addError(location,
          'wayback_url must be null or start with https://web.archive.org/');
      }
    }
    if (manifestById.has(evidenceId)) {
      addError(location, `duplicate evidence id "${evidenceId}"`);
      continue;
    }
    manifestById.set(evidenceId, { entry, location, evidence: null });

    const jsonPath = manifestFilePath(entry.json, 'json', location);
    const htmlPath = manifestFilePath(entry.html, 'html', location);
    const [evidenceResult, html] = await Promise.all([
      jsonPath ? readJson(jsonPath, `_talk-evidence/${entry.json}`) : null,
      htmlPath ? readText(htmlPath, `_talk-evidence/${entry.html}`) : null,
    ]);
    const evidence = evidenceResult?.value;
    const evidenceLocation = `_talk-evidence/${entry.json}`;
    if (evidenceResult && !isObject(evidence)) {
      addError(evidenceLocation, 'top-level value must be an object');
    }
    if (!isObject(evidence)) continue;
    manifestById.get(evidenceId).evidence = evidence;

    if (evidence.id !== evidenceId) {
      addError(evidenceLocation, `id does not match manifest id "${evidenceId}"`);
    }
    if (evidence.source_url !== entry.source_url) {
      addError(evidenceLocation, 'source_url does not match manifest source_url');
    }
    if (!isObject(evidence.wayback) || !Object.hasOwn(evidence.wayback, 'url')) {
      addError(evidenceLocation, 'wayback.url must be present');
    } else {
      const waybackUrl = evidence.wayback.url;
      if (waybackUrl !== null &&
          (typeof waybackUrl !== 'string' ||
           !waybackUrl.startsWith('https://web.archive.org/'))) {
        addError(evidenceLocation,
          'wayback.url must be null or start with https://web.archive.org/');
      }
      if (waybackUrl !== entry.wayback_url) {
        addError(evidenceLocation, 'wayback.url does not match manifest wayback_url');
      }
    }

    if (!isObject(evidence.integrity)) {
      addError(evidenceLocation, 'integrity must be an object');
    } else {
      for (const field of [
        'fetched_content_sha256',
        'source_excerpt_sha256',
        'normalized_payload_sha256',
      ]) {
        if (typeof evidence.integrity[field] !== 'string' ||
            !sha256Pattern.test(evidence.integrity[field])) {
          addError(evidenceLocation,
            `integrity.${field} must be a lowercase 64-character hexadecimal string`);
        }
      }
      if (typeof evidence.source_excerpt !== 'string') {
        addError(evidenceLocation, 'source_excerpt must be a string');
      } else if (sha256(evidence.source_excerpt) !== evidence.integrity.source_excerpt_sha256) {
        addError(evidenceLocation, 'integrity.source_excerpt_sha256 does not match source_excerpt');
      }
      const payload = Object.fromEntries(
        Object.entries(evidence).filter(([key]) => key !== 'integrity')
      );
      const payloadHash = sha256(JSON.stringify(canonicalize(payload)));
      if (payloadHash !== evidence.integrity.normalized_payload_sha256) {
        addError(evidenceLocation,
          'integrity.normalized_payload_sha256 does not match canonical payload');
      }
    }

    if (html !== null) {
      for (const [field, value] of [
        ['evidence id', evidence.id],
        ['title', evidence.title],
        ['evidence level', evidence.evidence_level],
        ['event', evidence.event],
        ['city', evidence.city],
        ['source URL', evidence.source_url],
      ]) {
        if (typeof value !== 'string' || value.trim() === '' || !html.includes(value)) {
          addError(`_talk-evidence/${entry.html}`,
            `standalone HTML must contain the evidence ${field}`);
        }
      }
      verifiedFiles += 2;
    }
  }
}

for (const record of sourced) {
  if (typeof record.evidence_id !== 'string' || record.evidence_id.trim() === '') continue;
  const evidenceId = record.evidence_id;
  const recordLocation = `talk "${record.id ?? evidenceId}"`;
  const manifestMatch = manifestById.get(evidenceId);
  if (!manifestMatch) {
    addError(recordLocation, `evidence_id "${evidenceId}" is not in _talk-evidence/manifest.json`);
    continue;
  }
  const evidence = manifestMatch.evidence;
  if (!evidence) continue;
  for (const [field, publicValue, evidenceValue] of [
    ['title', record.title, evidence.title],
    ['evidence_level', record.evidence_level, evidence.evidence_level],
    ['date', record.date ?? null, evidence.date],
    ['status', record.status, evidence.evidence_level === 'scheduled_upcoming' ? 'upcoming' : 'past'],
    ['event_url', record.event_url, evidence.source_url],
    ['archive_url', record.archive_url ?? null, evidence.wayback?.url],
  ]) {
    if (publicValue !== evidenceValue) {
      addError(recordLocation, `${field} does not match normalized evidence for "${evidenceId}"`);
    }
  }

  const evidenceEvent = evidence.event?.split(' [')[0];
  if (typeof evidenceEvent !== 'string' || !record.venue.includes(evidenceEvent)) {
    addError(recordLocation, `venue does not contain evidence event for "${evidenceId}"`);
  }
  if (record.venue.includes(', ') && record.venue.split(', ').at(-1) !== evidence.city) {
    addError(recordLocation, `venue city does not match normalized evidence for "${evidenceId}"`);
  }

  if (evidence.date === null) {
    const labelYear = record.date_label?.match(/((?:19|20)\d{2})/)?.[1];
    const contextYears = (evidence.context_sources ?? [])
      .flatMap((source) => source.excerpt?.match(/(?:19|20)\d{2}/g) ?? []);
    if (!labelYear || !contextYears.includes(labelYear)) {
      addError(recordLocation, `date_label year is not supported by event context for "${evidenceId}"`);
    }
  }

  if (record.evidence_level === 'official_program_listing' && record.note !== programNote) {
    addError(recordLocation, 'official program listing must retain the standard no-delivery note');
  }
  const hasMetadataOnlyCapture = evidence.title_variant_provenance?.some(
    (variant) => variant.basis === 'metadata_only'
  );
  if (hasMetadataOnlyCapture && !record.archive_label?.includes('metadata')) {
    addError(recordLocation, 'metadata-only archive capture must be labeled as metadata');
  }
}

if (errors.length > 0) {
  console.error(`Talk record validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Talk records valid: ${sourced.length} sourced, ${leads.length} archive leads, ${verifiedFiles} evidence files verified.`
  );
}
