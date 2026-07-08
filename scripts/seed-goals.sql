-- ============================================================
-- GrowTracker — Seed goals, evidence & attachments for 7 employees
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- Expected performance scores after seeding:
--   Ram Singh    Q1: 71%  Q2: 32%  Overall: ~52%
--   Kiran Patel  Q1: 95%  Q2: 36%  Overall: ~66%
--   Josh Martin  Q1: 53%  Q2: 60%  Overall: ~57%
--   Jivan Mehta  Q1: 94%  Q2: 40%  Overall: ~67%
--   Jay Shah     Q1: 36%  Q2: 16%  Overall: ~26%
--   Kimmy Lee    Q1: 95%  Q2: 68%  Overall: ~82%
--   Rajesh Verma Q1: 52%  Q2: 21%  Overall: ~37%
--
-- Formula: Σ(weight × managerRating/5) / totalWeight × 100
-- ============================================================

DO $$
DECLARE
  -- ── Employee IDs ──────────────────────────────────────────
  ram_id    UUID := '8dbf4484-f01e-44ac-840d-15e7fb136f7f';
  kiran_id  UUID := '12428fd0-130f-4682-a96a-aa6ee64ad696';
  josh_id   UUID := '9e54da81-20d3-4bff-81d6-fb288df78f3b';
  jivan_id  UUID := '1dfa3cb8-ee31-4ef6-ab5f-1d4f819fbf8c';
  jay_id    UUID := 'abaf03f1-205c-492c-8875-ef8d497bd884';
  kimmy_id  UUID := '0984efac-481e-4956-8ab8-9c350ed6dc69';
  rajesh_id UUID := '2c43849f-47a9-4b58-ae6c-75b0b5de2817';

  g  UUID; -- current goal id
  ev UUID; -- current evidence id

BEGIN

-- ============================================================
-- RAM SINGH — Engineering · Reports to Ramesh Kumar
-- Q1 score: 71% · Q2 score: 32% · Overall: ~52%
-- Weights: Q1 (35+30+20+15=100), Q2 (40+35+25=100)
-- ============================================================

-- Q1-G1: Build REST API (approved, weight 35, rating 5) → earned: 35
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'Build REST API for User Module',
  'Design and implement all CRUD endpoints for user management using Node.js and Express with JWT authentication and input validation.',
  'Q1', 'high', 'technical', '2026-03-31', 35, 'approved', 5,
  '2026-01-15 09:00:00+00', '2026-03-18 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Successfully built and deployed all CRUD endpoints for the User Module. Implementation covers GET /users, POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id with proper HTTP status codes, error handling, and Joi schema validation. Integration tests pass with 100% success rate. Added API versioning (/v1/) as a bonus for future compatibility.',
  ARRAY['https://github.com/growtracker/api/pull/42', 'https://api-docs.growtracker.app/users'],
  5, '2026-03-10 10:00:00+00', 'approved',
  'Excellent work, Ram! The API is clean, well-structured, and follows all our conventions. Versioning is a nice touch that will pay off in the future.',
  '2026-03-18 14:00:00+00');

-- Q1-G2: Unit Tests 80% Coverage (approved, weight 30, rating 4) → earned: 24
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'Write Unit Tests — 80% Code Coverage',
  'Achieve minimum 80% code coverage across all service modules using Jest with mock services and snapshot testing.',
  'Q1', 'high', 'technical', '2026-03-31', 30, 'approved', 4,
  '2026-01-15 09:05:00+00', '2026-03-20 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Achieved 84% code coverage across all service modules. Wrote 127 test cases covering happy paths, edge cases, and error conditions. Key coverage: UserService (92%), AuthService (88%), ValidationUtils (95%). Used Jest with mock services and snapshot testing for complex response objects.',
  ARRAY['https://codecov.io/gh/growtracker/coverage-q1'],
  4, '2026-03-15 14:00:00+00', 'approved',
  'Good job achieving and exceeding the 80% target. The test quality is solid — effective use of mocks and good assertion granularity.',
  '2026-03-20 11:00:00+00');

-- Q1-G3: API Documentation (rejected, weight 20) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'API Documentation (Swagger / OpenAPI)',
  'Create comprehensive Swagger/OpenAPI documentation for all endpoints including pagination parameters, error responses, and webhook events.',
  'Q1', 'medium', 'project_delivery', '2026-03-31', 20, 'rejected', NULL,
  '2026-01-15 09:10:00+00', '2026-03-22 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Documented the main authentication and user CRUD endpoints in Swagger. Covered login, register, refresh token, and all user CRUD operations. Still finalising pagination examples and webhook event documentation.',
  '{}'::text[], 3, '2026-03-20 16:00:00+00', 'rejected',
  'Documentation is incomplete — pagination parameters are missing on list endpoints, error response schemas are absent, and the webhook section is entirely undocumented despite being in scope. Please redo with complete endpoint coverage as agreed.',
  '2026-03-22 10:00:00+00');

-- Q1-G4: Code Review Participation (approved, weight 15, rating 4) → earned: 12
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'Active Code Review Participation',
  'Participate in at least 10 peer code reviews per month and provide constructive, detailed feedback on code quality and security.',
  'Q1', 'low', 'soft_skills', '2026-03-31', 15, 'approved', 4,
  '2026-01-15 09:15:00+00', '2026-03-25 09:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed 37 code reviews across Q1: 12 in January, 11 in February, and 14 in March — exceeding the 10/month target. Focused feedback on security vulnerabilities, performance bottlenecks, and code readability. Also created a team code review checklist template that has been adopted by the entire engineering team.',
  '{}'::text[], 4, '2026-03-28 09:00:00+00', 'approved',
  'Ram has been a great contributor to our review culture. The checklist template is a valuable team asset that saves time and improves consistency.',
  '2026-03-25 09:00:00+00');

