# Forms Project — Rules

## 📢 עדכוני מוצר (חובה)

**אחרי כל הוספה / שינוי של פיצ'ר שמשפיע על חווית המשתמש — לפני הקומיט הסופי:**

1. פתח את `src/components/layout/product-updates-dialog.tsx`.
2. **הוסף בראש מערך `PRODUCT_UPDATES`** (בתחילתו, לא בסוף) אובייקט חדש:
   ```ts
   {
     date: "<תאריך עברי של היום, למשל '23 באפריל 2026'>",
     title: "<שם הפיצ'ר בעברית, ברור למשתמש סופי>",
     items: [
       "פריט 1 — תיאור קצר ומדויק של מה שהמשתמש יוכל לעשות",
       "פריט 2 — ...",
       // 3-6 פריטים, כתובים מזווית המשתמש ולא מזווית הקוד
     ],
   },
   ```
3. **אם באותו יום כבר קיימת כותרת דומה — אחד את הפריטים לאותה כניסה** במקום ליצור כפילות.
4. נסח *ליוזר*, לא למפתח. לדוגמה:
   - ✅ "הוספת תאריך סגירה לטופס — הטופס נסגר אוטומטית בסוף המועד"
   - ❌ "הוסף submission_end_date ל-FormSettings"
5. **אל תפרסם פיצ'רים פנימיים/ניהוליים** (סופר אדמין, impersonation, וכו') בפירוט — אם בכלל לציין, רמוז בכותרת כמו "כלי ניהול".
6. בזמן הקומיט, העדכון של הדיאלוג חייב להיות חלק מהשינוי הלוגי — באותו commit.

**למה זה חשוב:** המשתמשים רואים את הדיאלוג הזה כ-changelog של המערכת. חוסר עדכון = פיצ'ר מסתורי שהופיע בלי הסבר.

---

## Environment & Tech Stack

- Windows 11 + OneDrive — `node_modules` לא נשמרים בדיסק; תמיד הרץ `npm install` לפני `npm run dev`/`npm run build`.
- Shell: Git Bash (Unix syntax)
- Frontend: Next.js App Router + React 19 + TypeScript strict + Tailwind
- Backend: Supabase (ssr client + service role admin client via `src/lib/supabase/admin.ts`)
- AI: OpenAI SDK (`OPENAI_API_KEY` בלבד — דרך Vercel env)

## Supabase

- פרויקט: `eklcljkwdsfhsfjhezqk` (name: "forms")
- RLS מופעל על כל הטבלאות — לעולם לא לעקוף בקוד אפליקטיבי. אם צריך בכל זאת, להשתמש ב-`createAdminClient()` עם בדיקה מפורשת של `isSuperadmin`.
- עזר אימות: `src/lib/supabase/auth-context.ts` — מחזיר `{ user, isSuperadmin, db }`. סופר אדמין מקבל service-role client שמדלג RLS. כל פעולה חדשה שמגבילה על `user_id = user.id` — להשתמש בפטרן הזה.

## Patterns

- Server actions ב-`src/lib/actions/*` — כולם עם `"use server"`.
- UI components ב-`src/components/**`.
- Types מרוכזים ב-`src/lib/types.ts` — כל הרחבה של `Form`/`FieldConfig`/`FormSettings` חייבת לעדכן גם את `rowToForm`.
- AI builder: `src/lib/actions/ai.ts` — שתי נקודות כניסה:
  - `generateFormWithAI(prompt)` — one-shot מהדשבורד (סכמה מלאה).
  - `chatWithFormAI(input)` — עריכה איטרטיבית מתוך הבילדר (field tools + form-level tools).
  - בכל הוספה של יכולת חדשה לטופס (שדה, הגדרה, workflow), ודא שגם ה-AI מודע אליה בשני הבילדרים.

## UI Conventions (Hebrew-first, RTL)

- כל טקסט למשתמש בעברית.
- כרטיסים: `rounded-xl border border-border bg-card p-4 shadow-sm`.
- כפתור ראשי: `bg-orange-600 hover:bg-orange-500 text-white rounded-xl`.
- Loading text: `"טוען נתונים..."`.

## Git Hygiene

- Commits: כותרת קצרה (עד 72 תווים) + גוף מסביר למה (לא מה). סיים עם:
  ```
  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  ```
- אין למחוק commits קיימים / לכתוב rebase דיסטרקטיבי.
- אל תדחוף force ל-main.
