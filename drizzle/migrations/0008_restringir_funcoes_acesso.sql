REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.is_authorized(uuid),public.can_write(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.is_authorized(uuid),public.can_write(uuid) TO authenticated,service_role;