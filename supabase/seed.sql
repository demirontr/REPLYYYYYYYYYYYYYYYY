-- Demo seed (owned by Claude 1). Career data (clubs, events, master programs, more companies) -> seed_careers.sql (Claude 3).

insert into universities (id, name, country, city) values
  (1, 'Politecnico di Torino', 'Italy', 'Torino'),
  (2, 'Technical University of Munich', 'Germany', 'Munich'),
  (3, 'Riga Technical University', 'Latvia', 'Riga');

-- Placeholder companies; Claude 3 may edit them in seed_careers.sql
insert into companies (id, name, sector, description, fields, website) values
  (1, 'Torino Robotics Lab', 'Robotics', 'Industrial robotics and automation startup.', '{robotics,mechanical engineering,ai}', null),
  (2, 'Alpine Data Systems', 'Software', 'Data engineering and machine learning consultancy.', '{data science,ai,software}', null),
  (3, 'Mole Aerospace', 'Aerospace', 'Small satellite components and space systems.', '{aerospace,physics,electronics}', null);

-- Students 1-6 (1 and 2 are the duel demo pair), companies 7-9, university 10
insert into users (id, name, role, university_id, company_id, department, year, interests, academic_status, gpa, xp, elo) values
  (1, 'Giulia Rossi',   'student', 1, null, 'Computer Engineering',   1, '{ai,robotics}',          'first year, on track', 27.5, 420, 1230),
  (2, 'Marco Bianchi',  'student', 1, null, 'Mechanical Engineering', 1, '{robotics,automotive}',  'first year, on track', 25.0, 380, 1190),
  (3, 'Elif Kaya',      'student', 1, null, 'Aerospace Engineering',  1, '{space,physics}',        'first year, strong',   29.0, 510, 1260),
  (4, 'Luca Ferrari',   'student', 1, null, 'Electronic Engineering', 1, '{electronics,energy}',   'first year, struggling with analysis', 21.5, 150, 1150),
  (5, 'Anna Müller',    'student', 2, null, 'Informatics',            1, '{data science,ai}',      'first year, strong',   1.7, 600, 1240),
  (6, 'Jānis Bērziņš',  'student', 3, null, 'Mechatronics',           2, '{robotics,electronics}', 'second year, on track', 7.8, 300, 1200),
  (7, 'Torino Robotics Lab (HR)', 'company', null, 1, null, null, '{}', null, null, 0, 1200),
  (8, 'Alpine Data Systems (HR)', 'company', null, 2, null, null, '{}', null, null, 0, 1200),
  (9, 'Mole Aerospace (HR)',      'company', null, 3, null, null, '{}', null, null, 0, 1200),
  (10, 'PoliTo Student Office',   'university', 1, null, null, null, '{}', null, null, 0, 1200);

insert into courses (id, university_id, code, name, year) values
  (1, 1, 'ANALISI-I', 'Mathematical Analysis I (Analisi Matematica I)', 1);