-- Q2-G5: Redis Caching Layer (approved, weight 40, rating 4) → earned: 32
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'Implement Redis Caching Layer',
  'Add Redis-based caching to reduce database load by 40% on the five most frequently accessed API endpoints.',
  'Q2', 'high', 'technical', '2026-06-30', 40, 'approved', 4,
  '2026-04-01 09:00:00+00', '2026-06-12 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Implemented Redis caching for user profiles, session data, and frequently-queried goal lists. Benchmark results show a 52% reduction in average DB query load during peak hours — exceeding the 40% target. Used Redis cluster mode for high availability. Cache invalidation strategies ensure real-time data consistency. Before/after benchmark screenshot attached.',
  ARRAY['https://grafana.growtracker.app/d/cache-perf', 'https://github.com/growtracker/api/pull/78'],
  5, '2026-06-10 11:00:00+00', 'approved',
  'Impressive results — 52% reduction beats the 40% target. The invalidation logic is thoughtful and the cluster setup is production-ready.',
  '2026-06-12 10:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'redis-benchmark-results.png',
  'https://storage.growtracker.app/evidence/ram/redis-benchmark-results.png',
  'image/png', 284720);

-- Q2-G6: Backend Performance Optimization (submitted/pending, weight 35) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'Backend Performance Optimization',
  'Profile all database queries and optimize at least 3 slow-running queries to execute in under 100ms.',
  'Q2', 'high', 'technical', '2026-06-30', 35, 'submitted', NULL,
  '2026-04-01 09:05:00+00', '2026-06-20 15:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Profiled all 847 active DB queries and identified 5 critical bottlenecks. Optimized 3 of them: (1) Goals list query: 850ms → 45ms via composite index, (2) Employee roster query: 1.2s → 78ms via pagination and projection, (3) Dashboard aggregation: 3.4s → 94ms via materialized view. Detailed profiling report PDF attached.',
  ARRAY['https://github.com/growtracker/api/pull/91'],
  4, '2026-06-20 15:00:00+00', 'pending', NULL, NULL)
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'query-profiling-report-q2.pdf',
  'https://storage.growtracker.app/evidence/ram/query-profiling-report-q2.pdf',
  'application/pdf', 1847392);

-- Q2-G7: Mentor Junior Developers (in_progress, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (ram_id, 'Mentor Junior Developers',
  'Conduct bi-weekly 1:1 sessions with 2 junior developers and provide weekly code review feedback to accelerate their growth.',
  'Q2', 'medium', 'leadership', '2026-06-30', 25, 'in_progress', NULL,
  '2026-04-01 09:10:00+00', '2026-06-01 09:00:00+00');


-- ============================================================
-- KIRAN PATEL — Engineering · Reports to Ramesh Kumar
-- Q1 score: 95% · Q2 score: 36% · Overall: ~66%
-- Weights: Q1 (40+35+25=100), Q2 (45+30+25=100)
-- ============================================================

-- Q1-G1: CI/CD Pipeline (approved, weight 40, rating 5) → earned: 40
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kiran_id, 'CI/CD Pipeline Setup',
  'Design and implement an automated CI/CD pipeline using GitHub Actions with staging and production environments and zero-downtime deployments.',
  'Q1', 'high', 'technical', '2026-03-31', 40, 'approved', 5,
  '2026-01-15 10:00:00+00', '2026-03-15 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed CI/CD pipeline with GitHub Actions. Pipeline stages: lint → typecheck → test → build → deploy. Staging auto-deploys on PR merge; production deploys on tag push with manual approval gate. Zero-downtime deployment uses rolling strategy with health checks. Pipeline YAML config file attached.',
  ARRAY['https://github.com/growtracker/.github/actions'],
  5, '2026-03-12 09:00:00+00', 'approved',
  'Excellent pipeline design. Zero-downtime deploy with the approval gate is exactly what we needed. Documentation is thorough.',
  '2026-03-15 11:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'cicd-pipeline-config.yml',
  'https://storage.growtracker.app/evidence/kiran/cicd-pipeline-config.yml',
  'application/x-yaml', 12480);

-- Q1-G2: Database Schema Design (approved, weight 35, rating 5) → earned: 35
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kiran_id, 'Database Schema Design',
  'Design a normalised relational schema for all GrowTracker entities with RLS policies, indexes, and migration scripts.',
  'Q1', 'high', 'technical', '2026-03-31', 35, 'approved', 5,
  '2026-01-15 10:05:00+00', '2026-03-18 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Designed and implemented the full database schema: profiles, goals, evidence, attachments, notifications, daily_logs — all with RLS enabled. Added composite indexes on frequently joined columns. Wrote idempotent migration scripts and full ERD. Schema reviewed and approved by the engineering lead.',
  ARRAY['https://supabase.com/dashboard/project/gzsnktmtisgvrprplqfy/editor'],
  5, '2026-03-10 14:00:00+00', 'approved',
  'Schema is clean, well-normalised, and secure. RLS policies are correct for all three roles. The migration scripts are production-safe.',
  '2026-03-18 14:00:00+00');

-- Q1-G3: Security Vulnerability Fixes (approved, weight 25, rating 4) → earned: 20
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kiran_id, 'Security Vulnerability Remediation',
  'Audit and resolve all critical and high-severity vulnerabilities identified in the Q4 security scan report.',
  'Q1', 'high', 'technical', '2026-03-31', 25, 'approved', 4,
  '2026-01-15 10:10:00+00', '2026-03-25 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Resolved all 4 critical and 7 high-severity issues: (1) SQL injection in search endpoint — parameterised queries applied, (2) JWT secret rotation with new 256-bit key, (3) Rate limiting on all auth endpoints (50 req/min), (4) Dependency updates patching 3 published CVEs. Post-remediation security scan shows zero remaining criticals.',
  '{}'::text[], 4, '2026-03-22 11:00:00+00', 'approved',
  'All critical issues fully addressed. The JWT rotation process is well-documented for operational use. Rate limiting config is sensible.',
  '2026-03-25 10:00:00+00');

