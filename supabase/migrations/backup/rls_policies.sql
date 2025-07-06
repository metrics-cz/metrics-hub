-- Name: companies User can select their companies; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "User can select their companies" ON public.companies FOR SELECT TO authenticated USING (((auth.uid() = owner_uid) OR (EXISTS ( SELECT 1
-- Name: companies Users can insert companies they own; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Users can insert companies they own" ON public.companies FOR INSERT WITH CHECK ((owner_uid = auth.uid()));
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
-- Name: company_users company_users_self_select; Type: POLICY; Schema: public; Owner: -
CREATE POLICY company_users_self_select ON public.company_users FOR SELECT TO authenticated USING ((user_id = auth.uid()));
