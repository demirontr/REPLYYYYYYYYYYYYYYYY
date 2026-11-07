1. Ne yapıyoruz?
Reply Student Tech Clash 2026 – "AI on Campus" yarışması için bir eğitim sitesi. Yarışma kuralı: üniversitede öğrenme, öğretme veya ölçme-değerlendirme ile ilgili gerçek bir problemi çözen, yapay zeka tabanlı bir çözüm. Yönetim ve lojistik konuları (kayıt, harç, ders programı, ulaşım) kapsam dışı.

Ürün kısaca şöyle:

Öğrenci her dersinden günde bir test çözer. Testteki çoktan seçmeli sorular kolaydan zora doğru sıralıdır.
Doğru cevaplar XP kazandırır. Öğrenciler XP'ye göre önce kendi üniversitesinde, sonra dünya genelinde sıralanır.
İki öğrenci fiziksel olarak yan yana gelince (konum ile) 5 veya 10 soruluk düello yapabilir. Üniversite içinde aralıklarla canlı toplu yarışma düzenlenir.
Yapay zeka ajanları şunları yapar:
öğrencinin performansını analiz eder,
yanlış yaptığı sorulara benzer yeni sorular üretir,
çalışma planı hazırlar,
bölümüne, ilgi alanlarına ve akademik durumuna göre bir alan önerir,
o alana göre dünya genelindeki etkinlikleri, kendi üniversitesindeki kulüpleri, çalışabileceği şirketleri ve master programlarını önerir.
Öğrenci önerileri puanlar. Bu geri bildirim öneri ajanına geri döner.
Şirketlerin sitede profili vardır. Öğrenciler şirketleri takip edebilir. Takip edilen şirket staj veya iş ilanı verince takipçilerine bildirim gider.
Anlaşmalı şirketler ve üniversiteler öğrenci verilerini yalnızca öğrenci izin verirse ve izin verdiği kapsamda görebilir.
Demo içeriği: Politecnico di Torino – Mathematical Analysis I (Analisi Matematica I). Bugün sadece bu ders olacak. Diğer dersler aynı yapıyla sonradan eklenecek.

Jürinin puanlaması (tasarım kararlarında bunu gözet)
Kriter	Ağırlık
Creativity & Innovation	%40
Impact	%20
Technical	%20
Presentation	%20
Jürinin her aşamada sorduğu üç soru:

Bu gerçekten yeni mi, yoksa sadece daha hızlı mı?
Öğrencinin düşünmesine mi yardım ediyor, yoksa onun yerine mi düşünüyor?
Kim yarar görüyor, kim dışarıda kalıyor?
Level 2'de ajan için üç zorunlu şart var:

gerçek ders materyali kullanmalı,
cevap vermenin ötesinde en az bir eylem yapmalı (quiz üretip puanlamak, yanlışları takip etmek, çalışma planı yapmak gibi),
sınırlarını bilmeli: cevabı hazır vermek yerine yol göstermeli.
2. Teknik altyapı (herkes buna uyar)
Konu	Karar
Uygulama	Tek bir Next.js projesi (App Router, TypeScript, Tailwind). Ayrı backend yok. Sunucu tarafı işler Route Handlers / Server Actions ile yapılır.
Veritabanı + canlı bağlantı	Supabase (Postgres + Realtime). Düello ve toplu yarışma Supabase Realtime kanallarıyla çalışır.
Yayın	Vercel. Telefonda GPS HTTPS gerektirdiği için gerçek konum testi Vercel adresinde yapılır.
Yapay zeka	Google Gemini, ücretsiz katman. Bütün çağrılar tek bir dosyadan geçer: lib/ai/llm.ts. Model adı GEMINI_MODEL ortam değişkeninden okunur, böylece model sonradan tek yerden değiştirilebilir.
Giriş	Sadece demo hesaplar. Şifre yok. Üst menüdeki "Switch user" listesinden bir öğrenci, şirket veya üniversite hesabı seçilir. Seçilen kullanıcının id'si cookie'de tutulur (lib/session.ts).
Paket yöneticisi	npm
Ortam değişkenleri (.env.local, repoya gönderilmez; .env.example gönderilir):

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
Önemli: Demo internet bağlantısına veya Gemini kotasına bağımlı kalmamalı. Analysis I için hazırlanmış ~40 soruluk seed verisi repoda durur. AI çağrısı başarısız olursa her ajan anlaşılır bir hata mesajı gösterir ve hazır veriye döner.