-- Q2-G4: Microservices Architecture (approved, weight 45, rating 4) → earned: 36
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kiran_id, 'Microservices Architecture Design',
  'Produce a detailed architecture document for migrating the monolith to microservices with service boundaries, data contracts, and migration roadmap.',
  'Q2', 'high', 'technical', '2026-06-30', 45, 'approved', 4,
  '2026-04-01 10:00:00+00', '2026-06-08 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed 35-page architecture document covering 6 microservices: Auth, Profile, Goals, Notifications, Analytics, AI-Reports. Includes service mesh topology using Istio, event bus patterns via Kafka, REST/gRPC API contracts, data ownership boundaries, and a phased 6-month migration roadmap. Architecture PDF attached.',
  ARRAY['https://docs.growtracker.app/architecture/microservices-v2'],
  4, '2026-06-05 14:00:00+00', 'approved',
  'Solid architecture. Service boundary decisions are well-reasoned and the Kafka event patterns are correct. Ready to present to leadership for sign-off.',
  '2026-06-08 14:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'microservices-architecture-doc.pdf',
  'https://storage.growtracker.app/evidence/kiran/microservices-architecture-doc.pdf',
  'application/pdf', 3241600);

-- Q2-G5: API Gateway (rejected, weight 30) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kiran_id, 'API Gateway Implementation',
  'Implement an API gateway with rate limiting on all routes, auth middleware, request routing, and circuit breaker pattern.',
  'Q2', 'high', 'technical', '2026-06-30', 30, 'rejected', NULL,
  '2026-04-01 10:05:00+00', '2026-06-15 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Set up Kong API gateway with basic routing for 3 services and auth middleware configured. Rate limiting is partially implemented — applied on 2 of the 6 planned routes. Service discovery is configured but circuit breaker not yet implemented.',
  '{}'::text[], 3, '2026-06-12 11:00:00+00', 'rejected',
  'Implementation is incomplete — rate limiting covers only 2/6 routes, request schema validation is absent, and the circuit breaker pattern (which was in scope) is not implemented. This must be carried to Q3 with the full scope addressed.',
  '2026-06-15 10:00:00+00');

-- Q2-G6: Container Orchestration Docs (submitted/pending, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kiran_id, 'Container Orchestration Documentation',
  'Document Kubernetes deployment configs, HPA scaling policies, and operational runbooks for all 6 services.',
  'Q2', 'medium', 'project_delivery', '2026-06-30', 25, 'submitted', NULL,
  '2026-04-01 10:10:00+00', '2026-06-21 15:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Documented Kubernetes configs for 4 core services including HPA settings (min 2, max 10 replicas), resource limits/requests, liveness/readiness probes, and health check endpoints. Runbooks cover deployment, rollback, and incident response. Helm chart templates included for all services.',
  ARRAY['https://docs.growtracker.app/ops/k8s-runbooks'],
  4, '2026-06-21 15:00:00+00', 'pending', NULL, NULL);


-- ============================================================
-- JOSH MARTIN — Engineering · Reports to Ramesh Kumar
-- Q1 score: 53% · Q2 score: 60% · Overall: ~57%
-- Weights: Q1 (40+35+25=100), Q2 (40+35+25=100)
-- ============================================================

-- Q1-G1: React Component Library (approved, weight 40, rating 4) → earned: 32
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (josh_id, 'React Component Library (50+ components)',
  'Build a reusable Storybook component library with full TypeScript typing, interactive documentation, and accessibility support.',
  'Q1', 'high', 'technical', '2026-03-31', 40, 'approved', 4,
  '2026-01-15 11:00:00+00', '2026-03-20 12:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Built 54 reusable components: Button (6 variants), Input, Select, Modal, Table, DatePicker, Toast, Charts (Bar, Line, Donut), and layout primitives. All fully TypeScript-typed with explicit prop interfaces. Storybook deployed with interactive docs, controls panel, and accessibility audit panel. Showcase screenshot attached.',
  ARRAY['https://storybook.growtracker.app'],
  4, '2026-03-18 10:00:00+00', 'approved',
  'Good library with consistent quality. TypeScript types are well-defined. The chart components especially needed this treatment.',
  '2026-03-20 12:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'component-library-showcase.png',
  'https://storage.growtracker.app/evidence/josh/component-library-showcase.png',
  'image/png', 924160);

-- Q1-G2: Mobile Responsiveness (approved, weight 35, rating 3) → earned: 21
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (josh_id, 'Mobile Responsiveness (320–1440px)',
  'Ensure all screens are fully responsive and usable from 320px mobile to 1440px desktop with no layout breakage.',
  'Q1', 'high', 'project_delivery', '2026-03-31', 35, 'approved', 3,
  '2026-01-15 11:05:00+00', '2026-03-22 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'All main screens tested and functional at 320, 375, 768, 1024, and 1440px. Used CSS Grid and Flexbox throughout. Data tables use horizontal scroll with sticky first column on mobile. No horizontal overflow issues detected in any viewport.',
  ARRAY['https://growtracker.app/dashboard'],
  3, '2026-03-20 14:00:00+00', 'approved',
  'Good coverage overall. Sticky column for tables is a sensible choice. Navigation on 320px is slightly cramped — a minor issue to address in Q2.',
  '2026-03-22 11:00:00+00');

