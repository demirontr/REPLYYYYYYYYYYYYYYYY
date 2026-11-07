-- Career data (owned by Claude 3). Run after seed.sql and migrations/30_ai_careers.sql.
-- The recommender may only pick ids from these tables (PLAN.md §4). `field` values match lib/ai/fields.ts.
-- Companies 4-9, 'PoliTo AI & Data Student Group' and 'RTU Robotics Club' are fictional demo entries.
-- The other clubs, events and master programs are real, but dates and requirements are simplified
-- for the demo: check the official sites before relying on them.

-- More demo companies (1-3 come from seed.sql and are linked to company accounts 7-9)
insert into companies (id, name, sector, description, fields, website) values
  (4, 'Lingotto Mobility',  'Automotive',  'Electric powertrains and vehicle software for small city cars.',          '{automotive,electronics,software}', null),
  (5, 'Po Valley Energy',   'Energy',      'Grid batteries and solar plant monitoring.',                               '{energy,electronics,data science}', null),
  (6, 'Isar Quantum Labs',  'Deep tech',   'Simulation software for quantum and photonic devices.',                    '{physics,software,ai}', null),
  (7, 'Baltic Embedded',    'Electronics', 'Embedded systems and firmware for industrial sensors.',                     '{electronics,robotics,software}', null),
  (8, 'Superga Analytics',  'Software',    'Recommendation systems and analytics for retail.',                          '{data science,ai,software}', null),
  (9, 'Dora Mechanics',     'Manufacturing','Precision mechanical parts and digital twins for factories.',              '{mechanical engineering,robotics,automotive}', null);

-- Student clubs and teams (by university)
insert into clubs (university_id, name, field, description, contact) values
  (1, 'Squadra Corse PoliTo', 'automotive', 'Formula Student team: designs and builds an electric racing car every year.', 'Student teams office, PoliTo'),
  (1, 'Team H2politO', 'energy', 'Builds high-efficiency hydrogen and electric vehicles for energy-efficiency races.', 'Student teams office, PoliTo'),
  (1, 'Team DIANA', 'robotics', 'Planetary rover team: robotics, navigation and field tests for rover challenges.', 'Student teams office, PoliTo'),
  (1, 'ICARUS PoliTo', 'aerospace', 'Designs and flies unmanned aerial vehicles (drones).', 'Student teams office, PoliTo'),
  (1, 'PoliTo Sailing Team', 'mechanical engineering', 'Designs and builds racing sailboats with composite materials.', 'Student teams office, PoliTo'),
  (1, 'PoliTo AI & Data Student Group', 'ai', 'Study group for machine learning: reading sessions, Kaggle nights, project demos.', 'Ask at the student office'),
  (2, 'TUfast Racing Team', 'automotive', 'Formula Student team at TUM (electric and driverless).', 'tufast.de'),
  (2, 'WARR', 'aerospace', 'Scientific workgroup for rocketry and spaceflight at TUM.', 'warr.de'),
  (2, 'TUM.ai', 'ai', 'Student initiative for applied AI projects and a makeathon.', 'tum-ai.com'),
  (3, 'RTU Formula Student', 'automotive', 'Formula Student team of Riga Technical University.', 'RTU student office'),
  (3, 'RTU Robotics Club', 'robotics', 'Hands-on robotics and electronics projects for students.', 'RTU student office');

-- Events worldwide (dates approximate)
insert into events (name, field, city, country, starts_on, url) values
  ('Reply Code Challenge', 'software', 'Online', 'Worldwide', '2027-03-11', 'https://challenges.reply.com'),
  ('Formula Student Italy', 'automotive', 'Varano de'' Melegari', 'Italy', '2027-07-14', 'https://www.formula-ata.it'),
  ('Formula Student Germany', 'automotive', 'Hockenheim', 'Germany', '2027-08-09', 'https://www.formulastudent.de'),
  ('European Rover Challenge', 'robotics', 'Kielce', 'Poland', '2027-09-10', 'https://roverchallenge.eu'),
  ('ActInSpace hackathon', 'aerospace', 'Multiple cities', 'Worldwide', '2027-05-21', 'https://actinspace.org'),
  ('ICRA – IEEE Int. Conference on Robotics and Automation', 'robotics', 'TBA', 'Worldwide', '2027-06-01', 'https://www.ieee-ras.org/conferences-workshops/fully-sponsored/icra'),
  ('NeurIPS (student volunteer program)', 'ai', 'TBA', 'Worldwide', '2026-12-07', 'https://neurips.cc'),
  ('Kaggle competitions', 'data science', 'Online', 'Worldwide', '2026-12-01', 'https://www.kaggle.com/competitions'),
  ('Shell Eco-marathon Europe', 'energy', 'TBA', 'Europe', '2027-05-15', 'https://www.makethefuture.shell/en-gb/shell-eco-marathon'),
  ('CERN openlab Summer Student Programme (application)', 'physics', 'Geneva', 'Switzerland', '2027-01-31', 'https://openlab.cern'),
  ('Hackster / embedded design contests', 'electronics', 'Online', 'Worldwide', '2027-02-01', 'https://www.hackster.io/contests'),
  ('EIT InnoEnergy Business Booster', 'energy', 'TBA', 'Europe', '2027-04-01', 'https://www.innoenergy.com');