-- 40 questions: 8 topics x 5 (12 easy, 16 medium, 12 hard). correct_index is 0-based.
insert into questions (course_id, topic, difficulty, prompt, choices, correct_index, explanation, source) values
-- limits
(1, 'limits', 'easy', 'Compute lim_{x→0} sin(x)/x.', '["0","1","∞","It does not exist"]', 1, 'Fundamental limit: sin(x) ≈ x near 0, so the ratio tends to 1.', 'seed'),
(1, 'limits', 'easy', 'Compute lim_{x→+∞} (3x² + 1)/(x² − 2).', '["0","1","3","+∞"]', 2, 'Numerator and denominator have the same degree: the limit is the ratio of leading coefficients, 3/1.', 'seed'),
(1, 'limits', 'medium', 'Compute lim_{x→0} (1 − cos x)/x².', '["0","1/2","1","2"]', 1, '1 − cos x ≈ x²/2 near 0, so the ratio tends to 1/2.', 'seed'),
(1, 'limits', 'medium', 'Compute lim_{x→+∞} (1 + 2/x)^x.', '["1","e","e²","+∞"]', 2, 'lim (1 + a/x)^x = e^a; here a = 2.', 'seed'),
(1, 'limits', 'hard', 'Compute lim_{x→0} (tan x − sin x)/x³.', '["0","1/6","1/2","1"]', 2, 'tan x = x + x³/3 + o(x³) and sin x = x − x³/6 + o(x³); the difference is x³/2 + o(x³).', 'seed'),
-- continuity
(1, 'continuity', 'easy', 'f(x) = (x² − 1)/(x − 1) for x ≠ 1. Which value of f(1) makes f continuous at 1?', '["0","1","2","No value works"]', 2, 'For x ≠ 1, f(x) = x + 1, which tends to 2 as x → 1.', 'seed'),
(1, 'continuity', 'medium', 'f(x) = ax + 1 for x < 2 and f(x) = x² for x ≥ 2. For which a is f continuous on ℝ?', '["1","3/2","2","3"]', 1, 'Match the one-sided limits at 2: 2a + 1 = 4, so a = 3/2.', 'seed'),
(1, 'continuity', 'medium', 'What kind of discontinuity does f(x) = |x|/x have at x = 0?', '["Removable","Jump","Essential (second kind)","None, f is continuous"]', 1, 'The left limit is −1 and the right limit is 1: both exist but differ, so it is a jump.', 'seed'),
(1, 'continuity', 'hard', 'How many real solutions does x³ + x − 1 = 0 have in [0, 1]?', '["None","Exactly one","Exactly two","Three"]', 1, 'f(0) = −1 < 0 < 1 = f(1), so there is a zero (intermediate value theorem); f′(x) = 3x² + 1 > 0, so f is strictly increasing and the zero is unique.', 'seed'),
(1, 'continuity', 'hard', 'Can f(x) = sin(1/x), x ≠ 0, be extended to a function continuous at 0?', '["Yes, with f(0) = 0","Yes, with f(0) = 1","No, the limit at 0 does not exist","Yes, with any value in [−1, 1]"]', 2, 'Along x = 1/(nπ) f is 0, along x = 1/(π/2 + 2nπ) f is 1: two different limits, so lim_{x→0} f does not exist.', 'seed'),
-- derivatives
(1, 'derivatives', 'easy', 'd/dx (x³) = ?', '["x²","3x²","3x³","x⁴/4"]', 1, 'Power rule: d/dx xⁿ = n xⁿ⁻¹.', 'seed'),
(1, 'derivatives', 'easy', 'd/dx (ln x) for x > 0 = ?', '["ln x","x","eˣ","1/x"]', 3, 'Standard derivative: (ln x)′ = 1/x.', 'seed'),
(1, 'derivatives', 'medium', 'd/dx (x eˣ) = ?', '["eˣ","x eˣ","(x + 1)eˣ","(x − 1)eˣ"]', 2, 'Product rule: 1·eˣ + x·eˣ = (x + 1)eˣ.', 'seed'),
(1, 'derivatives', 'medium', 'd/dx sin(x²) = ?', '["cos(x²)","2x cos(x²)","2x sin(x²)","cos(2x)"]', 1, 'Chain rule: cos(x²) times the derivative of x², which is 2x.', 'seed'),
(1, 'derivatives', 'hard', 'Where does f(x) = x³ − 3x have a local maximum?', '["x = 1","x = −1","x = 0","x = √3"]', 1, 'f′(x) = 3x² − 3 = 0 gives x = ±1; f″(x) = 6x is negative at x = −1, so that point is a local maximum.', 'seed'),
-- taylor
(1, 'taylor', 'easy', 'Second-order Maclaurin polynomial of eˣ?', '["1 + x + x²","1 + x + x²/2","x + x²/2","1 − x + x²/2"]', 1, 'eˣ = Σ xⁿ/n!, so up to order 2: 1 + x + x²/2.', 'seed'),
(1, 'taylor', 'medium', 'Third-order Maclaurin polynomial of sin x?', '["x − x³/6","x + x³/6","x − x³/3","1 − x²/2"]', 0, 'sin x = x − x³/3! + x⁵/5! − …', 'seed'),
(1, 'taylor', 'medium', 'Coefficient of x² in the Maclaurin expansion of ln(1 + x)?', '["1/2","−1/2","1","−1"]', 1, 'ln(1 + x) = x − x²/2 + x³/3 − …', 'seed'),
(1, 'taylor', 'hard', 'Second-order Maclaurin polynomial of √(1 + x)?', '["1 + x/2 − x²/8","1 + x/2 + x²/8","1 + x/2 − x²/4","1 − x/2 − x²/8"]', 0, 'Binomial series with α = 1/2: 1 + αx + α(α − 1)/2 x² = 1 + x/2 − x²/8.', 'seed'),
(1, 'taylor', 'hard', 'Compute lim_{x→0} (cos x − 1 + x²/2)/x⁴.', '["0","1/24","−1/24","1/12"]', 1, 'cos x = 1 − x²/2 + x⁴/24 + o(x⁴), so the numerator is x⁴/24 + o(x⁴).', 'seed'),
-- integrals
(1, 'integrals', 'easy', '∫ 2x dx = ?', '["2x² + C","x² + C","x + C","2 + C"]', 1, 'An antiderivative of 2x is x², since (x²)′ = 2x.', 'seed'),
(1, 'integrals', 'easy', '∫₀¹ x dx = ?', '["0","1/2","1","2"]', 1, '[x²/2] from 0 to 1 = 1/2.', 'seed'),
(1, 'integrals', 'medium', '∫ x eˣ dx = ?', '["x eˣ + C","(x + 1)eˣ + C","(x − 1)eˣ + C","eˣ + C"]', 2, 'By parts with u = x, dv = eˣ dx: x eˣ − ∫ eˣ dx = (x − 1)eˣ + C.', 'seed'),
(1, 'integrals', 'medium', '∫₀^π sin x dx = ?', '["0","1","2","π"]', 2, '[−cos x] from 0 to π = −(−1) + 1 = 2.', 'seed'),
(1, 'integrals', 'hard', 'For which p does ∫₁^∞ 1/xᵖ dx converge?', '["p < 1","p ≤ 1","p > 1","p ≥ 1"]', 2, 'For p ≠ 1 the antiderivative is x^(1−p)/(1 − p), which stays bounded only if p > 1; for p = 1 you get ln x, which diverges.', 'seed'),
-- series
(1, 'series', 'easy', 'lim_{n→∞} 1/n = ?', '["1","+∞","0","It does not exist"]', 2, 'The terms get arbitrarily small as n grows.', 'seed'),
(1, 'series', 'medium', 'Σ_{n=0}^∞ (1/2)ⁿ = ?', '["1","3/2","2","+∞"]', 2, 'Geometric series with ratio 1/2: 1/(1 − 1/2) = 2.', 'seed'),
(1, 'series', 'medium', 'The harmonic series Σ_{n=1}^∞ 1/n:', '["converges to 1","converges to ln 2","diverges","converges to π²/6"]', 2, 'It is the p-series with p = 1; compare with ∫ 1/x dx, which diverges.', 'seed'),
(1, 'series', 'hard', 'The series Σ n!/nⁿ:', '["diverges","converges (ratio test)","the ratio test is inconclusive","converges only conditionally"]', 1, 'a_{n+1}/a_n = (n/(n + 1))ⁿ → 1/e < 1, so the ratio test gives convergence.', 'seed'),
(1, 'series', 'hard', 'The series Σ_{n=1}^∞ (−1)ⁿ/n:', '["diverges","converges absolutely","converges conditionally","oscillates without limit"]', 2, 'Leibniz test gives convergence, but Σ 1/n diverges, so convergence is only conditional.', 'seed'),
-- complex numbers
(1, 'complex numbers', 'easy', 'i² = ?', '["1","−1","i","−i"]', 1, 'By definition of the imaginary unit.', 'seed'),
(1, 'complex numbers', 'easy', '|3 + 4i| = ?', '["5","7","25","1"]', 0, '√(3² + 4²) = √25 = 5.', 'seed'),
(1, 'complex numbers', 'medium', '(1 + i)² = ?', '["2","2i","0","1 + 2i"]', 1, '1 + 2i + i² = 1 + 2i − 1 = 2i.', 'seed'),
(1, 'complex numbers', 'medium', '1/i = ?', '["i","−i","1","−1"]', 1, 'Multiply numerator and denominator by −i: −i/(−i²) = −i/1.', 'seed'),
(1, 'complex numbers', 'hard', 'What is the sum of the three solutions of z³ = 1 in ℂ?', '["0","1","3","−1"]', 0, 'They are the roots of z³ − 1, whose z² coefficient is 0, so their sum is 0 (they are symmetric on the unit circle).', 'seed'),
-- odes
(1, 'odes', 'easy', 'General solution of y′ = y?', '["y = x + C","y = Ce^(−x)","y = Ceˣ","y = Cx"]', 2, 'Separable: dy/y = dx gives ln|y| = x + c, so y = Ceˣ.', 'seed'),
(1, 'odes', 'medium', 'Solution of y′ = 2y with y(0) = 3?', '["2e^(3x)","3e^(2x)","3e^(x/2)","e^(2x) + 2"]', 1, 'General solution Ce^(2x); y(0) = C = 3.', 'seed'),
(1, 'odes', 'medium', 'General solution of y″ + y = 0?', '["C₁ cos x + C₂ sin x","C₁eˣ + C₂e^(−x)","(C₁ + C₂x)eˣ","C₁ cos x"]', 0, 'Characteristic equation r² + 1 = 0 gives r = ±i.', 'seed'),
(1, 'odes', 'hard', 'General solution of y″ − 3y′ + 2y = 0?', '["C₁e^(−x) + C₂e^(−2x)","C₁eˣ + C₂xeˣ","C₁ cos 2x + C₂ sin x","C₁eˣ + C₂e^(2x)"]', 3, 'Characteristic equation r² − 3r + 2 = 0 has roots r = 1 and r = 2.', 'seed'),
(1, 'odes', 'hard', 'General solution of y′ + y = x?', '["Ceˣ + x − 1","Ce^(−x) + x − 1","Ce^(−x) + x + 1","Ce^(−x) + x"]', 1, 'Homogeneous part Ce^(−x); try y_p = ax + b: a + ax + b = x gives a = 1, b = −1.', 'seed');

-- explicit ids above: move identity sequences past them
select setval(pg_get_serial_sequence('universities', 'id'), (select max(id) from universities));
select setval(pg_get_serial_sequence('companies', 'id'), (select max(id) from companies));
select setval(pg_get_serial_sequence('users', 'id'), (select max(id) from users));
select setval(pg_get_serial_sequence('courses', 'id'), (select max(id) from courses));
