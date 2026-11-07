// Course notes for Mathematical Analysis I (Analisi Matematica I), one block per topic.
// Written for this project from the standard first-year syllabus (same topics as the PoliTo course and as
// open textbooks such as OpenStax "Calculus Volume 1/2", CC BY-NC-SA 4.0). Universities can paste their own
// notes in the question generator screen (/org/questions) instead; those are used in the same way.

export const ANALYSIS_I_NOTES: Record<string, string> = {
  limits: `Limits. lim_{x→a} f(x) = L means f(x) gets arbitrarily close to L when x is close to (but not equal to) a.
Rules: limits of sums, products and quotients (denominator limit ≠ 0) are the sums, products and quotients of the limits.
Indeterminate forms: 0/0, ∞/∞, ∞ − ∞, 0·∞, 1^∞, 0^0, ∞^0. Resolve them by factoring, rationalising, or with fundamental limits.
Fundamental limits: sin(x)/x → 1, (1 − cos x)/x² → 1/2, (e^x − 1)/x → 1, ln(1 + x)/x → 1 as x → 0; (1 + a/x)^x → e^a as x → ∞.
Rational functions at ∞: compare degrees; same degree → ratio of leading coefficients.
Hierarchy at +∞: ln x ≪ x^a (a > 0) ≪ b^x (b > 1) ≪ x!.
Squeeze theorem: if g ≤ f ≤ h near a and g, h → L, then f → L (e.g. x·sin(1/x) → 0).`,

  continuity: `Continuity. f is continuous at a if lim_{x→a} f(x) = f(a).
Discontinuities: removable (limit exists but ≠ f(a) or f(a) undefined), jump (left and right limits differ), essential (a one-sided limit is infinite or does not exist).
Piecewise functions: continuity at the junction requires equal one-sided limits, equal to the value there; solve for the parameter.
Intermediate value theorem: f continuous on [a, b] and f(a)·f(b) < 0 ⇒ f has a zero in (a, b).
Weierstrass theorem: f continuous on a closed bounded interval ⇒ f has a maximum and a minimum there.
Compositions, sums and products of continuous functions are continuous; elementary functions are continuous on their domains.`,

  derivatives: `Derivatives. f'(a) = lim_{h→0} (f(a + h) − f(a))/h; geometrically, the slope of the tangent line y = f(a) + f'(a)(x − a).
Rules: (fg)' = f'g + fg', (f/g)' = (f'g − fg')/g², chain rule (f∘g)' = f'(g)·g'.
Basic derivatives: (x^n)' = n x^(n−1), (e^x)' = e^x, (ln x)' = 1/x, (sin x)' = cos x, (cos x)' = −sin x, (arctan x)' = 1/(1 + x²).
Differentiable ⇒ continuous, not the converse (|x| at 0).
Monotonicity: f' > 0 on an interval ⇒ f increasing. Critical points: f'(x) = 0; classify with the sign of f' or with f''.
De l'Hôpital: for 0/0 or ∞/∞, lim f/g = lim f'/g' if the latter exists.
Mean value theorem (Lagrange): f(b) − f(a) = f'(c)(b − a) for some c in (a, b).`,

  taylor: `Taylor expansion. Near x0, f(x) = Σ_{k=0}^{n} f^(k)(x0)/k! (x − x0)^k + o((x − x0)^n) (Peano remainder).
Maclaurin (x0 = 0): e^x = 1 + x + x²/2 + x³/6 + o(x³); sin x = x − x³/6 + o(x⁴); cos x = 1 − x²/2 + x⁴/24 + o(x⁵);
ln(1 + x) = x − x²/2 + x³/3 + o(x³); (1 + x)^a = 1 + a x + a(a − 1)/2 x² + o(x²); 1/(1 − x) = 1 + x + x² + o(x²).
Use: compute limits by expanding numerator and denominator to the first non-zero order; the order of the first non-zero term gives the order of infinitesimal.
The coefficient of x^k in the expansion equals f^(k)(0)/k!, so it gives higher derivatives at 0.
Composition: substitute the inner expansion and keep terms up to the needed order.`,

  integrals: `Integrals. An antiderivative F of f satisfies F' = f; ∫ f(x) dx = F(x) + C.
Fundamental theorem of calculus: ∫_a^b f(x) dx = F(b) − F(a); d/dx ∫_a^x f(t) dt = f(x).
Techniques: substitution (∫ f(g(x)) g'(x) dx = ∫ f(u) du), integration by parts (∫ u dv = uv − ∫ v du), partial fractions for rational functions.
Basic integrals: ∫ x^n dx = x^(n+1)/(n + 1) (n ≠ −1), ∫ 1/x dx = ln|x|, ∫ e^x dx = e^x, ∫ 1/(1 + x²) dx = arctan x.
Odd function on [−a, a] ⇒ integral 0. Area between curves: ∫ (upper − lower) dx.
Improper integrals: ∫_1^∞ 1/x^p dx converges iff p > 1; ∫_0^1 1/x^p dx converges iff p < 1. Use comparison and asymptotic comparison.`,

  series: `Sequences and series. A series Σ a_n converges if its partial sums converge. Necessary condition: a_n → 0 (not sufficient: harmonic series Σ 1/n diverges).
Geometric series Σ q^n (n ≥ 0) converges iff |q| < 1, with sum 1/(1 − q). Generalised harmonic Σ 1/n^p converges iff p > 1.
Tests for positive terms: comparison, asymptotic comparison (a_n ~ b_n ⇒ same behaviour), ratio test (lim a_{n+1}/a_n = L < 1 converges, > 1 diverges, = 1 inconclusive), root test.
Alternating series (Leibniz): Σ (−1)^n b_n with b_n decreasing to 0 converges.
Absolute convergence implies convergence. Telescoping series: Σ (b_n − b_{n+1}) = b_1 − lim b_n.
Useful limits: n^(1/n) → 1; (1 + 1/n)^n → e; n!/n^n → 0.`,

  "complex numbers": `Complex numbers. z = a + ib, i² = −1; conjugate z̄ = a − ib; modulus |z| = √(a² + b²); z·z̄ = |z|².
Division: multiply numerator and denominator by the conjugate of the denominator.
Polar/exponential form: z = ρ(cos θ + i sin θ) = ρ e^{iθ}; multiplication multiplies moduli and adds arguments.
De Moivre: z^n = ρ^n e^{inθ}. Powers of i repeat with period 4.
n-th roots: z^n = w has n distinct roots, with modulus |w|^(1/n) and arguments (arg w + 2kπ)/n, k = 0..n−1 (vertices of a regular polygon).
Euler: e^{iθ} = cos θ + i sin θ, so e^{iπ} = −1. |e^{iθ}| = 1.
A real polynomial with a non-real root also has its conjugate as a root.`,

  odes: `Ordinary differential equations. First-order linear: y' + a(x) y = b(x); multiply by e^{A(x)} with A' = a, then integrate.
y' = k y has solutions y = C e^{kx}. Separable equations y' = f(x) g(y): ∫ dy/g(y) = ∫ f(x) dx (check constant solutions g(y) = 0).
Second-order linear with constant coefficients y'' + p y' + q y = 0: characteristic equation r² + p r + q = 0.
Two real roots r1 ≠ r2: y = C1 e^{r1 x} + C2 e^{r2 x}; double root r: y = (C1 + C2 x) e^{rx}; complex roots α ± iβ: y = e^{αx}(C1 cos βx + C2 sin βx).
Non-homogeneous: general solution = homogeneous solution + one particular solution (similarity method).
Cauchy problem: initial conditions fix the constants; for continuous coefficients the solution exists and is unique.`,
};
