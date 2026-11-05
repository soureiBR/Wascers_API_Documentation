# Wascer Database API

API REST para ler e gravar no **Database** (store) do seu container sGTM da Wascer, sem depender de tags no GTM. É o mesmo banco que as tags Waster Store Writer/Read usam e que aparece na aba **Database** do container no painel.

Referência interativa: https://docs.wascer.com/

## 1. Como começar

1. **Crie a chave.** No painel da Wascer: **Configurações → Chaves de API → Criar Chave de API**, marque o escopo `database:access` e crie. Copie a **API Key** (começa com `pk_`); o API Secret não é usado nesta API.
   - A chave vale para todos os containers da sua conta e começa a funcionar em até ~2 minutos.
   - A IP Whitelist da chave não se aplica a esta API.
   - Revogar a chave no painel corta o acesso em até ~2 minutos.
2. **Pegue o domínio do container**: o mesmo do seu GTM server-side (`<identificador>.soureicdn.com` ou o domínio próprio, na aba **Domínios** do container).
3. **Teste:** `curl -s "https://<domínio>/wascer-api/<API_KEY>/v1/store/collections"` deve listar as suas collections. Se vier `403`, confira a chave e o escopo; `503`, espere os 2 minutos da ativação.

Para testar pelo navegador, abra https://docs.wascer.com/, preencha domínio e API Key no topo e use **Try it out**.

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
| POST | `/collections/{c}/documents` | Cria: `{ "document_key": "...", "data": {...}, "ttl": 0 }` (409 se a chave existir) |
| GET | `/collections/{c}/documents/{key}` | Lê um documento |
| PUT | `/collections/{c}/documents/{key}` | Cria ou substitui: `{ "data": {...} }` |
| PATCH | `/collections/{c}/documents/{key}` | Mescla campos no primeiro nível: `{ "data": {...} }` |
| DELETE | `/collections/{c}/documents/{key}` | Remove (204) |

Listagens devolvem `{ documents, next_cursor, order, limit }`. Para a próxima página, repita a chamada com `cursor=<next_cursor>` até `next_cursor` ser `null`.

## 5. Encontrar documentos (ex.: compras com gclid)

Ainda não há busca por campo na API. Para filtrar, liste do mais recente para o mais antigo e filtre do seu lado:

```
GET /collections/{c}/documents?order=DESC&limit=500
GET /collections/{c}/documents?order=DESC&limit=500&cursor=<next_cursor>
```

- Repita com o `next_cursor` até ele vir `null`, ou até passar da data que você precisa (`created_at` em ordem decrescente).
- Se você controla a gravação, salve já pensando na consulta: uma collection por tipo (ex.: `purchases`) e a `document_key` igual ao ID que você vai procurar (ex.: número do pedido), para ler direto com `GET /collections/purchases/documents/{pedido}`.

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

curl -s "$BASE/collections/purchases/documents?order=DESC&limit=500"

curl -s -X PUT "$BASE/collections/purchases/documents/ORDER-123" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"gclid":"Cj0KCQ...","value":199.9}}'
```

## 8. Instruções para agentes de IA

- Comece por `GET /collections` e por uma listagem com `limit=5` para entender o formato de `data` antes de filtrar.
- Para encontrar registros, liste com `order=DESC&limit=500`, filtre localmente e siga `next_cursor` até `null` ou até passar da data desejada; não conclua que não há resultados enquanto houver `next_cursor`.
- Não escreva nem apague (POST/PUT/PATCH/DELETE) sem pedido explícito do usuário.
- Não repita a API key em respostas, logs ou arquivos; prefira a variável `WASCER_API_KEY`.