3. Git kuralları (çakışmayı önlemek için)
main dalına doğrudan push yapılmaz. Her Claude kendi dalında çalışır:
Claude 1: feat/core-tests
Claude 2: feat/duel-live
Claude 3: feat/ai-careers
Birleştirme Pull Request ile yapılır. Önce Claude 1'in iskelet PR'ı birleşir, sonra diğer ikisi kendi dallarını main'den günceller.
Klasör sahipliği (bölüm 6): her Claude yalnızca kendi klasörlerindeki dosyaları düzenler. Ortak dosyalar (lib/types.ts, lib/supabase.ts, app/layout.tsx, menü) sadece Claude 1'e aittir. Başkası değişiklik isterse PR açıklamasına yazar veya küçük ve ayrı bir commit yapar.
Veritabanı değişikliği: ana şema supabase/schema.sql dosyasındadır ve Claude 1'e aittir. Claude 2 ve 3 yeni tablo veya sütun gerekirse kendi migration dosyalarını açar: supabase/migrations/20_duel_*.sql (Claude 2), supabase/migrations/30_ai_*.sql (Claude 3). Mevcut tabloları silmez veya yeniden adlandırmaz.
Commit mesajları kısa ve İngilizce olur.
4. Ortak veri modeli (Claude 1 kurar, herkes kullanır)
universities(id, name, country, city)
users(id, name, role: 'student'|'company'|'university', university_id, company_id,
      department, year, interests text[], academic_status text, gpa numeric,
      xp int default 0, elo int default 1200, created_at)
courses(id, university_id, code, name, year)
questions(id, course_id, topic, difficulty: 'easy'|'medium'|'hard',
      prompt, choices jsonb (4 seçenek), correct_index int, explanation,
      source text, parent_question_id (benzer soru ise), status: 'approved'|'pending_review')
test_sessions(id, user_id, course_id, kind: 'daily'|'retry'|'duel'|'tournament',
      ref_id (duel/tournament id), date, started_at, finished_at, total_xp)
      -- UNIQUE(user_id, course_id, date) WHERE kind='daily'  → günlük hak bunu sağlar
answers(id, session_id, user_id, question_id, chosen_index, is_correct,
      time_ms int, xp_awarded int, created_at)          -- çözme süreleri burada tutulur
locations(user_id PK, lat, lng, updated_at, sharing bool)
duels(id, challenger_id, opponent_id, course_id, n_questions 5|10,
      status: 'invited'|'active'|'finished'|'declined'|'expired',
      question_ids int[], winner_id, created_at, finished_at)
tournaments(id, university_id, course_id, title, starts_at,
      status: 'scheduled'|'live'|'finished', question_ids int[], current_index int)
tournament_entries(tournament_id, user_id, correct int, time_ms int)
companies(id, name, sector, description, logo_url, fields text[], website)
follows(user_id, company_id, created_at)
job_posts(id, company_id, title, kind: 'internship'|'job', field, description, created_at)
notifications(id, user_id, type, payload jsonb, read bool, created_at)
clubs(id, university_id, name, field, description, contact)
events(id, name, field, city, country, starts_on, url)
master_programs(id, university_name, country, program, field, language, requirements)
analysis_reports(id, user_id, payload jsonb, summary text, created_at)
recommendations(id, user_id, kind: 'field'|'event'|'club'|'company'|'master'|'study_plan',
      item_id, payload jsonb, reason text, created_at)
recommendation_feedback(id, recommendation_id, user_id, rating 1-5, comment, created_at)
user_external_info(id, user_id, kind: 'notes'|'event'|'other', text, created_at)
consents(id, student_id, viewer_type: 'company'|'university', viewer_id,
      scopes text[] ('xp','courses','answers','interests','recommendations'), created_at)
Seed verisi (Claude 1 hazırlar, Claude 3 kariyer verisini tamamlar):