-- Q1-G3: WCAG 2.1 Accessibility (rejected, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (josh_id, 'Accessibility — WCAG 2.1 AA Compliance',
  'Audit and remediate all accessibility issues to achieve WCAG 2.1 Level AA compliance across all primary screens.',
  'Q1', 'medium', 'technical', '2026-03-31', 25, 'rejected', NULL,
  '2026-01-15 11:10:00+00', '2026-03-24 09:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Fixed 12 colour contrast failures (now all 4.5:1+), added ARIA labels to all icon-only buttons, and tested primary flows with VoiceOver on iOS. Some keyboard navigation issues in modal dialogs remain outstanding.',
  '{}'::text[], 3, '2026-03-23 10:00:00+00', 'rejected',
  'Modal focus trap is broken — keyboard-only users cannot dismiss modals or interact with form fields inside them. Form error messages are not announced by screen readers. The skip-to-content link is absent. These are core WCAG 2.1 AA requirements. Must be fixed before claiming compliance.',
  '2026-03-24 09:00:00+00');

-- Q2-G4: Dashboard Redesign (approved, weight 40, rating 5) → earned: 40
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (josh_id, 'Dashboard UI Redesign',
  'Redesign the admin and manager dashboards with improved data visualisation, clearer information hierarchy, and faster load times.',
  'Q2', 'high', 'project_delivery', '2026-06-30', 40, 'approved', 5,
  '2026-04-01 11:00:00+00', '2026-06-10 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed redesign of both admin and manager dashboards. Replaced static tables with interactive bar charts for performance distribution and goal status breakdowns. Added drill-down capability on all charts. Dashboard load time reduced from 3.2s to 0.8s via lazy loading and code splitting. Before/after screenshot attached.',
  ARRAY['https://growtracker.app/admin'],
  5, '2026-06-08 10:00:00+00', 'approved',
  'Stunning redesign. The chart-based approach is far more intuitive than tables. The 4× performance improvement is an excellent bonus.',
  '2026-06-10 14:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'dashboard-redesign-before-after.png',
  'https://storage.growtracker.app/evidence/josh/dashboard-redesign-before-after.png',
  'image/png', 1536000);

-- Q2-G5: Frontend Unit Tests (submitted/pending, weight 35) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (josh_id, 'Frontend Unit Test Coverage — 80% (Jest)',
  'Achieve 80% unit test coverage across all React components and utility functions using Jest and React Testing Library.',
  'Q2', 'high', 'technical', '2026-06-30', 35, 'submitted', NULL,
  '2026-04-01 11:05:00+00', '2026-06-19 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Wrote 203 new test cases across 34 component files. Overall coverage: 82%. Key areas: Dashboard components (88%), Form components (91%), Chart components (76%). Used React Testing Library with user-event for interaction tests and jest-axe for accessibility checks within unit tests.',
  ARRAY['https://codecov.io/gh/growtracker/frontend-q2'],
  4, '2026-06-19 11:00:00+00', 'pending', NULL, NULL);

-- Q2-G6: Cross-Browser Compatibility (approved, weight 25, rating 4) → earned: 20
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (josh_id, 'Cross-Browser Compatibility Fixes',
  'Identify and resolve all critical cross-browser rendering issues on Chrome, Firefox, and Safari.',
  'Q2', 'medium', 'technical', '2026-06-30', 25, 'approved', 4,
  '2026-04-01 11:10:00+00', '2026-06-14 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Fixed 18 cross-browser issues: 7 Safari-specific CSS rendering quirks (sticky positioning, gap in flex), 5 Firefox flexbox issues, 3 Intl.DateTimeFormat locale differences, and 3 CSS Grid fallbacks for older builds. All verified on BrowserStack across Chrome 123, Firefox 124, and Safari 17.3.',
  '{}'::text[], 4, '2026-06-13 10:00:00+00', 'approved',
  'Thorough testing across all targets. Clean, minimal fixes with no regressions. BrowserStack report confirms zero remaining critical issues.',
  '2026-06-14 10:00:00+00');


-- ============================================================
-- JIVAN MEHTA — Product · Reports to Siddharth Sharma
-- Q1 score: 94% · Q2 score: 40% · Overall: ~67%
-- Weights: Q1 (35+35+30=100), Q2 (40+35+25=100)
-- ============================================================

-- Q1-G1: Product Requirements Docs (approved, weight 35, rating 5) → earned: 35
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jivan_id, 'Product Requirements Documentation',
  'Write comprehensive PRDs for Q1 features: goal tracking, evidence submission workflow, and manager review flow.',
  'Q1', 'high', 'project_delivery', '2026-03-31', 35, 'approved', 5,
  '2026-01-15 12:00:00+00', '2026-03-16 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Wrote and reviewed PRDs for all 3 Q1 features. Each PRD includes: problem statement, user stories (with acceptance criteria), edge cases, analytics events, API requirements, and a launch checklist. All PRDs approved by engineering and design leads before sprint start. Goal Tracking PRD PDF attached.',
  ARRAY['https://notion.growtracker.app/prd-goal-tracking', 'https://notion.growtracker.app/prd-evidence-submission'],
  5, '2026-03-12 10:00:00+00', 'approved',
  'Exceptional PRDs. Clear, actionable, and thorough. Set the bar for the entire product team. The acceptance criteria are particularly strong.',
  '2026-03-16 10:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'prd-goal-tracking-q1.pdf',
  'https://storage.growtracker.app/evidence/jivan/prd-goal-tracking-q1.pdf',
  'application/pdf', 2105344);

-- Q1-G2: User Research Synthesis (approved, weight 35, rating 5) → earned: 35
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jivan_id, 'User Research Synthesis (Q1 Interviews)',
  'Conduct minimum 10 user interviews and synthesise insights into a research report with design recommendations.',
  'Q1', 'high', 'project_delivery', '2026-03-31', 35, 'approved', 5,
  '2026-01-15 12:05:00+00', '2026-03-20 12:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Conducted 12 user interviews (2 above target) with a mix of employees and managers. Identified 5 key themes: goal visibility gaps, need for real-time feedback, monthly vs quarterly tracking preferences, mobile usability friction, and notification fatigue. Delivered 28-page synthesis report with 12 actionable design recommendations, all of which were incorporated into the Q2 roadmap.',
  ARRAY['https://docs.growtracker.app/research/q1-synthesis'],
  5, '2026-03-18 10:00:00+00', 'approved',
  'Outstanding research quality. The five themes directly shaped our Q2 roadmap priorities. Exceeded scope and delivered ahead of schedule.',
  '2026-03-20 12:00:00+00');

