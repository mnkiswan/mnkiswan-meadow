# Polish translation guide (MNKISWAN Meadow)

The game's second language is **Polish** (`pl`), replacing Bulgarian. Every Bulgarian file in
`public/js/i18n/bg/<file>.js` gets a Polish twin at `public/js/i18n/pl/<file>.js` with **exactly the same keys and
structure**. The `bg/` files are only a map of keys and structure: translate the **meaning from English**
(`public/js/i18n/en/<file>.js` for catalogs; for `names.js`, `text.js`, `text-b.js`, `text-c.js` the English lives in
`shared/content/*.js`, the ids are the same). Use the Bulgarian when no English is at hand.

## File rules

- Same `export default { ... }` / named exports, same keys in the same order, same nesting. Valid ES module JavaScript
  (run `node --check public/js/i18n/pl/<file>.js` on every file you write).
- Comments: a short English header line saying it is the Polish catalog; drop Bulgarian comments.
- Strings in single quotes; escape `'` inside as `\'` or use ’ (typographic apostrophe). Polish quotes: „…”.
- Non-breaking spaces (` `) where the Bulgarian/English had them (before units, after one-letter words like
  „w”, „z”, „i”, „o”, „a”, „u” is nice but optional).
- Keep every `{placeholder}` exactly (name and braces). Never translate ids, keys, emoji, `{n}`, HTML tags.
- `touch` variants (`{ touch: '...', other: '...' }`): keep both.
- Length: UI labels must stay short (buttons, chips, tabs); match the English length roughly.

## Plurals

Polish needs `one / few / many / other` (Intl.PluralRules('pl')): 1 → one; 2–4, 22–24… → few; 0, 5–21, 25… → many;
fractions → other. Wherever the Bulgarian has `{ one, other }`, write `{ one, few, many, other }`:

```js
'common.coins': { one: '{n} moneta', few: '{n} monety', many: '{n} monet', other: '{n} monety' },
```

## Gender agreement objects

Objects keyed `{ m, f, n, pl }` choose by the gender of a content name in the params: keep them, write the Polish
agreeing form for each (`m` masculine, `f` feminine, `n` neuter, `pl` a name that is a plural noun).

## Content-name placeholders (forms)

A param holding a content name renders in the form after the colon. Polish forms:

| form | Polish meaning | example (marchewka) |
|---|---|---|
| `{x}` | label, nominative, capital | Marchewka |
| `{x:lc}` | nominative in a sentence | marchewka |
| `{x:acc}` | accusative singular (object: „posadź …”, „kup …”) | marchewkę |
| `{x:gen}` | genitive singular („brak …”, „bez …”, „z …”) | marchewki |
| `{x:pl}` | nominative plural (also after 2–4) | marchewki |
| `{x:count}` | genitive plural (after 5+, „dużo …”) | marchewek |
| `{x:cap}` | label as is | Marchewka |
| `{x:omit}` | leave the param out | |
| `{q}` (a quantity ref) | the number with the right noun form | 5 marchewek, 3 snopy pszenicy |

Bulgarian forms map: `def` → write `lc`; `defObj` → `acc` (or `gen` after a preposition needing it); `plDef` → `pl`.
Polish has more cases than these: **rephrase** to avoid instrumental, locative and dative of a placeholder (e.g.
„Gotowe: {crop}” instead of a sentence that would need „marchewką”).

## Names table (`pl/names.js`) entry shape

```js
carrot: { name: 'Marchewka', g: 'f', pl: 'marchewki', gen: 'marchewek', acc: 'marchewkę', genSg: 'marchewki' },
wheat:  { name: 'Pszenica', g: 'f', acc: 'pszenicę', genSg: 'pszenicy', unit: ['snop', 'snopy', 'snopów'] },
```

- `name` label (sentence case), `g` 'm' | 'f' | 'n' | 'pl', `pl` nominative plural, `gen` genitive plural,
  `acc` accusative singular, `genSg` genitive singular. Optional: `short` (≤ 12 chars label), `lc` (only if the
  in-sentence form is not just a lower-case first letter), `proper: true` (keeps its capital), `one` (the singular
  when `name` is a plural), `unit` [after 1, after 2–4, after 5+] for a mass noun (renders „3 snopy pszenicy” with
  `genSg`), `desc` (the description, when the Bulgarian entry has one).
- Masculine animate accusative = genitive („konia”), inanimate = nominative („młyn”).
- Proper names of townsfolk keep their English spelling (Hazel, Mabel, Ollie…); titles translate („babcia Hazel”).

## Glossary (use these everywhere)

| English | Polish |
|---|---|
| coins | monety |
| XP | PD (punkty doświadczenia) |
| Acorns | Żołędzie |
| Level | Poziom |
| Barn | Stodoła |
| Silo | Silos |
| Market Stand | Stragan |
| Farmhouse | Dom |
| Well | Studnia |
| Plot | Grządka |
| Field | Pole |
| Seeds | Nasiona |
| Sickle | Sierp |
| Hand | Ręka |
| Hammer | Młotek |
| Build | Buduj |
| Market | Targ |
| Farm book | Księga farmy |
| Workshop | Warsztat |
| Orders board | Tablica zamówień |
| Order | Zamówienie |
| Quest | Zadanie |
| Ribbon | Wstęga |
| Collections / Album | Kolekcje / Album |
| Decor | Dekoracje |
| Perk | Atut |
| Fertilizer / Compost | Nawóz / Kompost |
| Golden Seeds | Złote nasiona |
| Golden Hour | Złota godzina |
| County Fair | Jarmark |
| County League | Liga powiatu |
| River Barge | Barka rzeczna |
| Town Projects | Projekty miasteczka |
| Restoration | Odbudowa |
| Grandma Hazel | babcia Hazel |
| Harvey (the helper) | Harvey |
| Settings | Ustawienia |
| farmer / partner | farmer / partner (farmerka when clearly female) |
| Thank all | Podziękuj wszystkim |

Tone: warm, cosy, simple. The UI speaks to the player informally („ty”); story letters speak to both farmers („wy”,
„Kochani”). Brand: **MNKISWAN Meadow** never translated.