Politecnico di Torino ve "dünya geneli" sıralaması için 2-3 başka üniversite.
Analysis I sorularında konular: limits, continuity, derivatives, Taylor expansion, integrals, sequences & series, complex numbers, ODEs. Kolay, orta ve zor sorular dengeli dağılmalı.
Demo hesapları:
6 öğrenci (farklı XP değerleriyle; ikisi düello demosu için),
3 şirket,
1 üniversite hesabı (PoliTo).
Kulüp, etkinlik, şirket ve master programı listeleri gerçekçi ve elle hazırlanmış olur. Gemini bu listelerin dışından öneri uyduramaz.
5. Oyun kuralları
Günlük test

Her ders için günde 1 test, 10 soru: 3 kolay, 4 orta, 3 zor. Sorular bu sırayla, kolaydan zora gelir.
Düello, toplu yarışma ve yanlış-tekrar testleri bu hakka dahil değildir.
Her soru için seçilen cevap, doğru/yanlış bilgisi ve çözme süresi (time_ms) kaydedilir.
XP

Kolay 10, orta 20, zor 40 XP. Yanlış cevap 0 XP.
Hız bonusu: doğru cevap hedef süreden hızlı verilirse +%25 (yuvarlanır). Hedef süreler: kolay 20 sn, orta 40 sn, zor 60 sn.
Tek kaynak lib/xp.ts dosyasındaki awardXp() fonksiyonudur. Başka kod XP'yi elle değiştirmez.
Sıralama

XP'ye göre iki tablo: kendi üniversitem ve global. Elo düello sıralamasında ayrı bir sütun olarak gösterilir.
Düello (Pokémon GO benzeri)

Konum, sayfa açıkken ~15 saniyede bir locations tablosuna yazılır. Kullanıcı açıkça izin vermezse konum paylaşılmaz.
50 m içindeki kullanıcılar "Nearby" listesinde görünür. Mesafe Haversine formülüyle hesaplanır.
Otomatik: biri 50 m içine girince iki tarafa da "X is nearby — challenge?" bildirimi düşer.
Davet: 5 veya 10 soru seçilir ve davet gönderilir. Karşı taraf kabul edince düello başlar. Davet 60 saniyede kabul edilmezse süresi dolar.
İki oyuncu aynı soruları alır. Kazanan: daha çok doğru yapan. Doğru sayısı eşitse toplam süresi daha kısa olan kazanır.
Elo (satrançtaki gibi): K=32, E = 1/(1+10^((Rb-Ra)/400)).
Kazanana ekstra XP: max(10, round(40 × (1 − E_kazanan))). Böylece Elo'su yüksek rakibi yenen daha çok bonus alır.
Demo modu: "Simulate location" butonu kullanıcıyı seçilen bir demo kullanıcının 10 m yanına koyar. Böylece jüri önünde iki tarayıcı sekmesiyle gösterilebilir.
Canlı toplu yarışma (Kahoot benzeri)

Üniversite hesabı yarışma oluşturur: ders, başlangıç saati, soru sayısı.
Yarışma başlayınca o üniversitenin bütün öğrencileri aynı soruyu aynı anda görür. Her sorunun süresi vardır.
Canlı sıralama Supabase Realtime ile güncellenir. Puanlamada düellodaki kural geçerlidir: önce doğru sayısı, eşitlikte süre.
İlk 3'e XP ödülü verilir.
6. İş bölümü
Claude 1 — İskelet, testler, XP, sıralama
İlk 1-2 saatte yapılacak ve hemen PR açılacak (diğerleri buna bağlı):

