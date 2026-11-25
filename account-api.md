# Wascer Account API: chaves de API

Opere a sua conta Wascer por código, sem o painel: containers, flags, domínios, cache, logs e o banco do container. Este guia mostra como criar uma chave, autenticar, operar clientes da carteira (para agências) e validar a assinatura da resposta.

Rotas e formatos: o `openapi.json` da API, servido pela própria API. Esta página é o guia.

## 1. Como começar

1. **Crie a chave.** No painel da Wascer: **Configurações → API** (para agência: **Agência → Configurações → API**). Dê um nome, escolha as permissões e, se quiser, uma data de expiração.
2. **Copie a chave na hora.** Ela aparece inteira **uma vez só**. Depois o painel mostra apenas a máscara (`wc_us_••••a1b2`). Se perder, revogue e crie outra.
3. **Teste:**

```bash
curl -s https://waster.sourei.com.br/list \
  -H "Authorization: Bearer $WASCER_API_KEY" \
  -H "x-request-id: $(uuidgen)"
```

A resposta é `200` com a lista dos seus containers e traz o header `X-Wascer-Signature`.

## 2. URL base e autenticação

```
https://waster.sourei.com.br
```

Toda requisição leva a chave num header só:

```
Authorization: Bearer wc_us_<43 caracteres>
```

- A chave é segredo. Nunca a coloque em código de front-end, em URL ou em log.
- Mande sempre um `x-request-id` (um UUID por requisição). Ele entra na assinatura da resposta e ajuda o suporte a achar a sua chamada.

## 3. Tipos de chave

| Prefixo | Dono | O que alcança |
|---|---|---|
| `wc_us_` | Cliente | Só a própria conta |
| `wc_ag_` | Agência | As rotas da agência (`/partners/me/...`) e, com o header `x-workspace`, os clientes da carteira |

A chave de agência pertence à agência, não a quem a criou. Só owner e admin da agência podem criar ou revogar.

## 4. Permissões

Cada chave tem uma ou mais permissões. A permissão exigida sai do método HTTP:

| Permissão | Métodos | Exemplo |
|---|---|---|
| `read` (Leitura) | `GET` | Listar containers, ler logs |
| `update` (Edição) | `PUT`, `PATCH` | Ligar ou desligar uma flag |
| `write` (Escrita) | `POST`, `DELETE` | Criar ou apagar container, ativar o banco |

Uma chamada sem a permissão necessária recebe `403` com `"code": "insufficient_scope"`.

## 5. Agência: operar um cliente da carteira

Com uma chave `wc_ag_`, mande o header `x-workspace` com o **workspace dono** do cliente:

```bash
curl -s https://waster.sourei.com.br/list \
  -H "Authorization: Bearer $WASCER_AGENCY_KEY" \
  -H "x-workspace: <uuid do workspace do cliente>" \
  -H "x-request-id: $(uuidgen)"
```

Regras:

- O valor é o workspace **dono** da conta do cliente. Um workspace em que o cliente só aparece como convidado é recusado (`403`).
- O cliente precisa estar na carteira da agência, e a agência precisa estar ativa. Se não estiver: `403`.
- Rota de cliente sem `x-workspace` com chave de agência: `400`.
- `x-workspace` em rota da agência (`/partners/me/...`): `400`.
- `x-workspace` com chave de cliente (`wc_us_`): `400`. O header é recusado, nunca ignorado.
- `x-workspace` que não é um UUID: `400`.

## 6. O que a chave não faz

Estas rotas recusam qualquer chave (`403`), mesmo com todas as permissões:

- Cobrança e planos: faturas, formas de pagamento, carteira, troca de plano (`PATCH /containers/{id}/tier`).
- Gestão das próprias chaves (`/api-keys`, `/partners/me/api-keys`). Criar e revogar chaves só pelo painel.
- Qualquer rota que não esteja marcada como aceita por chave no `openapi.json` (extensão `x-wascer-api-key`).

## 7. Rotas que aceitam chave

