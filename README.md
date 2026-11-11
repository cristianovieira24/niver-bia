# Niver da Bê

Convite de aniversário com envelope animado, confirmação em grupos e painel privado de convidados.

## Site e painel

- Convite: https://niver-bia.vercel.app/
- Administração: https://niver-bia.vercel.app/admin
- Evento: 19/12/2026 às 14h, horário de São Paulo.

O painel permite buscar pessoas, consultar totais, editar nomes e acompanhantes, cancelar/restaurar um grupo e exportar todos os registros como CSV (com status). Cancelar não apaga o histórico. A edição usa versão para evitar que duas sessões sobrescrevam a mesma alteração.

## Configuração na Vercel

Projeto `niver-bia`, equipe `polaris-03b1`, produção na branch `main`.

Configure em **Production**, como segredos:

- `DATABASE_URL`: conexão Postgres do Neon. Instale/conecte o banco por **Storage → Create Database → Neon**, aproveitando a integração já instalada na conta. Não use um banco com dados de outro projeto.
- `ADMIN_PASSWORD_HASH`: `salt:hash`, com hash scrypt de 64 bytes em hexadecimal.
- `ADMIN_SESSION_SECRET`: chave aleatória de ao menos 32 bytes.

Nunca coloque essas variáveis em `NEXT_PUBLIC_*` ou no GitHub. Depois de configurar o banco, faça um novo deployment para aplicar as variáveis.

O banco cria suas tabelas de maneira idempotente na primeira operação. Registros legados da tabela `attendance` são importados por grupo e preservados. A gravação atual usa um único INSERT com todos os nomes, sem confirmações parciais. O identificador evita duplicar o mesmo envio; confirmações feitas em envios diferentes continuam sendo grupos diferentes.

A senha compartilhada abre uma sessão de 12 horas em cookie HttpOnly/Secure/SameSite Strict. Login tem limite de dez tentativas por IP a cada 15 minutos, compartilhado no banco. Todas as leituras de convidados e exportações exigem sessão; alterações exigem sessão e origem do próprio site. Trocar `ADMIN_SESSION_SECRET` invalida sessões existentes.

## Desenvolvimento

Node 22.13+ e pnpm. `pnpm install --no-frozen-lockfile`, `pnpm dev`, `pnpm build`.

Testes de validação e exportação: `node --experimental-strip-types --test tests/*.test.mjs`.

Para validar produção, confirme um grupo identificado como teste, confira os nomes e totais no painel, edite, cancele e restaure. Confira também que `/api/admin/guests` e a exportação respondem 401 sem sessão. Cancele o grupo de teste ao terminar.
