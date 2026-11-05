# Wascer API

Documentação pública publicada em https://docs.wascer.com (GitHub Pages).

- `index.html`: Swagger UI. Aceita `#base_url=<host>&api_key=<pk_…>` para abrir já preenchido.
- `openapi.json`: especificação da Database API, exportada do `/swagger-json` do `soureiBR/proxy-loader-api`.
- `database-api.md` e `llms.txt`: guia em Markdown para humanos e agentes de IA; `guia.html` mostra o mesmo `.md` formatado. O gerador de prompt pra agente de IA fica na home (`agentes.html` só redireciona pra lá). `theme.js` controla o tema claro/escuro. Ao mudar `wascer.css` ou `theme.js`, troque o `?v=` nos HTMLs pra ninguém ficar com a cópia antiga.
- `wascer.css`: cores e fontes da marca, tiradas do `email-brand.ts` do wascer-mono.

Ao mudar rotas no `proxy-loader-api`, exporte de novo o `/swagger-json` e preserve `info.description` e `servers` deste arquivo.
