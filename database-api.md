# Wascer Database API

API REST para ler e gravar no **Database** (store) do seu container sGTM da Wascer, sem depender de tags no GTM. É o mesmo banco que as tags Waster Store Writer/Read usam e que aparece na aba **Database** do container no painel.

Referência interativa: https://docs.wascer.com/

## 1. O que você precisa

1. **Uma API key** com o escopo `database:access`: painel → **Configurações** → **Chaves de API** → **Criar Chave de API** → marque `database:access`. Use a **API Key** (`pk_…`), não o API Secret.
   - A chave vale para todos os containers da sua conta e começa a funcionar em até ~2 minutos.
   - A IP Whitelist da chave não se aplica a esta API.
   - Para ver os mesmos dados no painel, ative a aba **Database** do container.
   - Revogar a chave no painel corta o acesso em até ~2 minutos.
2. **O host do container**: o mesmo domínio do seu GTM server-side (`<identificador>.soureicdn.com` ou o domínio próprio configurado no container).

## 2. URL base

```
https://<host-do-container>/wascer-api/<API_KEY>/v1/store
```

A chave vai no caminho da URL. Trate a URL inteira como segredo.

## 3. Modelo de dados

- **Collection**: agrupa documentos. Nome `^[a-zA-Z0-9_-]{1,64}$`.
- **Documento**: `{ document_key, collection, data, created_at, updated_at }`.
  - `document_key`: único na collection, até 2054 caracteres.
  - `data`: objeto JSON livre, até 500 KB.
- **Retenção**: documentos expiram 90 dias após a criação (ou antes, com `ttl` em segundos na criação). Atualizar não renova o prazo.
- Inteiros acima de 2^53 (ex.: IDs de pedido longos) são devolvidos como string.

## 4. Endpoints

| Método | Caminho (após a URL base) | O que faz |
|---|---|---|
| GET | `/collections` | Lista as collections → `{ collections: [...] }` |
| POST | `/collections` | Cria collection: `{ "name": "purchases" }` |
| GET | `/collections/{c}/documents?limit=50&order=DESC&cursor=…` | Lista por data de criação (até 500 por página) |
| POST | `/collections/{c}/documents/query` | **Busca por campo** (ver abaixo) |
| POST | `/collections/{c}/documents` | Cria: `{ "document_key": "...", "data": {...}, "ttl": 0 }` (409 se a chave existir) |
| GET | `/collections/{c}/documents/{key}` | Lê um documento |
| PUT | `/collections/{c}/documents/{key}` | Cria ou substitui: `{ "data": {...} }` |
| PATCH | `/collections/{c}/documents/{key}` | Mescla campos no primeiro nível: `{ "data": {...} }` |
| DELETE | `/collections/{c}/documents/{key}` | Remove (204) |

Listagens devolvem `{ documents, next_cursor, order, limit }`. Para a próxima página, repita a chamada com `cursor=<next_cursor>` até `next_cursor` ser `null`.

## 5. Busca por campo

`POST /collections/{c}/documents/query`

```json
{
  "filter": {
    "operator": "and",
    "conditions": [
      { "field": "event_name", "operator": "equal", "value": "purchase" },
      { "field": "gclid", "operator": "exists" }
    ]
  },
  "created_after": "2026-10-27T00:00:00Z",
  "limit": 100
}
```

- `field`: caminho dentro de `data`, com ponto para campos aninhados (`user_data.email`).
- `operator` da condição: `equal`, `not-equal`, `exists`, `not-exists`, `contains`, `not-contains`, `gt`, `gte`, `lt`, `lte`. `exists`/`not-exists` não usam `value`; `contains` vale para texto e listas.
- `filter.operator`: `and` (padrão) ou `or`; até 10 condições. Sem `filter`, retorna todos os documentos da janela.
- `created_after` / `created_before`: janela por data de criação (ISO 8601). Use sempre que puder, deixa a busca muito mais rápida.
- `order`: `DESC` (padrão, mais recentes primeiro) ou `ASC`.
- `limit`: 1 a 500 (padrão 50).

Resposta: `{ documents, next_cursor, scanned, order, limit }`.

**Paginação da busca:** cada chamada lê no máximo 1000 documentos (`scanned`). Enquanto `next_cursor` não for `null`, há mais a percorrer, **mesmo se `documents` vier vazio**: chame de novo com o mesmo corpo e `"cursor": "<next_cursor>"`.

## 6. Erros

Corpo: `{ "code": "...", "message": "..." }`.

| HTTP | code | Causa comum |
|---|---|---|
| 400 | `WASCER_INVALID_REQUEST` | Corpo, filtro, cursor ou nome inválido |
| 403 | `WASCER_FORBIDDEN` | Chave errada, revogada ou sem `database:access` |
| 404 | `WASCER_NOT_FOUND` | Documento inexistente |
| 409 | `WASCER_CONFLICT` | `document_key` já existe (no POST de criação) |
| 413 | `WASCER_PAYLOAD_TOO_LARGE` | `data` acima de 500 KB |
| 503 | `WASCER_FEATURE_DISABLED` | API ainda não ativa no container (crie a chave e aguarde ~2 min) |

## 7. Exemplos

```bash
BASE="https://<host-do-container>/wascer-api/$WASCER_API_KEY/v1/store"

curl -s "$BASE/collections"

curl -s "$BASE/collections/purchases/documents?limit=10&order=DESC"

curl -s -X POST "$BASE/collections/purchases/documents/query" \
  -H 'Content-Type: application/json' \
  -d '{"filter":{"conditions":[{"field":"gclid","operator":"exists"}]},"created_after":"2026-10-27T00:00:00Z","limit":100}'

curl -s -X PUT "$BASE/collections/purchases/documents/ORDER-123" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"gclid":"Cj0KCQ...","value":199.9}}'
```

## 8. Instruções para agentes de IA

- Comece por `GET /collections` e por uma listagem com `limit=5` para entender o formato de `data` antes de filtrar.
- Para encontrar registros, use `POST .../documents/query` com `created_after` e siga `next_cursor` até `null`; não conclua que não há resultados enquanto houver `next_cursor`.
- Não escreva nem apague (POST/PUT/PATCH/DELETE) sem pedido explícito do usuário.
- Não repita a API key em respostas, logs ou arquivos; prefira a variável `WASCER_API_KEY`.
