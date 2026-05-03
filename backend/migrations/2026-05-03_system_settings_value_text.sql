-- Hotfix: system_settings.value precisa aceitar texto/boolean além de números
-- (oferta pós-atendimento usa enabled=true/false e text livre).
-- Postgres faz cast implícito de numeric -> text, então é seguro.

ALTER TABLE system_settings
  ALTER COLUMN value TYPE text USING value::text;

-- Reseed das 3 chaves da oferta (que falharam no script anterior)
INSERT INTO system_settings (key, value)
VALUES ('post_call_offer_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('post_call_offer_price', '5')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('post_call_offer_text',
  'Por apenas R$ {{price}}, você pode receber indicação de banhos e orações. A atendente {{consultant}} pode preparar e enviar diretamente no seu e-mail.')
ON CONFLICT (key) DO NOTHING;
