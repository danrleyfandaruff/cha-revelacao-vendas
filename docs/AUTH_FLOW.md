# Login e navegacao

A autenticacao e inicializada antes da primeira navegacao Angular. Isso permite
ao Supabase consumir os tokens do retorno do Google antes de a rota raiz
redirecionar para a landing. O retorno funciona em `/`, `/landing` e `/login`.

`AuthFlowService` concentra redirecionamento, destino apos login, recuperacao de
senha e logout. Landing e login nao registram mais listeners concorrentes.
As notificacoes do Supabase agendam a navegacao fora do callback de autenticacao,
dentro da zona Angular. As paginas publicas dos convidados continuam publicas
mesmo quando o organizador esta autenticado.

## Configuracao de publicacao

Mantenha o Site URL do Supabase apontando para o dominio oficial do site. Os
destinos usados pelo frontend sao `/login` (Google e confirmacao de e-mail) e
`/redefinir-senha` (recuperacao). Inclua as URLs completas desses destinos nas
URLs de redirecionamento permitidas do projeto, nos dominios realmente usados.
O fallback para a raiz tambem e tratado pelo aplicativo.

Esta refatoracao nao exige nova migracao SQL. As alteracoes anteriores de tipos
de evento/historico continuam exigindo a migracao documentada em
`supabase/sql/EVENTS_DEPLOY.md`.

## Verificacao

- `npm test`: todos os testes locais de autenticacao, banco e webhook.
- `npm run test:auth`: destinos internos, deteccao de callback e formato de telefone.
- `npm run test:events`: migracao PostgreSQL local, permissoes e webhook.
- `npm run test:e2e`: fluxos no navegador em desktop e viewport de celular.
- `npm run build`: compilacao de producao e templates Angular.

Os testes E2E usam Chrome instalado. Para usar Chromium do Playwright, execute
`npx playwright install chromium` e rode com `PLAYWRIGHT_CHANNEL=chromium`.
O servidor de desenvolvimento e iniciado automaticamente na porta 4205.

Os testes interceptam todas as chamadas externas. Nao fazem login no Google real,
nao enviam e-mails, nao cobram no Stripe e nao acessam o banco de producao. Eles
exercitam o SDK real do Supabase com respostas controladas, incluindo o retorno
OAuth que antes deixava o usuario parado na landing.

Cobertura: Google em diferentes URLs e conexao lenta, cancelamento, sessao
persistida, login por e-mail, cadastro com/sem confirmacao, retorno para pagina
protegida, logout, recuperacao de senha, captura/preservacao de telefone,
criacao de lista apos expiracao, historico, tipos de evento, convidados,
reservas, preview, pagamento confirmado pelo webhook e falhas de leitura.

A validacao final do provedor em producao deve ser feita apos publicar o
frontend, usando uma conta de teste e conferindo as URLs permitidas no Supabase.
