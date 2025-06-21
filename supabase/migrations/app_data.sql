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
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, billing_email, plan, owner_uid, created_at, active, logo_url) FROM stdin;
d93561cb-f792-48a0-85a0-74b826e6b9fe	test	test@company.com	free	6273b050-1d4d-4602-8965-83d56b75a68f	2025-06-15 11:03:44.314+00	t	\N
25ff5959-5723-485c-acf6-ce60b9ca468f	ffa	fafa@aa.com	free	6273b050-1d4d-4602-8965-83d56b75a68f	2025-06-15 11:29:53.742+00	t	\N
6a1d34d8-661b-4c81-be6f-bc144600b7d9	Test	test@google.com	free	4b54d206-f1ff-4686-9488-f2f872ec4985	2025-06-16 21:19:17.274+00	f	\N
\.


--
-- Data for Name: company_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_invitations (id, email, "userId", "companyId", "invitedBy", role, message, status, "expiresAt", "acceptedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: company_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_users (id, company_id, user_id, role) FROM stdin;
1e217e1e-3db2-4d52-878c-f1ff1db240c8	d93561cb-f792-48a0-85a0-74b826e6b9fe	6273b050-1d4d-4602-8965-83d56b75a68f	owner
4aef185e-7ee3-44d5-8635-ba61f4f0a68c	6a1d34d8-661b-4c81-be6f-bc144600b7d9	4b54d206-f1ff-4686-9488-f2f872ec4985	owner
\.


--
-- PostgreSQL database dump complete
--

