# Implementation Plan: i18n Support (Issue #55)

## Overview

Introduce internationalization (i18n) for frontend labels in dmp-editor.
Support Japanese (ja) and English (en), with extensibility for future languages.

---

## Requirements

- Target: frontend UI labels (buttons, headings, form fields, error/snackbar messages)
- Exclude: documentation, data fetched from external APIs (KAKEN, GRDM)
- Languages: Japanese (ja, default) + English (en)
- Language switcher: dropdown in `AppHeader`
- State persistence: browser locale detection with localStorage fallback
- Extensibility: namespace-based JSON locale files; adding a new language = adding a new folder

---

## Library Selection

| Package | Role |
|---|---|
| `i18next` | i18n core engine (namespace, interpolation, plurals) |
| `react-i18next` | React integration (`useTranslation` hook, `I18nextProvider`) |
| `i18next-browser-languagedetector` | Auto-detect from `navigator.language`; persist to `localStorage` |

---

## Directory Structure (new files)

```
src/i18n/
  index.ts                     # i18next initialization (imported once in App.tsx)
  locales/
    ja/
      common.json              # Header, footer, shared buttons
      home.json                # Home page (LoginCard, ProjectTable)
      editProject.json         # Edit form: all sections + enum labels
      status.json              # StatusPage (error, 404)
    en/
      common.json
      home.json
      editProject.json
      status.json
```

---

## i18next Initialization (`src/i18n/index.ts`)

```ts
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import jaCommon from './locales/ja/common.json'
import jaHome from './locales/ja/home.json'
import jaEditProject from './locales/ja/editProject.json'
import jaStatus from './locales/ja/status.json'
import enCommon from './locales/en/common.json'
// ...

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['ja', 'en'],
    fallbackLng: 'ja',
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    resources: {
      ja: { common: jaCommon, home: jaHome, editProject: jaEditProject, status: jaStatus },
      en: { common: enCommon, /* ... */ },
    },
    interpolation: { escapeValue: false }, // React handles XSS
  })

export default i18n
```

---

## Language Switcher (`AppHeader.tsx`)

Add a `<Select>` component between the title and user menu:

```tsx
const { i18n } = useTranslation()
<Select
  value={i18n.language.startsWith('ja') ? 'ja' : 'en'}
  onChange={(e) => i18n.changeLanguage(e.target.value)}
  size="small"
  variant="outlined"
  sx={{ color: 'white', /* ... */ }}
>
  <MenuItem value="ja">日本語</MenuItem>
  <MenuItem value="en">English</MenuItem>
</Select>
```

---

## Enum Value Translation Strategy

Several enums in `dmp.ts` are stored as Japanese strings and also used as display labels:
- `revisionType`, `researchPhases`, `personRole`, `researchField`, `dataType`,
  `accessRights`, `hasSensitiveData`

**Approach**: Keep stored values as-is (Japanese). Map to translated display labels via
translation keys in `editProject.json`:

```json
// editProject.json (ja)
{
  "enums": {
    "revisionType": { "新規": "新規", "修正": "修正", "更新": "更新" },
    "personRole": { "研究代表者": "研究代表者", ... }
  }
}

// editProject.json (en)
{
  "enums": {
    "revisionType": { "新規": "New", "修正": "Revision", "更新": "Update" },
    "personRole": { "研究代表者": "Principal Investigator", ... }
  }
}
```

Usage in components:

```tsx
const { t } = useTranslation('editProject')
// In a MenuItem:
<MenuItem value={option}>{t(`enums.revisionType.${option}`)}</MenuItem>
```

---

## Module-Level Array Pattern

Several components define label arrays at module scope (e.g., `formData` in
`ProjectInfoSection`, `PersonInfoSection`, `DataInfoSection`, `DmpMetadataSection`).
Since `t()` requires a hook context, these arrays must be refactored.

**Strategy**: Convert label strings to translation keys; call `t(item.labelKey)` inside
the component render:

```ts
// Before (module level)
const formData = [{ key: "fundingAgency", label: "資金配分機関情報", ... }]

// After (module level — only keys)
const formDataConfig = [{ key: "fundingAgency", labelKey: "projectInfo.fundingAgency", ... }]

// Inside component
const { t } = useTranslation('editProject')
const formData = formDataConfig.map(item => ({ ...item, label: t(item.labelKey) }))
```