-- Master's programs
insert into master_programs (university_name, country, program, field, language, requirements) values
  ('Politecnico di Torino', 'Italy', 'MSc Mechatronic Engineering', 'robotics', 'English', 'BSc in engineering; English B2'),
  ('Politecnico di Torino', 'Italy', 'MSc Computer Engineering (AI and Data Analytics track)', 'ai', 'English', 'BSc in computer engineering or related; English B2'),
  ('Politecnico di Torino', 'Italy', 'MSc Aerospace Engineering', 'aerospace', 'English', 'BSc in aerospace or mechanical engineering; English B2'),
  ('Politecnico di Torino', 'Italy', 'MSc Automotive Engineering', 'automotive', 'English', 'BSc in mechanical or automotive engineering; English B2'),
  ('Technical University of Munich', 'Germany', 'MSc Robotics, Cognition, Intelligence', 'robotics', 'English', 'Strong BSc in a related field; aptitude assessment'),
  ('Technical University of Munich', 'Germany', 'MSc Data Engineering and Analytics', 'data science', 'English', 'BSc in informatics or related; aptitude assessment'),
  ('ETH Zurich', 'Switzerland', 'MSc Robotics, Systems and Control', 'robotics', 'English', 'Excellent BSc in engineering; strong math background'),
  ('TU Delft', 'Netherlands', 'MSc Aerospace Engineering', 'aerospace', 'English', 'BSc in aerospace or related; good grades in math and physics'),
  ('KTH Royal Institute of Technology', 'Sweden', 'MSc Machine Learning', 'ai', 'English', 'BSc with math, programming and statistics courses'),
  ('EPFL', 'Switzerland', 'MSc Data Science', 'data science', 'English', 'Strong BSc in CS, math or related'),
  ('Politecnico di Milano', 'Italy', 'MSc Electrical Engineering', 'energy', 'English', 'BSc in electrical or energy engineering'),
  ('Politecnico di Milano', 'Italy', 'MSc Electronics Engineering', 'electronics', 'English', 'BSc in electronics or related'),
  ('Riga Technical University', 'Latvia', 'MSc Computer Systems', 'software', 'English', 'BSc in computer science or related'),
  ('Technical University of Munich', 'Germany', 'MSc Physics (Applied and Engineering Physics)', 'physics', 'English', 'BSc in physics or engineering physics'),
  ('Politecnico di Torino', 'Italy', 'MSc Mechanical Engineering', 'mechanical engineering', 'English', 'BSc in mechanical engineering; English B2');

-- A few open positions so company pages are not empty
insert into job_posts (company_id, title, kind, field, description) values
  (1, 'Robotics software intern (ROS 2)', 'internship', 'robotics', '6-month internship on motion planning for industrial arms. Python or C++.'),
  (2, 'Junior data engineer', 'job', 'data science', 'Build data pipelines for manufacturing clients. SQL and Python.'),
  (3, 'Satellite thermal analysis intern', 'internship', 'aerospace', 'Support thermal simulations for CubeSat components.'),
  (5, 'Battery data analytics intern', 'internship', 'energy', 'Analyse battery health data from grid storage sites.');

-- Some follows, so a new job post immediately produces notifications in the demo
insert into follows (user_id, company_id) values (2, 1), (6, 1), (5, 2), (3, 3);

-- Demo consents: Sofia (1) shares with Torino Robotics Lab; Leyla (3) shares with Mole Aerospace and PoliTo
insert into consents (student_id, viewer_type, viewer_id, scopes) values
  (1, 'company', 1, '{xp,interests,recommendations}'),
  (3, 'company', 3, '{xp,courses,interests}'),
  (3, 'university', 1, '{xp,courses,answers}');

select setval(pg_get_serial_sequence('companies', 'id'), (select max(id) from companies));
