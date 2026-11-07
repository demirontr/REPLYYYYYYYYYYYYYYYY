# AI on Campus

Reply Student Tech Clash 2026 · "AI on Campus" projesi. Öğrenciler her derste günlük test çözer, XP kazanır, yakınlarındaki öğrencilerle düello yapar. Yapay zeka ajanları performansı analiz eder, yanlış yapılan sorulara benzer sorular ve çalışma planı hazırlar, kariyer önerilerinde bulunur. Demo dersi: **Politecnico di Torino · Analisi Matematica I**.

Plan ve iş bölümü: [PLAN.md](PLAN.md) · Koordinasyon: issue #1

## Kurulum

Gerekenler: Node.js 20+, Git, bir [Supabase](https://supabase.com) projesi (ücretsiz katman yeterli).

1. **Veritabanı:** Supabase'de **SQL Editor**'ı aç ve sırayla çalıştır:
   1. `supabase/schema.sql`
   2. `supabase/seed.sql`
   3. `supabase/migrations/*.sql` (varsa, isim sırasıyla)
   4. `supabase/seed_careers.sql` (varsa)
2. **Ortam değişkenleri:** `.env.example` dosyasını `.env.local` adıyla kopyala ve doldur. Supabase anahtarları **Project Settings → API** altında. `.env.local` repoya gönderilmez.
3. **Çalıştır:**
   ```bash
   npm install
   npm run dev     # http://localhost:3000
   npm test        # XP kuralları testi
   ```

## Demo hesaplar

Giriş yok: sağ üstteki listeden kullanıcı seçilir (cookie `uid`).

| id | Kim | Not |
|---|---|---|
| 1–4 | PoliTo öğrencileri | 1 ve 2 düello demosu için |
| 5 | TUM öğrencisi | Global sıralama için |
| 6 | RTU öğrencisi | Global sıralama için |
| 7–9 | Şirket hesapları | |
| 10 | PoliTo üniversite hesabı | Canlı yarışma oluşturur |

## Yapı

| Klasör | Sahibi | İçerik |
|---|---|---|
| `app/tests`, `app/leaderboard`, `app/dashboard` | Claude 1 | Günlük test, tekrar testi, sıralama, panel |
| `lib/supabase.ts`, `lib/session.ts`, `lib/types.ts`, `lib/xp.ts`, `components/ui` | Claude 1 | Ortak kod |
| `app/duel`, `app/live`, `lib/geo.ts`, `lib/elo.ts`, `lib/realtime.ts` | Claude 2 | Konum, düello, canlı yarışma |
| `lib/ai`, `app/careers`, `app/companies`, `app/notifications`, `app/settings`, `app/org`, `app/onboarding`, `app/study-plan` | Claude 3 | AI ajanları, kariyer, şirketler, izinler |

## Ortak API (Claude 1)

- `supabaseAdmin()`: sunucu tarafı Supabase istemcisi (service role). `supabaseBrowser()`: istemci tarafı (anon key, Realtime için).
- `getCurrentUser(): Promise<User>`: seçili demo kullanıcı. `todayRome()`: Torino saatine göre bugünün tarihi.
- `xpForAnswer(difficulty, isCorrect, timeMs)`: kolay 10, orta 20, zor 40 XP. Hedef süreden (20/40/60 sn) hızlı doğru cevaba +%25.
- `awardXp(userId, amount)`: `users.xp`'yi değiştiren **tek** yer (atomik `award_xp` RPC'si).
- `submitAnswer()` (`app/tests/actions.ts`): doğru cevabı ve açıklamayı **sadece cevap kaydedildikten sonra** döndürür. Sayfa soruları istemciye `correct_index` ve `explanation` olmadan gönderir. Ajan sınırı kuralı böylece kodda da uygulanır.

## Oyun kuralları (uygulanan)

- Ders başına günde 1 günlük test: 10 soru (3 kolay, 4 orta, 3 zor), kolaydan zora. Kural `test_sessions` üzerindeki tekil index ile sağlanır.
- **Tekrar testi:** hiç doğru yapılmamış yanlış soruların konularından en fazla 10 soru. Günlük hakka dahil değildir.
- Her cevap için seçilen şık, doğru/yanlış bilgisi, süre (`time_ms`) ve kazanılan XP kaydedilir.
- Düello ve turnuva cevapları soru başına XP vermez. Sadece kazanan bonusu verilir (issue #1).
