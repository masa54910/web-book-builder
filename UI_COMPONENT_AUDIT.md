# WebBookMaker UI Component Audit (Pre-Implementation)

Updated: 2026-08-03
Scope: src/app, src/components, src/lib, src/app/globals.css, src/components/ver2/lp/Ver2Landing.module.css

## A. Already Commonized

| Role | Current implementation file(s) | Duplicate count | Can commonize more | Canonical source | Replacement target | Risk |
| --- | --- | ---: | --- | --- | --- | --- |
| Global authenticated/public header container | src/components/AppHeader.tsx | 1 | Yes (logo subpart only) | src/components/AppHeader.tsx | Logo fragment only | Low |
| LP header/nav | src/components/ver2/lp/Ver2Header.tsx | 1 | Yes (logo subpart only) | src/components/ver2/lp/Ver2Header.tsx | Logo fragment only | Low |
| Back navigation rule component | src/components/HomeBackLink.tsx | 1 | Yes (replace hardcoded links) | src/components/HomeBackLink.tsx | AuthForm, not-found, any inline home/top back links | Low |
| Reader shell and pagination behavior | src/components/BookReader.tsx | 1 | No (logic fixed) | src/components/BookReader.tsx | None | High if touched deeply |
| Public book loading wrapper | src/components/PublicBookPage.tsx | 1 | No | src/components/PublicBookPage.tsx | None | Medium |
| Route protection | src/components/ProtectedRoute.tsx | 1 | No | src/components/ProtectedRoute.tsx | None | Medium |
| Auth form logic | src/components/AuthForm.tsx | 1 | Yes (logo/back UI only) | src/components/AuthForm.tsx | logo/back visuals only | Low |
| Dashboard editor logic | src/components/DashboardBookEditor.tsx | 1 | No (core logic fixed) | src/components/DashboardBookEditor.tsx | None | High if touched deeply |
| Reader share UI | src/components/ShareTools.tsx | 1 | Yes (LP/demo share mocks differ) | src/components/ShareTools.tsx | Future LP/demo share actions | Medium |

## B. Same Role Implemented Multiple Times

| Role | Current implementation file(s) | Duplicate count | Can commonize | Canonical source | Replacement target | Risk |
| --- | --- | ---: | --- | --- | --- | --- |
| Brand logo SVG markup | src/components/ver2/lp/Ver2Header.tsx, src/components/AppHeader.tsx, src/components/AuthForm.tsx | 3 | Yes | New src/components/ui/BrandLogo.tsx | Ver2Header/AppHeader/AuthForm logo fragments | Low |
| Back-to-home/top link text and target | src/components/HomeBackLink.tsx, src/components/AuthForm.tsx, src/app/not-found.tsx | 3 | Yes | src/components/HomeBackLink.tsx | AuthForm/not-found hardcoded links | Low |
| Header look/feel (public vs app) | src/components/ver2/lp/Ver2Header.tsx, src/components/AppHeader.tsx | 2 | Partial | Keep separate containers, unify BrandLogo only | No full merge in this pass | Medium |
| Primary CTA styling entrypoints | maker-primary-link, nav-cta, maker-primary-button, LP CSS buttons | 4+ | Partial | globals.css maker-primary-link + LP button classes | Future pass | Medium |
| Secondary CTA/back button styling | maker-secondary-link, reader-edit-link, auth-home-link, LP variants | 4+ | Partial | HomeBackLink + maker-secondary-link baseline | Future pass | Medium |
| Share action UI | src/components/ShareTools.tsx, src/components/PromotionCenter.tsx, LP demo cards | 3+ | Partial | ShareTools for real share actions | Future pass | Medium |
| Card containers | maker-card, LP cards, demo cards | 6+ | Partial | Existing maker-card + LP module tokens | Future pass | Medium |
| Status/loading text blocks | maker-status, reader-loading, page-local status text | many | Yes | maker-status + reader-loading as baseline | Future pass | Low |

## C. Page-Specific Implementations To Keep

| Role | Current implementation file(s) | Duplicate count | Can commonize | Canonical source | Replacement target | Risk |
| --- | --- | ---: | --- | --- | --- | --- |
| Reader page flip / paper layout | src/components/BookReader.tsx and page components | 1 | No | Current reader components | None | High |
| Dashboard book editing form/workflow | src/components/DashboardBookEditor.tsx | 1 | No (logic) | Current editor | UI shell only future | High |
| Pricing comparison layout | src/components/ver2/PricingShowcasePage.tsx | 1 | Partial | Keep page-specific layout | Only tokens/buttons future | Medium |
| Analytics detail charts/cards | src/components/AnalyticsDetailPage.tsx | 1 | Partial | Keep chart logic | Card/status wrapper future | Medium |
| LP hero/showcase storytelling layout | src/components/ver2/lp/Ver2Hero.tsx and LP modules | 1 | Partial | Keep LP layout | only shared primitives | Medium |
| Sample book page art direction | src/components/CoverPage.tsx, TitlePage.tsx, ImagePage.tsx | 1 | No (content layout) | Current reader pages | None | Medium |

## Priority Plan

### Priority 1 (this implementation pass)
- Unify back navigation usage by eliminating hardcoded home/top back links.
- Unify logo markup into a canonical component and reuse across LP/Auth/App header contexts.
- Keep existing route logic, auth logic, reader logic unchanged.

### Priority 2 (next pass)
- Introduce canonical button primitives (Primary/Secondary/Tertiary) while mapping existing classes.
- Introduce canonical card primitive and migrate low-risk cards first.
- Normalize status/loading/empty-state wrappers.

### Priority 3 (next pass)
- Consolidate share/form field primitives and migrate page by page.
- Reduce CSS token duplication between globals.css and LP module tokens.

## Constraints Applied
- No rewrite of reader pagination/flip logic, auth flow, draft restore/save, publication flow, file import, slug generation.
- Replace only duplicated UI fragments in low-risk surfaces.