-- Q1-G3: Q1 Roadmap Planning (approved, weight 30, rating 4) → earned: 24
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jivan_id, 'Q1 Roadmap Planning & Prioritisation',
  'Facilitate roadmap planning sessions and produce a prioritised Q1 feature backlog with effort estimates and dependency mapping.',
  'Q1', 'medium', 'leadership', '2026-03-31', 30, 'approved', 4,
  '2026-01-15 12:10:00+00', '2026-03-22 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Facilitated 2 roadmap planning sessions with engineering and design stakeholders. Used RICE scoring framework (Reach × Impact × Confidence ÷ Effort) to prioritise 23 backlog items. Produced final prioritised backlog with T-shirt size effort estimates and inter-feature dependencies documented. All items structured in Jira as Epics and Stories.',
  '{}'::text[], 4, '2026-03-20 11:00:00+00', 'approved',
  'Well-facilitated sessions with clear outcomes. RICE applied correctly. Backlog is well-structured and dependencies are clearly mapped.',
  '2026-03-22 11:00:00+00');

-- Q2-G4: Feature Prioritisation Framework (approved, weight 40, rating 5) → earned: 40
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jivan_id, 'Feature Prioritisation Framework',
  'Design and document a standardised prioritisation framework for the product team covering scoring models, review cadence, and stakeholder communication.',
  'Q2', 'high', 'project_delivery', '2026-06-30', 40, 'approved', 5,
  '2026-04-01 12:00:00+00', '2026-06-06 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Created a comprehensive prioritisation framework combining RICE and WSJF (Weighted Shortest Job First) scoring with custom weights for customer impact and strategic alignment. Includes: automated scoring spreadsheet, bi-weekly review cadence, decision log template, and stakeholder communication guide with worked examples. Adopted by all 4 PMs this quarter. Framework PDF attached.',
  ARRAY['https://notion.growtracker.app/prioritization-framework'],
  5, '2026-06-04 10:00:00+00', 'approved',
  'Excellent framework. The combination of RICE and WSJF is a smart hybrid. The adoption rate this quarter proves its value.',
  '2026-06-06 14:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'prioritization-framework-v2.pdf',
  'https://storage.growtracker.app/evidence/jivan/prioritization-framework-v2.pdf',
  'application/pdf', 1572864);

-- Q2-G5: Stakeholder Presentations (submitted/pending, weight 35) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jivan_id, 'Stakeholder Presentations — Q2 Review',
  'Deliver 3 stakeholder presentations: Q2 progress review to leadership, Q3 roadmap preview to engineering, and research findings to design.',
  'Q2', 'high', 'leadership', '2026-06-30', 35, 'submitted', NULL,
  '2026-04-01 12:05:00+00', '2026-06-20 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Delivered all 3 presentations: (1) Q2 Progress Review to leadership — 22 slides covering 4 feature launches, key product metrics, and team velocity trends. (2) Q3 Roadmap Preview to engineering leads — 15 slides with technical context for upcoming features. (3) User research findings to design team — 18 slides with affinity-mapped themes and design recommendations. Average audience satisfaction score: 4.6/5.',
  ARRAY['https://docs.growtracker.app/presentations/q2-review'],
  4, '2026-06-20 14:00:00+00', 'pending', NULL, NULL);

-- Q2-G6: Competitive Analysis (in_progress, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jivan_id, 'Competitive Analysis — Performance Management SaaS',
  'Analyse 5 competing performance management tools across pricing, features, UX, and market positioning to identify differentiation opportunities.',
  'Q2', 'medium', 'project_delivery', '2026-06-30', 25, 'in_progress', NULL,
  '2026-04-01 12:10:00+00', '2026-06-10 09:00:00+00');


-- ============================================================
-- JAY SHAH — Product · Reports to Siddharth Sharma
-- Q1 score: 36% · Q2 score: 16% · Overall: ~26%
-- Weights: Q1 (40+35+25=100), Q2 (40+35+25=100)
-- ============================================================

-- Q1-G1: Business Analysis Report (rejected, weight 40) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jay_id, 'Business Analysis Report — Q1 Metrics',
  'Produce a comprehensive business analysis covering KPIs, user adoption funnel, ROI calculations, and benchmarking against Q1 targets.',
  'Q1', 'high', 'project_delivery', '2026-03-31', 40, 'rejected', NULL,
  '2026-01-15 13:00:00+00', '2026-03-24 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed business analysis report covering user adoption rates, feature usage statistics, and a general KPI summary for Q1. Includes monthly active user trends and top feature engagement metrics.',
  '{}'::text[], 3, '2026-03-21 10:00:00+00', 'rejected',
  'The report lacks depth on the most critical metrics — no ROI calculations were included despite being explicitly in scope, the adoption funnel analysis is missing (we only see top-of-funnel MAU, not conversion through to active goal submission), and KPIs are reported as raw numbers without trend lines or comparison to targets. The executive summary does not tell a coherent story. Please redo with a proper ROI model and full funnel breakdown.',
  '2026-03-24 10:00:00+00');

-- Q1-G2: Process Documentation (approved, weight 35, rating 3) → earned: 21
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jay_id, 'Process Documentation — Product Workflows',
  'Document 4 key product workflows: feature request intake, sprint planning agenda, release checklist, and retrospective format.',
  'Q1', 'medium', 'project_delivery', '2026-03-31', 35, 'approved', 3,
  '2026-01-15 13:05:00+00', '2026-03-26 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Documented all 4 product workflows as Confluence pages with step-by-step guides: feature intake form (8-field form with routing rules), sprint planning agenda (2h template with timebox breakdown), release checklist (28 items across engineering, QA, and comms), and retrospective template (4-quadrant format). Pages reviewed and published to the team space.',
  ARRAY['https://confluence.growtracker.app/product-ops'],
  3, '2026-03-24 10:00:00+00', 'approved',
  'Documentation is functional and covers the basics. Edge cases and escalation paths are thin in a few areas — these should be added in the next revision.',
  '2026-03-26 10:00:00+00');

-- Q1-G3: Requirements Gathering (approved, weight 25, rating 3) → earned: 15
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jay_id, 'Requirements Gathering — HR Integration',
  'Gather and document all functional requirements for the HR system integration from HR, IT, and Finance stakeholders.',
  'Q1', 'medium', 'project_delivery', '2026-03-31', 25, 'approved', 3,
  '2026-01-15 13:10:00+00', '2026-03-28 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Conducted stakeholder interviews with HR (2 sessions), IT (1 session), and Finance (1 session) leads. Documented 47 functional requirements across data sync, single sign-on, and reporting modules. Requirements sign-off obtained from all 3 stakeholder groups.',
  '{}'::text[], 3, '2026-03-26 10:00:00+00', 'approved',
  'Requirements are complete enough to proceed. Non-functional requirements (performance SLAs, security, data retention) are thin — flag for follow-up before engineering scoping.',
  '2026-03-28 11:00:00+00');

