# Digital Design Explorer – platform update (October 2026)

## How to install

1. Back up your current `D:\DigitalDesignExplorer` folder first, so you can return to it if anything goes wrong.
2. Copy every file and folder from this update into `D:\DigitalDesignExplorer`, replacing files when Windows asks.
   Keep your own `images` folder (it was not in the ZIP, so it is not touched).
3. Level 6 now lives in two folders, as its pages expect: `css/level6.css` and `js/level6-*.js`.
   You can delete the old copies of `level6.css`, `level6-common.js` and `level6-module*.js` from the root folder.
4. Push with git as usual.
5. Optional but recommended: run `usn-check.sql` once in Supabase (SQL Editor) so the database itself refuses invalid USNs.

## How to release a level

Open `access-control.js` and change one word:

```javascript
level4: false,   →   level4: true,
```

Save and push. Every Level 4 page opens for students. Do the same for `level5` and `level6`.

## New files

| File | Purpose |
|---|---|
| `access-control.js` | `LEVEL_ACCESS` switch, USN rule, login and level check on every page |
| `common.js` | Header, navigation, breadcrumbs, footer, dashboard overview, certificate |
| `common.css` | The common design system |
| `locked.html` | The "Level is currently locked" screen |
| `level6-certificate.html` | New Level 6 certificate |
| `usn-check.sql` | Optional Supabase rule for the USN format |

## Things students will notice

- Login now asks for the USN as well as email and password.
- Every page needs a login (the home page and login page stay public).
- A student whose saved USN is not in `4GWxxECxxx` format must register again.
- Existing progress is kept: no progress key was renamed or reset.
