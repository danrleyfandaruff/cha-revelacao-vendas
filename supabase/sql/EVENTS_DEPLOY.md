# Novos tipos de evento e historico

Esta alteracao permite uma lista atual por conta e mantem eventos encerrados no
historico. Cada nova lista precisa de sua propria ativacao de R$19,90 por 60 dias.
Os eventos existentes mantem IDs, links, reservas, pagamentos e datas de validade.
Os tipos antigos continuam sendo inferidos pelos nomes quando event_type e nulo.

## Ordem de publicacao

1. Faca um backup e confira no projeto de homologacao as policies e funcoes atuais
   de events, event_items, event_reservations e event_confirmations. O repositorio
   nao contem o schema original completo de producao.
2. Execute `20260919_event_types_and_history.sql` no SQL Editor do Supabase.
   O script e transacional e pode ser reaplicado. Ele nao estende prazos existentes.
   Nao execute depois o script antigo `event_expiration_60_days.sql`: ele recria a
   ativacao por usuario e redefine prazos, sendo incompativel com o historico.
3. Publique `stripe-webhook` no projeto existente. Mantenha a verificacao de
   assinatura Stripe e a configuracao atual de secrets. A nova versao aceita
   referencias antigas de usuario e referencias `event_<uuid>` por evento.
   Se aceitar pagamentos assincronos, inclua tambem
   `checkout.session.async_payment_succeeded` nos eventos enviados pelo Stripe.
4. Publique o frontend em seguida e solicite atualizacao das abas antigas.
   Clientes antigos usam upsert por user_id, que deixa de ser uma chave unica
   global. Por isso, coordene a migracao e o deploy em uma janela curta.
5. Confira um evento ativo existente, um expirado, a criacao de outro evento,
   o historico, uma reserva e um pagamento em modo de teste no ambiente de
   homologacao. Confirme que as policies existentes permitem ao dono consultar
   seus eventos arquivados e os respectivos itens e respostas.

## Consultas de conferencia (somente leitura)

Se uma tentativa anterior falhou com `42P13: cannot change return type of existing
function`, execute novamente o arquivo completo atualizado. A migracao agora
remove e recria `activate_event(uuid)` dentro da mesma transacao e reaplica suas
permissoes. Nao execute o `DROP FUNCTION` isoladamente nem adicione `CASCADE`.
Essa correcao nao remove eventos, usuarios ou reservas.

```sql
select id, user_id, slug, paid, expires_at, archived_at, event_type
from public.events order by created_at desc;

select user_id, count(*)
from public.events where archived_at is null
group by user_id having count(*) > 1;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('events', 'event_items', 'event_reservations', 'event_confirmations');
```

## Validacao local

`npm run test:events` executa a migracao em PostgreSQL embutido (PGlite), com
fixtures que representam a estrutura antiga e policies de propriedade. Verifica
preservacao de dados, permissao de arquivamento, bloqueio de reservas vencidas,
prazo de 60 dias, repeticao de webhook e isolamento entre pagamentos de eventos.
Nao conecta ao banco de producao nem substitui a conferencia das policies reais.

`npm run build` valida TypeScript e os templates Angular.

O frontend nao ativa eventos por parametro de URL. Apenas o webhook, com a
service role, executa as funcoes de ativacao. Eventos pagos nunca tem seu prazo
reiniciado por uma entrega repetida do Stripe.
