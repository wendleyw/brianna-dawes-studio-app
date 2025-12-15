-- Script para criar o usuário admin no Supabase
-- Execute este script no Supabase Dashboard → SQL Editor

-- 1. Deletar usuário existente se houver (limpar tudo)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Procurar o usuário em auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'wendleywilson@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Deletar de public.users primeiro (devido ao ON DELETE CASCADE isso é automático, mas vamos garantir)
    DELETE FROM public.users WHERE email = 'wendleywilson@gmail.com';

    -- Deletar de auth.users
    DELETE FROM auth.users WHERE id = v_user_id;

    RAISE NOTICE 'Usuário existente deletado: %', v_user_id;
  ELSE
    RAISE NOTICE 'Nenhum usuário encontrado com este email';
  END IF;
END $$;

-- 2. Criar novo usuário no auth.users com a senha correta
-- IMPORTANTE: Substitua 'BriannaStudio2024!Admin' pela sua VITE_ADMIN_PASSWORD
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'wendleywilson@gmail.com',
  crypt('BriannaStudio2024!Admin', gen_salt('bf')), -- Senha do VITE_ADMIN_PASSWORD
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin","role":"admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 3. O registro em public.users será criado automaticamente pela trigger
-- Mas vamos esperar um pouco e depois promover a super admin

-- 4. Promover o usuário a super admin
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Procurar o usuário recém-criado
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'wendleywilson@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Atualizar para super admin
    UPDATE public.users
    SET
      is_super_admin = true,
      role = 'admin',
      miro_user_id = '3074457359145178304' -- Seu Miro User ID
    WHERE id = v_user_id;

    RAISE NOTICE 'Usuário promovido a super admin: %', v_user_id;
  ELSE
    RAISE WARNING 'Usuário não encontrado em public.users. A trigger pode não ter executado.';
  END IF;
END $$;

-- 5. Verificar o resultado
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.is_super_admin,
  u.miro_user_id,
  a.encrypted_password IS NOT NULL as has_password
FROM public.users u
LEFT JOIN auth.users a ON a.id = u.id
WHERE u.email = 'wendleywilson@gmail.com';
