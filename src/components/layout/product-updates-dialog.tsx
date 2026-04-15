"use client"

import { useState } from "react"
import { Megaphone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// עדכוני מוצר מבוססי git history (7 ימים אחורה) — מנוסחים למשתמש
const PRODUCT_UPDATES: { date: string; title: string; items: string[] }[] = [
  {
    date: "15 באפריל 2026",
    title: "חלון זמן להגשה",
    items: [
      "הגבלת טופס לתקופה מסוימת — בחירת תאריך פתיחה, תאריך סגירה, או שניהם",
      "מסך 'טרם נפתח' — משתמשים שמגיעים לפני מועד הפתיחה רואים מתי הטופס ייפתח",
      "מסך 'הטופס סגור' — לאחר תאריך הסגירה מוצג המועד האחרון שהיה",
      "חישוב בשעון ישראל — כל הבדיקות נעשות לפי UTC+3",
    ],
  },
  {
    date: "15 באפריל 2026",
    title: "הגבלת הגשות לפי מזהה ייחודי",
    items: [
      "הגבלת הגשות כפולות — בחירת שדה ייחודי (למשל תעודת זהות או טלפון) שמונע הגשה חוזרת עם אותו ערך",
      "מקסימום הגשות למזהה — ניתן להגדיר כמות הגשות מותרת לכל ערך (ברירת מחדל: 1)",
      "הודעת שגיאה מותאמת — אפשרות להגדיר טקסט מותאם שיוצג למשתמש שניסה להגיש שוב",
      "הגדרה בפאנל ההגדרות — סקציה ייעודית 'הגבלת הגשות לפי מזהה' בעורך הטופס",
    ],
  },
  {
    date: "13 במרץ 2026",
    title: "הטמעת iframe, Webhooks ואנליטיקה מתקדמת",
    items: [
      "הטמעת טפסים באתרים — נתיב embed ייעודי (/f/[id]/embed) עם auto-resize, ללא ברנדינג וללא רקע",
      "Snippet generator — כפתור \"הטמעה\" בעורך הטופס שמייצר קוד iframe מוכן להעתקה",
      "הסתרת ברנדינג — אפשרות להסתיר את \"מופעל על ידי אמרל טפסים\" בהגדרות הטופס",
      "מערכת Webhooks דינמית — ניהול webhooks מהעורך: הוספה, עריכה, הפעלה/השבתה, כפתור בדיקה",
      "לוגים של Webhooks — צפייה בהיסטוריית שליחות עם status code, payload ושגיאות",
      "HMAC signing — חתימת webhook עם secret לאימות מקור הבקשה",
      "סטטיסטיקות לכל סוגי השדות — radio, checkbox, number (ממוצע/חציון/min/max), date, star_rating, entry_exit, location, signature",
      "ניתוח AI לתשובות פתוחות — כפתור \"ניתוח AI\" בשדות טקסט שמציג סיכום, נושאים עיקריים וסנטימנט",
      "סינון אנליטיקה לפי טופס — בחירת טופס ספציפי בדף אנליטיקס לצפייה בגרף ייעודי",
      "שיעור מענה לפי שדה — טבלת response rate per field בבחירת טופס ספציפי",
    ],
  },
  {
    date: "13 במרץ 2026",
    title: "AI, תיקיות וממשק",
    items: [
      "שדה חישוב AI — שדה חדש שמחשב תשובה לפי שאר השדות, עם תמיכה במארקדאון",
      "מודלי AI מעודכנים — GPT-5.4 ליצירה ועריכה, GPT-5-nano לחישוב שדות",
      "תיקיות בטפסים — יצירת תיקיות, העברת טפסים בין תיקיות וניהול ידני מהדשבורד",
      "משתנים ב-URL — מילוי אוטומטי של שדות לפי פרמטרים בקישור (prefill)",
      "עורך תנאים משופר — לוגיקה מותנית בשדות עם חוויית משתמש מעודכנת",
      "סגנונות פסקאות — אפשרות לבחור סגנון (ברירת מחדל, מידע, הצלחה, אזהרה, סכנה)",
    ],
  },
  {
    date: "12 במרץ 2026",
    title: "מערך אישורים, datasets ושדות",
    items: [
      "מערך אישורים — אפשרות לאשר/לדחות תגובות ישירות מתוך דף התוצאות והכרטיס",
      "Webhooks לאישורים — התראות על אירועי אישור/דחייה לשילוב עם מערכות חיצוניות",
      "חיבור ל-datasets — שדות עם מקור נתונים (dropdown/multiselect) מטבלאות במערכת",
      "סוגי שדות חדשים — הרחבה של סוגי השדות ובונה הטפסים",
    ],
  },
  {
    date: "10 במרץ 2026",
    title: "אנליטיקס",
    items: [
      "דף אנליטיקס — גרף עמודות הוחלף בלוח מובילים (leaderboard) קריא יותר",
      "שיפור תגובתיות דיאלוגים בממשק",
    ],
  },
]

export function ProductUpdatesDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="עדכוני מוצר"
        aria-label="עדכוני מוצר"
        className="flex items-center justify-center h-8 w-8 rounded-xl transition-colors min-w-[44px] min-h-[44px] text-white/60 hover:text-white hover:bg-white/10"
      >
        <Megaphone className="h-4 w-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-500" />
              עדכוני מוצר
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto space-y-6 pr-1 -mr-1">
            {PRODUCT_UPDATES.map((section) => (
              <section key={section.date}>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  {section.date}
                </p>
                <h3 className="text-sm font-semibold text-neutral-800 mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1.5 text-sm text-neutral-700">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-violet-400 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