-- Q2-G4: Market Sizing Analysis (approved, weight 40, rating 2) → earned: 16
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jay_id, 'Market Sizing — Performance Management SaaS',
  'Produce TAM/SAM/SOM analysis for the performance management SaaS market with documented methodology and 5-year growth projections.',
  'Q2', 'high', 'project_delivery', '2026-06-30', 40, 'approved', 2,
  '2026-04-01 13:00:00+00', '2026-06-17 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed TAM/SAM/SOM analysis estimating total addressable market at $8.5B with our serviceable market at $340M. Included competitor revenue estimates (Lattice, Culture Amp, Leapsome) and a 5-year growth projection model showing 23% CAGR.',
  '{}'::text[], 3, '2026-06-15 10:00:00+00', 'approved',
  'The directional sizing is acceptable but the methodology is poorly documented — it is unclear how you arrived at $8.5B TAM. Growth projections lack confidence intervals and assumption sensitivity analysis. The competitive revenue data needs cited sources. The work is usable but requires strengthening before sharing with investors.',
  '2026-06-17 10:00:00+00');

-- Q2-G5: Sprint Planning (submitted/pending, weight 35) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jay_id, 'Sprint Planning Facilitation — Q2 (6 Sprints)',
  'Facilitate all 6 Q2 sprint planning sessions for the product team and maintain a sprint health metrics dashboard.',
  'Q2', 'medium', 'leadership', '2026-06-30', 35, 'submitted', NULL,
  '2026-04-01 13:05:00+00', '2026-06-22 09:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Facilitated 5 of 6 sprint planning sessions (Sprint 7 ran during approved leave). Maintained sprint health dashboard tracking velocity, bug-to-feature ratio, and scope change rate across all sprints. Average session duration improved from 3.0h to 2.1h through structured agenda adherence.',
  '{}'::text[], 3, '2026-06-22 09:00:00+00', 'pending', NULL, NULL);

-- Q2-G6: Churn Analysis (not_started, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (jay_id, 'Churn Analysis — Pilot Customer Data',
  'Analyse pilot customer engagement data to identify early churn signals and produce a retention recommendations report.',
  'Q2', 'medium', 'project_delivery', '2026-06-30', 25, 'not_started', NULL,
  '2026-04-01 13:10:00+00', '2026-04-01 13:10:00+00');


-- ============================================================
-- KIMMY LEE — Design · Reports to Daksh Mehta
-- Q1 score: 95% · Q2 score: 68% · Overall: ~82%
-- Weights: Q1 (40+35+25=100), Q2 (40+35+25=100)
-- ============================================================

-- Q1-G1: Design System (approved, weight 40, rating 5) → earned: 40
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kimmy_id, 'Design System — 50+ Components in Figma',
  'Build a comprehensive Figma design system with 50+ components, all interactive states, design tokens, and full documentation.',
  'Q1', 'high', 'technical', '2026-03-31', 40, 'approved', 5,
  '2026-01-15 14:00:00+00', '2026-03-14 12:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Created a 62-component Figma design system with 4 interactive state variants each (default, hover, active, disabled). Includes typography scale, semantic colour tokens (light and dark), 8pt spacing grid, and motion guidelines. All components use auto-layout and are fully documented with usage guidelines and do/don''t examples. Design system preview screenshot attached.',
  ARRAY['https://figma.com/file/growtracker-design-system'],
  5, '2026-03-12 10:00:00+00', 'approved',
  'World-class design system. Component quality and documentation are exceptional. The semantic token system will save hundreds of hours. Setting the standard for the team.',
  '2026-03-14 12:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'design-system-preview.png',
  'https://storage.growtracker.app/evidence/kimmy/design-system-preview.png',
  'image/png', 2097152);

-- Q1-G2: Brand Guidelines (approved, weight 35, rating 5) → earned: 35
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kimmy_id, 'Brand Guidelines Document',
  'Create comprehensive brand guidelines covering logo system, colour palette, typography stack, illustration style, and tone of voice.',
  'Q1', 'high', 'project_delivery', '2026-03-31', 35, 'approved', 5,
  '2026-01-15 14:05:00+00', '2026-03-18 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Produced a 48-page brand guidelines document covering: logo system (4 variants + clear space rules), colour palette (primary, secondary, semantic, neutral — light and dark), typography stack (Inter for UI, Spectral for editorial), illustration style guide, iconography rules, photography direction, and a tone of voice guide with 20 real-world examples. Brand guidelines PDF attached.',
  ARRAY['https://docs.growtracker.app/brand'],
  5, '2026-03-15 10:00:00+00', 'approved',
  'Perfect brand document. Exactly what we needed to maintain consistency across all touchpoints. Publishing to the company wiki immediately.',
  '2026-03-18 11:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'growtracker-brand-guidelines-v1.pdf',
  'https://storage.growtracker.app/evidence/kimmy/growtracker-brand-guidelines-v1.pdf',
  'application/pdf', 8912896);

-- Q1-G3: User Testing Sessions (approved, weight 25, rating 4) → earned: 20
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kimmy_id, 'User Testing — Prototype Validation (5 Sessions)',
  'Conduct 5 moderated usability sessions on the Q1 prototype and deliver a prioritised findings report with design recommendations.',
  'Q1', 'medium', 'project_delivery', '2026-03-31', 25, 'approved', 4,
  '2026-01-15 14:10:00+00', '2026-03-25 12:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Conducted 6 moderated usability sessions (1 extra for participant diversity) via Maze and Zoom. Tested 3 critical flows: goal submission, evidence upload, and manager review. Identified 14 usability issues: 2 critical, 5 high, 7 medium. Findings report includes severity-ranked recommendations with proposed design solutions.',
  '{}'::text[], 4, '2026-03-22 10:00:00+00', 'approved',
  'Thorough and well-run usability study. Issue prioritisation is accurate and recommendations are actionable. Both critical issues have already been fixed based on your report.',
  '2026-03-25 12:00:00+00');

