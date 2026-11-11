import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, GROUP_ID, normalizeNames } from '../lib/guest-validation.ts';
test('normalizes all people while preserving accents', () => assert.deepEqual(normalizeNames(['  Bia   Vieira ', ' José Silva ']), ['Bia Vieira', 'José Silva']));
test('rejects incomplete groups, oversized groups and control characters', () => { for (const value of [[], Array(21).fill('Nome'), ['Bia', ''], ['<script>'], ['x'], [4], ['Nome\u0000']]) assert.throws(() => normalizeNames(value)); });
test('requires a v4 request identifier', () => { assert.ok(GROUP_ID.test('c6243020-854c-4a08-9a42-e32037b4a5d6')); assert.ok(!GROUP_ID.test('something-else')); });
test('CSV escapes quotes, delimiters and spreadsheet formula injection', () => { assert.equal(csvCell('Ana; "Bia"'), '"Ana; ""Bia"""'); for (const value of ['=1+1', '+cmd', '-3', '@SUM(1)', '  =1']) assert.ok(csvCell(value).startsWith('"\'')); });
