-- Rol de la API: solo esto puede conectarse a Postgres desde apps/api (docs/guides/security.md #5).
-- La contraseña se pone aparte con ALTER ROLE, a mano, en el SQL Editor de Supabase: nunca en una migración versionada.
CREATE ROLE "kairo_api" WITH LOGIN;
--> statement-breakpoint
-- postgres necesita poder "volverse" kairo_api (SET ROLE) para crear el esquema a su nombre;
-- si no, CREATE SCHEMA ... AUTHORIZATION falla con "must be able to SET ROLE".
GRANT "kairo_api" TO "postgres";
--> statement-breakpoint
-- AUTHORIZATION hace a kairo_api dueño del esquema: puede crear tablas ahí sin GRANTs extra,
-- y como dueño de las tablas que cree, RLS no lo bloquea a él (sí a anon/authenticated, que no tienen nada aquí).
CREATE SCHEMA "app" AUTHORIZATION "kairo_api";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "public" FROM "kairo_api";
--> statement-breakpoint
-- Ya no hace falta la membresía: postgres sigue teniendo control total igual (es el admin del proyecto).
REVOKE "kairo_api" FROM "postgres";
