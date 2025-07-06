--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	4b54d206-f1ff-4686-9488-f2f872ec4985	authenticated	authenticated	bbodn.cz@gmail.com	$2a$10$.Hqj9B4YZuGoaWhOfbcRruQihLhJXR5cgoNBZV5bOJ41VC2PQYHBS	2025-06-10 06:39:59.682301+00	\N		2025-06-10 06:39:30.276913+00		\N			\N	2025-06-20 10:35:04.595248+00	{"provider": "email", "providers": ["email"]}	{"sub": "4b54d206-f1ff-4686-9488-f2f872ec4985", "email": "bbodn.cz@gmail.com", "full_name": "Bohdan Bodnarchuk", "email_verified": true, "phone_verified": false}	\N	2025-06-10 06:39:30.268269+00	2025-06-20 19:35:49.303179+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	6273b050-1d4d-4602-8965-83d56b75a68f	authenticated	authenticated	bodn.bohdan@gmail.com	\N	2025-06-10 07:30:28.048145+00	\N		\N		\N			\N	2025-06-17 08:31:34.051297+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "118415970608296538024", "name": "Bohdan Bodnarchuk", "email": "bodn.bohdan@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJVDkWP-uZVZUKRShrmJuuZRo38hG8D3DlWQltkGOZ1pJMwxVaE=s96-c", "full_name": "Bohdan Bodnarchuk", "avatar_url": "https://dwfpsxsjcmzdljoydzgd.supabase.co/storage/v1/object/public/avatars/avatars/6273b050-1d4d-4602-8965-83d56b75a68f/ChatGPT%20Image%20May%2027,%202025,%2008_50_51%20AM.png", "provider_id": "118415970608296538024", "email_verified": true, "phone_verified": false}	\N	2025-06-10 07:30:28.026041+00	2025-06-20 09:37:57.411404+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
4b54d206-f1ff-4686-9488-f2f872ec4985	4b54d206-f1ff-4686-9488-f2f872ec4985	{"sub": "4b54d206-f1ff-4686-9488-f2f872ec4985", "email": "bbodn.cz@gmail.com", "full_name": "Bohdan Bodnarchuk", "email_verified": true, "phone_verified": false}	email	2025-06-10 06:39:30.272932+00	2025-06-10 06:39:30.272977+00	2025-06-10 06:39:30.272977+00	a4d5dbb1-050c-46d7-b072-0344755c7826
118415970608296538024	6273b050-1d4d-4602-8965-83d56b75a68f	{"iss": "https://accounts.google.com", "sub": "118415970608296538024", "name": "Bohdan Bodnarchuk", "email": "bodn.bohdan@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJVDkWP-uZVZUKRShrmJuuZRo38hG8D3DlWQltkGOZ1pJMwxVaE=s96-c", "full_name": "Bohdan Bodnarchuk", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJVDkWP-uZVZUKRShrmJuuZRo38hG8D3DlWQltkGOZ1pJMwxVaE=s96-c", "provider_id": "118415970608296538024", "email_verified": true, "phone_verified": false}	google	2025-06-10 07:30:28.040312+00	2025-06-10 07:30:28.040359+00	2025-06-17 08:31:31.561105+00	c7fde8c2-1b01-40ac-b1c6-a2de65f952be
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag) FROM stdin;
6eb30ba3-27da-4208-b53f-122947e7d5ff	4b54d206-f1ff-4686-9488-f2f872ec4985	2025-06-20 10:35:04.59535+00	2025-06-20 19:35:49.306298+00	\N	aal1	\N	2025-06-20 19:35:49.306223	Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0	77.236.208.127	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	36	6it5q6wrofme	4b54d206-f1ff-4686-9488-f2f872ec4985	t	2025-06-20 10:35:04.597573+00	2025-06-20 12:25:05.344608+00	\N	6eb30ba3-27da-4208-b53f-122947e7d5ff
00000000-0000-0000-0000-000000000000	37	6quor3veo24s	4b54d206-f1ff-4686-9488-f2f872ec4985	t	2025-06-20 12:25:05.347626+00	2025-06-20 19:35:49.283003+00	6it5q6wrofme	6eb30ba3-27da-4208-b53f-122947e7d5ff
00000000-0000-0000-0000-000000000000	38	neoscjrbg23r	4b54d206-f1ff-4686-9488-f2f872ec4985	f	2025-06-20 19:35:49.294387+00	2025-06-20 19:35:49.294387+00	6quor3veo24s	6eb30ba3-27da-4208-b53f-122947e7d5ff
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 38, true);


--
-- PostgreSQL database dump complete
--

