# Niver da Bê

Convite interativo de aniversário com envelope animado, dois cartões sobrepostos e confirmação de presença com acompanhantes.

## Desenvolvimento

Requer Node.js 22.13 ou superior e pnpm.

```sh
pnpm install
pnpm dev
```

## Publicação

O projeto usa React, Vinext e Cloudflare Workers. A confirmação de presença depende de um banco Cloudflare D1 com a ligação `DB`, usando a migração em `drizzle/`. Credenciais e dados dos convidados não estão neste repositório.

Site: https://niver-da-be.creastezgin123.chatgpt.site