| Área | Rotas |
|---|---|
| Containers | `GET /list`, `GET /info`, `POST /createContainer`, `PUT /containers/{id}`, `DELETE /delete/{id}`, `POST /containers/{id}/update-gtm` |
| Flags | `PATCH /containers/{id}/request-delay`, `user-id`, `geo-headers`, `device-headers`, `click-id-restorer` |
| Domínios | `GET`/`POST /containers/{id}/custom-domains`, `GET /custom-domains/{id}/status`, `DELETE /custom-domains/{id}` |
| Sidecar e loader | `/containers/{id}/sidecar-proxy/*`, `/containers/{id}/custom-loader` |
| Cache do GTM | `POST /gtm-cache/{id}/enable`, `disable`, `purge` |
| Logs | `/containers/{id}/tracking-logs` (config, tipos de evento, lista, detalhe, relacionados) |
| Banco do container | `POST /containers/{id}/database/enable` e `/partners/database/*` (activate, deactivate, debug-header, data) |
| Agência | `/partners/me`: perfil, membros, convites, carteira, contas, onboarding |

Em `GET /partners/database/data`, mande o `containerId` na query string.

Container de outra conta responde `404`, mesmo que exista.

Algumas flags dependem do plano do container. `request-delay`, por exemplo, só existe nos planos Business e Enterprise; fora deles a resposta é `403`, com chave ou pelo painel.

## 8. Erros

| Status | Quando |
|---|---|
| `400` | `x-workspace` ausente, sobrando ou malformado; parâmetro obrigatório faltando |
| `401` | Chave inexistente, com formato inválido, revogada ou expirada |
| `403` | Sem a permissão (`insufficient_scope`), rota bloqueada para chave, cliente fora da carteira |
| `404` | Recurso não existe ou não é da conta |
| `429` | Limite de requisições estourado (`"code": "rate_limited"`) |

Erros de autenticação (`401`) não trazem assinatura.

## 9. Limite de requisições

Cada chave pode fazer **120 requisições por minuto**. Toda resposta traz:

- `X-RateLimit-Limit`: o limite.
- `X-RateLimit-Remaining`: quantas restam na janela.
- `X-RateLimit-Reset`: quando a janela reinicia (segundos desde 1970, UTC).

Passou do limite: `429` com `Retry-After` (segundos). Espere esse tempo antes de tentar de novo.

## 10. Revogação e expiração

- Revogar no painel corta a chave na hora: a próxima chamada já recebe `401`.
- Uma chave com data de expiração para de funcionar depois dela (`401`).
- O painel mostra o "último uso" de cada chave.

## 11. Validar a assinatura da resposta

Toda resposta autenticada por chave traz:

```
X-Wascer-Signature: t=<timestamp>,v1=<hex>
```

Com ela você confirma que a resposta veio da Wascer e não foi alterada. O segredo é derivado da sua própria chave; nada é trocado além dela.

1. `segredo` = HKDF-SHA256(chave, salt vazio, info `wc-response-v1`, 32 bytes)
2. `mensagem` = `<t>.<x-request-id>.<status>.` + corpo da resposta (bytes exatos, sem reformatar o JSON)
3. Compare `v1` com HMAC-SHA256(`segredo`, `mensagem`) em hex, usando comparação de tempo constante.

**Node.js**

```js
const crypto = require('crypto');

function verify(key, requestId, status, rawBody, header) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const secret = Buffer.from(crypto.hkdfSync('sha256', key, Buffer.alloc(0), 'wc-response-v1', 32));
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${requestId}.${status}.`)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

**Python**

```python
import hmac, hashlib
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def verify(key: str, request_id: str, status: int, raw_body: bytes, header: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    secret = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
                  info=b"wc-response-v1").derive(key.encode())
    msg = f"{parts['t']}.{request_id}.{status}.".encode() + raw_body
    expected = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])
```

`t` é o horário da resposta em segundos desde 1970. Rejeite também respostas com `t` muito antigo (por exemplo, mais de 5 minutos), para evitar repetição.

## 12. Chaves antigas (`pk_` / `sk_`)

O par `x-api-key` + `x-api-secret` não autentica mais as rotas de container. Crie uma chave nova (`wc_us_` ou `wc_ag_`) no painel e troque o header para `Authorization: Bearer`.

A Database API do container (`/wascer-api/<pk_>/...`, no [guia da Database API](guia.html)) continua usando a chave `pk_`.