-- Q2-G4: Mobile App UI Designs (approved, weight 40, rating 5) → earned: 40
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kimmy_id, 'Mobile App UI — Full Screen Coverage',
  'Design all mobile app screens for iOS and Android including all UI states (default, loading, empty, error) with dark mode support.',
  'Q2', 'high', 'technical', '2026-06-30', 40, 'approved', 5,
  '2026-04-01 14:00:00+00', '2026-06-09 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Designed 47 screens across 8 user flows for both iOS and Android. Every screen covers 4 states: default, skeleton loading, empty state, and error state. Full dark mode variants for all screens. Designs use auto-layout with design token references for seamless dev handoff. Interactive prototype covers all primary navigation paths. All-screens overview screenshot attached.',
  ARRAY['https://figma.com/file/growtracker-mobile-ui'],
  5, '2026-06-07 10:00:00+00', 'approved',
  'Incredible mobile design. 4-state coverage for every screen is the right approach. Dark mode is beautiful and production-ready. Dev handoff quality is the best I have seen on this team.',
  '2026-06-09 14:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'mobile-ui-all-screens.png',
  'https://storage.growtracker.app/evidence/kimmy/mobile-ui-all-screens.png',
  'image/png', 4194304);

-- Q2-G5: Custom Icon Library (approved, weight 35, rating 4) → earned: 28
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kimmy_id, 'Custom Icon Library (200+ Icons)',
  'Design and export a custom icon set of 200+ icons in 3 weights (Regular, Medium, Bold) optimised for 24px grid in SVG format.',
  'Q2', 'medium', 'technical', '2026-06-30', 35, 'approved', 4,
  '2026-04-01 14:05:00+00', '2026-06-16 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Designed 218 icons in 3 weights on a 24px grid with consistent 1.5px stroke widths. Categories: Navigation (32), Actions (48), Status (28), Objects (64), Social (18), Brand-specific (28). All SVGs are SVGO-optimised and exported with correct viewBox. Published to npm as @growtracker/icons for engineering reuse. Icon grid preview screenshot attached.',
  ARRAY['https://www.npmjs.com/package/@growtracker/icons'],
  4, '2026-06-14 10:00:00+00', 'approved',
  'Excellent quality and consistency. 218 icons is impressive Q2 output. The npm package is a smart move for reuse across web and mobile.',
  '2026-06-16 11:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'icon-library-preview-grid.png',
  'https://storage.growtracker.app/evidence/kimmy/icon-library-preview-grid.png',
  'image/png', 1310720);

-- Q2-G6: Admin Dashboard Redesign (submitted/pending, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (kimmy_id, 'Admin Dashboard Redesign — Q2',
  'Redesign the admin dashboard with improved data hierarchy, drill-down chart interactions, and a dark mode variant.',
  'Q2', 'medium', 'project_delivery', '2026-06-30', 25, 'submitted', NULL,
  '2026-04-01 14:10:00+00', '2026-06-22 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Completed redesigned admin dashboard in Figma with 3 layout modes: overview (KPI cards + charts), drill-down (expanded single chart with filters), and export mode (print-optimised layout). Dark mode is pixel-perfect with correct semantic tokens. Chart components include donut, horizontal bar, and sparkline variants. Ready for design review.',
  ARRAY['https://figma.com/file/growtracker-admin-v2'],
  4, '2026-06-22 10:00:00+00', 'pending', NULL, NULL)
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'admin-dashboard-redesign-mockup.png',
  'https://storage.growtracker.app/evidence/kimmy/admin-dashboard-redesign-mockup.png',
  'image/png', 2621440);


-- ============================================================
-- RAJESH VERMA — Design · Reports to Daksh Mehta
-- Q1 score: 52% · Q2 score: 21% · Overall: ~37%
-- Weights: Q1 (40+35+25=100), Q2 (40+35+25=100)
-- ============================================================

-- Q1-G1: User Journey Mapping (approved, weight 40, rating 4) → earned: 32
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (rajesh_id, 'User Journey Mapping — Core Flows',
  'Create detailed journey maps for 4 core user flows: onboarding, goal setting, evidence submission, and manager review.',
  'Q1', 'high', 'project_delivery', '2026-03-31', 40, 'approved', 4,
  '2026-01-15 15:00:00+00', '2026-03-20 14:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Created journey maps for 5 flows — added offboarding as a bonus. Each map covers: touchpoints, user emotions (valence-coded), actions, pain points, opportunities, and supporting systems. Validated each map with 4 users via quick observation sessions. Journey map overview image attached.',
  '{}'::text[], 4, '2026-03-18 10:00:00+00', 'approved',
  'Solid journey maps with clear structure. The emotion-coding approach is particularly useful for the design team. Taking initiative on offboarding is appreciated.',
  '2026-03-20 14:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'user-journey-maps-q1.png',
  'https://storage.growtracker.app/evidence/rajesh/user-journey-maps-q1.png',
  'image/png', 1835008);

-- Q1-G2: Usability Testing Plan (rejected, weight 35) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (rajesh_id, 'Usability Testing Plan — Q2 Programme',
  'Design a Q2 usability testing programme with objectives, SMART success metrics, test scripts, and participant recruitment criteria.',
  'Q1', 'medium', 'project_delivery', '2026-03-31', 35, 'rejected', NULL,
  '2026-01-15 15:05:00+00', '2026-03-25 09:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Drafted a Q2 usability testing plan covering 4 test objectives, proposed test scripts for the 3 primary flows, and a rough 6-week timeline.',
  '{}'::text[], 3, '2026-03-22 11:00:00+00', 'rejected',
  'The plan is missing measurable success criteria — there are no SUS score targets, task completion rate thresholds, or error rate benchmarks defined. Test scripts are too loose, missing think-aloud prompts and facilitator guidance. Participant recruitment criteria are entirely absent. Please revise with SMART metrics for every test objective.',
  '2026-03-25 09:00:00+00');