---

## Files to Create / Modify

### New files

| File | Content |
|---|---|
| `src/i18n/index.ts` | i18next init |
| `src/i18n/locales/ja/common.json` | Japanese common labels |
| `src/i18n/locales/en/common.json` | English common labels |
| `src/i18n/locales/ja/home.json` | Japanese home labels |
| `src/i18n/locales/en/home.json` | English home labels |
| `src/i18n/locales/ja/editProject.json` | Japanese edit form labels + enum map |
| `src/i18n/locales/en/editProject.json` | English edit form labels + enum map |
| `src/i18n/locales/ja/status.json` | Japanese status page labels |
| `src/i18n/locales/en/status.json` | English status page labels |

### Modified files

| File | Change |
|---|---|
| `src/App.tsx` | Add `import '@/i18n'` |
| `src/components/AppHeader.tsx` | Add language switcher; apply `useTranslation('common')` |
| `src/components/AppFooter.tsx` | No text change needed (copyright string stays as-is) |
| `src/components/Home/LoginCard.tsx` | Apply `useTranslation('home')` |
| `src/components/Home/ProjectTable.tsx` | Apply `useTranslation('home')` |
| `src/pages/StatusPage.tsx` | Apply `useTranslation('status')` |
| `src/pages/EditProject.tsx` | Apply `useTranslation('editProject')` |
| `src/components/EditProject/FormCard.tsx` | Apply `useTranslation('editProject')` |
| `src/components/EditProject/DmpMetaSection.tsx` | Apply `useTranslation('editProject')` |
| `src/components/EditProject/DmpMetadataSection.tsx` | Refactor `formProps` → keys; apply `useTranslation('editProject')` |
| `src/components/EditProject/GrdmProject.tsx` | Apply `useTranslation('editProject')` |
| `src/components/EditProject/ProjectInfoSection.tsx` | Refactor `formData` → keys; apply `useTranslation('editProject')` |
| `src/components/EditProject/PersonInfoSection.tsx` | Refactor `fieldConfigs` → keys; apply `useTranslation('editProject')` |
| `src/components/EditProject/DataInfoSection.tsx` | Refactor `formData` → keys; apply `useTranslation('editProject')` |

---

## Implementation Steps

### Step 1: Install packages
```
npm install i18next react-i18next i18next-browser-languagedetector
```

### Step 2: Create i18n infrastructure
- Create `src/i18n/index.ts`
- Create all locale JSON files (ja + en for common, home, editProject, status)

### Step 3: Integrate i18n into App
- Add `import '@/i18n'` to `src/App.tsx`

### Step 4: Add language switcher to AppHeader
- Add `<Select>` for language switching
- Apply `useTranslation('common')` to existing labels

### Step 5: Update Home page components
- `LoginCard.tsx`
- `ProjectTable.tsx`

### Step 6: Update StatusPage
- `StatusPage.tsx`

### Step 7: Update EditProject page
- `EditProject.tsx`
- `FormCard.tsx`
- `DmpMetaSection.tsx`
- `GrdmProject.tsx`

### Step 8: Update EditProject section components (refactor module-level arrays)
- `DmpMetadataSection.tsx`
- `ProjectInfoSection.tsx`
- `PersonInfoSection.tsx`
- `DataInfoSection.tsx`

### Step 9: Write tests
- Unit tests for locale JSON completeness (all keys present in both ja and en)
- Component tests verifying label rendering with mocked `useTranslation`

### Step 10: Run CI
```
npm run ci
```

---

## Notes

- `i18next-browser-languagedetector` normalizes `ja-JP` → `ja` automatically via
  `supportedLngs` matching.
- Snackbar messages (currently hardcoded strings passed to `showSnackbar(...)`) are
  translated at the call site in each component.
- `helpChip` content in form configs contains JSX (links, line breaks); these will be
  handled as JSX in each component's render, with the translatable text portions
  extracted into translation keys.
- DataInfoSection's `formData` is large; the `helpChip` JSX with inline links will
  keep the JSX structure but use `t()` for the text portions.
