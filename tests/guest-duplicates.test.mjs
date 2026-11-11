import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGuestName, possibleDuplicateNames } from '../lib/guest-duplicates.ts';
const group=(id,names,status='confirmed')=>({id,names,status});
test('duplicate warnings ignore accents, spacing and case across confirmed groups',()=>{const warnings=possibleDuplicateNames([group('a',[' José   Silva ']),group('b',['JOSE SILVA'])]);assert.equal(warnings.size,2);assert.equal(warnings.get('a').length,1);assert.equal(normalizeGuestName(' Érica '),'erica');});
test('cancelled groups do not trigger warnings or change totals',()=>{assert.equal(possibleDuplicateNames([group('a',['Maria']),group('b',['Maria'],'cancelled')]).size,0);});
test('repeated names inside one group are marked without removing people',()=>{const groups=[group('a',['Ana','ana'])];assert.equal(possibleDuplicateNames(groups).size,1);assert.equal(groups[0].names.length,2);});
test('different full names are preserved',()=>{assert.equal(possibleDuplicateNames([group('a',['Ana Silva']),group('b',['Ana Souza'])]).size,0);});
