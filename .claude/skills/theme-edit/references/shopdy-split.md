# When a theme change also needs shopdy-promax code (theme-edit flow D)

## 1. The table to show the user (Vietnamese, before any code)

| | Việc | Ai làm | Khi nào |
|---|---|---|---|
| Shopdy | <data / API / editor setting / price logic the platform must add> | dev shopdy (ticket SHOPDY-<n>) | after the Jira key, spec + plan approved |
| Theme | <markup, styles, script; how it reads the new data; what it shows until shopdy ships> | Claude, now | after this table is approved |
| Admin | <what the user sets once shopdy ships> | người dùng | after production |

Also say: what works before shopdy ships (the theme must not break), the risks, and how to check it on the live store.

## 2. The shopdy spec

`D:\shopdy-promax\docs\<yyyy-mm-dd>-spec-<topic>.md` (the naming of that repo's docs folder):

```md
# Spec: <topic>

Status: draft for SHOPDY-<n> (waiting for the Jira key) · from theme <slug> (d:\source-theme)

## Why
<the store owner's need, the page, a link to the competitor if any>

## What the theme already does
<files in the theme, the data it expects (field names, shapes), its fallback>

## What shopdy must do
- Data / API: <fields on product / variant / settings, endpoint, response shape>
- Editor: <setting type, where it appears>
- Rules: <price / cart / checkout behaviour, edge cases>

## Acceptance
- <testable conditions, including the theme showing it on the storefront>

## Out of scope
- <…>
```

## 3. The Jira ticket draft

```
Title: [Theme] <short need>
Description: <2–3 lines: who needs it, what changes for the shopper>
Spec: docs/<yyyy-mm-dd>-spec-<topic>.md
Theme part: done in <theme slug>, waits for this ticket (works without it: <fallback>)
Acceptance: <the spec's list>
```

Never edit shopdy code from theme-edit. With a Jira key and the user's approval of the spec + plan, that work follows
the shopdy team workflow in a shopdy-promax session (`.claude/skills/store-page-from-link/references/shopdy-dev-workflow.md`).