Next.js + TypeScript + Tailwind projesi, .env.example, README taslağı.
supabase/schema.sql (bölüm 4) ve supabase/seed.sql (üniversiteler, Analysis I soruları, demo hesaplar).
Ortak dosyalar:
lib/supabase.ts (istemci + sunucu),
lib/types.ts,
lib/session.ts (demo kullanıcı seçimi),
app/layout.tsx (menüde Dashboard, Tests, Leaderboard, Duel, Live, Careers, Companies, Notifications; ayrıca "Switch user"),
basit tasarım bileşenleri: components/ui/*.
Sonra şunlar:

app/tests/*: ders listesi, günlük test akışı (soru başına süre ölçümü, cevap sonrası açıklama), sonuç ekranı.
app/tests/retry: yanlış yapılan soruların tekrar testi. Claude 3'ün benzer soru üreticisini kullanır; o hazır değilse aynı konudan seed sorularıyla çalışır.
lib/xp.ts (awardXp).
app/leaderboard/*: üniversite ve global sekmeleri.
app/dashboard: öğrencinin XP'si, sırası, konu bazında doğruluk oranı, ortalama çözme süresi.
Klasörleri: app/tests, app/leaderboard, app/dashboard, lib/xp.ts, lib/session.ts, lib/supabase.ts, lib/types.ts, components/ui, supabase/schema.sql, supabase/seed.sql.

Claude 2 — Konum, düello, canlı toplu yarışma
lib/geo.ts: Haversine, konum izni, 15 saniyede bir güncelleme, demo modu (simulate location).
app/duel/*:
"Nearby" listesi,
otomatik yakınlık bildirimi,
davet (5/10 soru), kabul/ret, 60 saniyelik süre aşımı,
canlı düello ekranı (iki tarafın ilerlemesi Realtime ile görünür),
sonuç ekranı.
lib/elo.ts: Elo hesabı ve kazanan bonusu. XP verirken mutlaka awardXp() kullanılır.
app/live/*: üniversite hesabının yarışma oluşturma ekranı, öğrencinin bekleme odası, soru-soru canlı akış, canlı sıralama, ödüller.
Düello ve yarışma cevapları da test_sessions + answers tablolarına yazılır (kind='duel' / kind='tournament'). Böylece analiz botu bu verileri de kullanır.
Önce kendi bilgisayarda iki sekmeyle test edilir, sonra Vercel adresinde iki telefonla.
Klasörleri: app/duel, app/live, lib/geo.ts, lib/elo.ts, lib/realtime.ts, supabase/migrations/20_*.

Claude 3 — Yapay zeka ajanları, kariyer önerileri, şirketler, bildirimler, izinler
Bütün AI kodu lib/ai/ altında olur. Her ajan girdi ve çıktısını JSON şemasıyla tanımlar. Çıktı kodda doğrulanır (zod), geçersizse bir kez yeniden denenir.

Soru üretici ajan (lib/ai/questionGenerator.ts):
Girdi: ücretsiz/açık kaynak ders metni (şimdilik açık ders kitapları ve notlar; ileride anlaşmalı üniversitelerin notları).
Çıktı: konu ve zorluk etiketli, 4 şıklı, tek doğru cevaplı, açıklamalı sorular.
Kod kontrolü yapılır (4 şık, tek doğru, tekrar eden soru yok). Üretilen sorular status='pending_review' ile kaydedilir. Seed sorular bununla önceden üretilip elle kontrol edilir.
Benzer soru üretici (lib/ai/similarQuestions.ts): yanlış yapılan sorunun konusu ve türünden yeni sorular üretir (parent_question_id ile bağlı). Claude 1'in tekrar testi bunu kullanır.
Analiz botu (lib/ai/analysisBot.ts):
Hesaplamalar kodda yapılır: konu bazında doğruluk, zorluk bazında ortalama süre, son 7 günlük eğilim, sık yapılan hata türleri.
Gemini bu sayıları kısa bir özete çevirir.
Sonuç analysis_reports tablosuna yazılır ve öneri ajanına girdi olur.
Öneri ajanı (ana ajan) (lib/ai/recommender.ts):
Girdi:
profil (bölüm, ilgi alanları, akademik durum),
son analiz raporu,
user_external_info (öğrencinin anlattığı dış ders notları ve katıldığı etkinlikler),
önceki önerilere verilen puanlar.
Çıktı:
1 alan önerisi,
o alana göre etkinlikler, kendi üniversitesindeki kulüpler, şirketler ve master programları.
Her öneri için bir gerekçe yazılır.
Sadece veritabanındaki listelerden id seçebilir. Kod, seçilen id'lerin gerçekten var olduğunu doğrular.
Geri bildirim döngüsü: her öneri kartında 1-5 puan ve yorum alanı olur. Kayıtlar recommendation_feedback tablosuna gider. Bir sonraki öneri çağrısında bu puanlar girdi olarak verilir ve düşük puan alan türdeki öneriler değişir. Bunu jüriye göster.
Çalışma planı ajanı (lib/ai/studyPlanner.ts): analiz raporundan haftalık plan çıkarır (gün → konu → süre → hangi test). Plan recommendations tablosuna kind='study_plan' ile kaydedilir.
Sınır kuralı (jüri için kritik): ajanlar öğrencinin yerine düşünmez.
Test sırasında cevap veya ipucu verilmez.
Açıklama yalnızca cevaptan sonra gösterilir.
"Explain" butonu cevabı tekrar etmek yerine öğrencinin hatasının nedenini anlatır.
Bu kural sadece prompt'ta değil, kodda da uygulanır: soru cevaplanmadan açıklama API'si çağrılamaz.
Ekranlar:

app/onboarding: bölüm, ilgi alanları, akademik durum soruları; ek bilgi kutusu (dış notlar, etkinlikler).
app/careers: alan önerisi + etkinlikler, kulüpler, şirketler ve master programları kartları; puanlama.
app/study-plan.
app/companies/*:
şirket profil sayfaları, takip et/bırak,
şirket hesabıyla ilan ekleme. İlan eklenince bütün takipçilere notifications kaydı oluşur.
app/notifications: zil ikonu, okundu işaretleme.
app/settings/privacy: öğrenci her şirket veya üniversite için hangi verileri paylaşacağını seçer (consents).
app/org/*:
şirket ve üniversite paneli; sadece izin verilen öğrencileri ve izin verilen alanları gösterir,
şirket bir öğrenciyle görüşmeden önce özetini görebilir,
üniversite kendi öğrencilerinin toplu istatistiklerini görür.
Klasörleri: lib/ai, app/onboarding, app/careers, app/study-plan, app/companies, app/notifications, app/settings, app/org, supabase/migrations/30_*, supabase/seed_careers.sql.

7. 1 günlük öncelik sırası
Mutlaka çalışmalı (demo bunlarla yapılır):

Demo kullanıcı seçimi, günlük Analysis I testi, XP, üniversite ve global sıralama.
İki sekmede demo moduyla düello (davet, oynama, sonuç, Elo).
Analiz botu → öneri ajanı → öneri kartları → puanlama → yeniden öneri döngüsü.
Yanlış sorulara benzer soru testi.
Şirket takip etme + ilan → bildirim.
İzin ekranı + şirket panelinde sadece izin verilen verinin görünmesi.
Vakit kalırsa:

canlı toplu yarışma,
çalışma planı,
gerçek telefonlarla konum testi,
master önerilerinin detay sayfası,
soru üretici için yönetim ekranı.
Saat planı (öneri):

Zaman	Claude 1	Claude 2	Claude 3
0–2 s	İskelet PR'ı	lib/geo.ts, lib/elo.ts (tek başına çalışır)	lib/ai/* (tek başına çalışır, sahte veriyle test)
2 s	İskelet main'e birleşir; herkes dalını günceller		
2–8 s	Test ve sıralama ekranları	Düello ekranları	Öneri, şirket, bildirim ve izin ekranları
8 s+	Entegrasyon, Vercel yayını, README	Canlı yarışma	Çalışma planı, örnek etkileşimler
8. Teslim edilecekler (yarışma kodlama yolu, Level 2)
README: nasıl çalıştırılır, hangi model, kütüphaneler, özel mantık (Claude 1 toplar, herkes kendi bölümünü yazar).
Mimari açıklama: her ajanın girdisi, kullandığı bilgi, çağırdığı araçlar, verdiği kararlar, çıktısı (Claude 3 yazar).
Örnek etkileşimler: en az 3 tane. Biri ajanın sınırını koruduğu an olmalı, örneğin öğrenci testte cevabı istediğinde ajanın reddedip yol göstermesi.
Çalışan repo ve Vercel adresi. İsteğe bağlı kısa demo videosu.
60 saniyelik sunum (problem → fikir → etki). Kodun dışında ayrıca hazırlanır.
9. Çalışma kuralları
Kendi bölümünün dışındaki dosyaya dokunmadan önce PR açıklamasına not düş.
Her ajan çağrısının girdisini ve çıktısını sunucu tarafında logla. Bu loglar hata ayıklama ve jüriye kanıt için kullanılır.
API anahtarlarını asla commit'leme.
Bitirdiğin her parçayı, test etme adımlarıyla birlikte PR açıklamasına yaz.