-- Q1-G3: Industry Trends Research Report (approved, weight 25, rating 4) → earned: 20
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (rajesh_id, 'Research Report — Performance Management UX Trends',
  'Research and compile a report on current industry UX trends in performance management tools for Q1.',
  'Q1', 'medium', 'learning', '2026-03-31', 25, 'approved', 4,
  '2026-01-15 15:10:00+00', '2026-03-26 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Compiled a 22-page research report covering 5 trend areas: continuous feedback UX patterns, OKR visualisation approaches, gamification in performance tracking, AI-assisted goal suggestions, and mobile-first design. Includes 15 annotated competitor screenshots and 8 direct design recommendations for GrowTracker. Research report PDF attached.',
  ARRAY['https://docs.growtracker.app/research/industry-trends-q1'],
  4, '2026-03-24 11:00:00+00', 'approved',
  'Excellent research depth and breadth. The annotated screenshots and direct recommendations are exactly what the design team needed as input for Q2.',
  '2026-03-26 11:00:00+00')
RETURNING id INTO ev;

INSERT INTO public.attachments (goal_id, evidence_id, name, uri, mime_type, size)
VALUES (g, ev, 'performance-mgmt-ux-trends-q1.pdf',
  'https://storage.growtracker.app/evidence/rajesh/performance-mgmt-ux-trends-q1.pdf',
  'application/pdf', 4718592);

-- Q2-G4: A/B Testing Framework (submitted/pending, weight 40) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (rajesh_id, 'A/B Testing Framework for UX Decisions',
  'Design and document an A/B testing framework for UX design decisions with hypothesis templates, sample size calculator, and analysis guidelines.',
  'Q2', 'high', 'project_delivery', '2026-06-30', 40, 'submitted', NULL,
  '2026-04-01 15:00:00+00', '2026-06-21 11:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Created 18-page A/B testing framework document including: SMART hypothesis template, sample size calculator with 80% power at 5% significance, minimum test duration guide (accounting for day-of-week effects), analysis checklist, and decision log format. Three worked examples from recent design decisions (button label, CTA placement, empty state design) included.',
  ARRAY['https://docs.growtracker.app/design-ops/ab-testing-framework'],
  3, '2026-06-21 11:00:00+00', 'pending', NULL, NULL);

-- Q2-G5: User Interview Synthesis (approved, weight 35, rating 3) → earned: 21
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (rajesh_id, 'Interview Synthesis — 20 User Interviews',
  'Synthesise insights from 20 user interviews into themes, an insight repository, and a design recommendations report.',
  'Q2', 'high', 'project_delivery', '2026-06-30', 35, 'approved', 3,
  '2026-04-01 15:05:00+00', '2026-06-18 10:00:00+00')
RETURNING id INTO g;

INSERT INTO public.evidence (goal_id, description, links, self_rating, submitted_at, status, manager_feedback, reviewed_at)
VALUES (g,
  'Conducted and synthesised 20 user interviews across both employee and manager segments (12:8 split). Used affinity mapping to surface 8 key themes. Built an insight repository in Dovetail with 120+ tagged quotes. Delivered a 15-page synthesis report with 12 prioritised design recommendations.',
  '{}'::text[], 3, '2026-06-16 10:00:00+00', 'approved',
  'Good synthesis. Affinity mapping is well-executed and the Dovetail repository is useful. Recommendations #7 and #9 are particularly insightful. Tagging consistency in Dovetail could be improved — some quotes are under-tagged.',
  '2026-06-18 10:00:00+00');

-- Q2-G6: Persona Documentation (in_progress, weight 25) → earned: 0
INSERT INTO public.goals (employee_id, title, description, quarter, priority, category, target_date, weight, status, manager_rating, created_at, updated_at)
VALUES (rajesh_id, 'Persona Documentation — 4 User Personas',
  'Create 4 validated user personas (Employee, Manager, Admin, HR Stakeholder) grounded in Q2 research data for use across product and design.',
  'Q2', 'medium', 'project_delivery', '2026-06-30', 25, 'in_progress', NULL,
  '2026-04-01 15:10:00+00', '2026-06-10 09:00:00+00');

END $$;

-- ============================================================
-- Verify: count goals and evidence per employee
-- ============================================================
SELECT
  p.first_name || ' ' || p.last_name AS employee,
  p.department,
  COUNT(DISTINCT g.id)               AS goals,
  COUNT(DISTINCT ev.id)              AS evidence_records,
  COUNT(DISTINCT a.id)               AS attachments,
  SUM(CASE WHEN g.status = 'approved'   THEN 1 ELSE 0 END) AS approved,
  SUM(CASE WHEN g.status = 'rejected'   THEN 1 ELSE 0 END) AS rejected,
  SUM(CASE WHEN g.status = 'submitted'  THEN 1 ELSE 0 END) AS submitted,
  SUM(CASE WHEN g.status = 'in_progress'THEN 1 ELSE 0 END) AS in_progress,
  SUM(CASE WHEN g.status = 'not_started'THEN 1 ELSE 0 END) AS not_started
FROM public.profiles p
LEFT JOIN public.goals g ON g.employee_id = p.id
LEFT JOIN public.evidence ev ON ev.goal_id = g.id
LEFT JOIN public.attachments a ON a.goal_id = g.id
WHERE p.id IN (
  '8dbf4484-f01e-44ac-840d-15e7fb136f7f',
  '12428fd0-130f-4682-a96a-aa6ee64ad696',
  '9e54da81-20d3-4bff-81d6-fb288df78f3b',
  '1dfa3cb8-ee31-4ef6-ab5f-1d4f819fbf8c',
  'abaf03f1-205c-492c-8875-ef8d497bd884',
  '0984efac-481e-4956-8ab8-9c350ed6dc69',
  '2c43849f-47a9-4b58-ae6c-75b0b5de2817'
)
GROUP BY p.id, p.first_name, p.last_name, p.department
ORDER BY p.department, p.first_name;
