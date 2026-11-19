# Lojas Wascer

Lojas virtuais e sites de captação de leads hospedados na Cloudflare e administrados em **https://admin.wascer.com/&lt;loja&gt;**. Este guia é para quem configura uma loja e para agentes de IA que fazem essa configuração a pedido do dono.

## Como a plataforma é organizada

- **Admin único**: `admin.wascer.com` administra todas as lojas. Cada loja fica em `admin.wascer.com/<slug>` (por exemplo `admin.wascer.com/sualoja`).
- **Módulos padrão**: toda loja tem os mesmos módulos básicos: pedidos, produtos, clientes, conteúdo, descontos, domínios, configurações e temas.
- **Apps**: o que não é padrão vira um app, instalado por loja em **Adicionar apps**. Exemplos: rastreamento (app Wascer), Google Ads, Meta Ads, Migração VTEX e gateways de pagamento. Um app só aparece no menu da loja que o instalou.
- **Temas**: o código da plataforma é um só. O tema de cada loja fica num repositório próprio no GitHub e é publicado a cada push. Sem tema publicado, a loja usa o layout padrão.
- **Acesso**: entrada com e-mail e senha, verificação em duas etapas obrigatória e papéis por loja (dono, admin, equipe). Toda alteração fica no registro de atividades da loja.

### Tipo de loja

| Tipo | Para quê | Menu |
|---|---|---|
| `ecommerce` | Loja virtual com carrinho e checkout | Pedidos, Produtos, Clientes, Descontos, Loja virtual, Apps |
| `lead` | Site de captação de leads | Leads: funis em quadro, lista, ficha, tarefas, relatórios e cadastros. O valor de um lead marcado como convertido conta como faturamento |

O dono ou um administrador escolhe o tipo em `admin.wascer.com/`, no cartão **Tipo de cada loja**.

## App Wascer: rastreamento

O app Wascer liga o rastreamento completo da loja. Ele monta o dataLayer de e-commerce no padrão do GA4 em todas as páginas e envia os eventos por um destes caminhos, à escolha da loja:

- o servidor de rastreamento da Wascer (sGTM);
- o Cloudflare Zaraz.

### Instalar

1. No admin da loja, abra **Adicionar apps › Wascer › Instalar app**.
2. Em **Por onde os dados saem**, escolha uma opção:
   - **Servidor de rastreamento Wascer (sGTM)**;
   - **Cloudflare Zaraz**;
   - **Nenhum**, que só monta o dataLayer.
3. Deixe ligado **Montar o dataLayer de e-commerce do GA4** e clique em **Salvar**.

A loja aplica a mudança em até 30 segundos, sem publicar tema.

### Opção 1: servidor de rastreamento Wascer (sGTM)

O Google Tag Manager passa a carregar pelo domínio do seu container server-side da Wascer. Os eventos chegam como primeira parte e seguem para GA4, Google Ads, Meta (Conversions API), TikTok e as outras tags do container.

| Campo | O que preencher |
|---|---|
| ID do contêiner web | `GTM-XXXXXXX` do contêiner **web** |
| Endereço do servidor | Domínio customizado do container na Wascer, por exemplo `https://dados.sualoja.com.br`. Se ficar vazio, o GTM carrega direto do Google |
| Caminho do carregador | `/gtm.js` por padrão. Mude só se o container usa um carregador personalizado |

A loja coloca dois trechos na página:

- o carregador do GTM, vindo do seu servidor, no `<head>`;
- o `<noscript>` no início do `<body>`.

No GTM web, use gatilhos de **Evento personalizado** com os nomes da tabela de eventos abaixo, e a variável de camada de dados `ecommerce`.

### Opção 2: Cloudflare Zaraz

1. Na Cloudflare, abra a zona do domínio da loja (com o proxy ligado) e vá em **Zaraz › Tools configuration**.
2. Adicione as ferramentas que quiser: GA4, Google Ads, Meta Pixel ou Conversions API e outras.
3. Em **Zaraz › Settings**, ligue **E-commerce tracking**.
4. No app Wascer, escolha **Cloudflare Zaraz** e salve.

Os eventos de e-commerce vão por `zaraz.ecommerce()`, com os nomes do Zaraz:

- Product List Viewed, Product Clicked, Product Viewed;
- Product Added, Product Removed, Cart Viewed;
- Checkout Started, Shipping Info Entered, Payment Info Entered;
- Order Completed, Products Searched.

Login, cadastro e newsletter vão por `zaraz.track()`.

### Eventos do dataLayer

O formato segue a documentação de e-commerce do GA4:

- Antes de cada evento com `ecommerce`, a loja envia `{ ecommerce: null }` para limpar o objeto anterior.
- Os valores são números em reais, e a moeda é `BRL`.
- O `item_id` é a referência (SKU) do produto, a mesma usada nos catálogos do Google e da Meta. Por isso o remarketing dinâmico casa os eventos com os produtos.

| Evento | Quando dispara |
|---|---|
| `view_item_list` | Categoria, busca, home ou vitrine de relacionados, em lotes de até 50 itens |
| `select_item` | Clique num produto da lista |
| `view_item` | Página de produto |
| `add_to_cart` | Produto adicionado ou quantidade aumentada |
| `remove_from_cart` | Produto retirado ou quantidade diminuída |
| `view_cart` | Página do carrinho |
| `begin_checkout` | Entrada no checkout |
| `add_shipping_info` | Escolha do frete (`shipping_tier`) |
| `add_payment_info` | Escolha do pagamento (`payment_type`) |
| `purchase` | Página do pedido, uma vez por pedido |
| `search` | Página de busca (`search_term`) |
| `login` / `sign_up` | Entrada na conta ou cadastro (`method`) |
| `generate_lead` | Inscrição na newsletter |

```json
{
  "event": "add_to_cart",
  "ecommerce": {
    "currency": "BRL",
    "value": 379.8,
    "items": [
      { "item_id": "B0441711-048", "item_name": "Bota Infantil Preto/Cinza", "item_variant": "27", "price": 189.9, "quantity": 2 }
    ]
  }
}
```

O `purchase` é montado no servidor a partir do pedido. Ele leva `transaction_id`, `value`, `shipping`, `tax`, `coupon` e `discount`. Com a opção **Mandar os dados do comprador na compra** ligada, também leva `user_data` para as conversões otimizadas: Enhanced Conversions no Google e Advanced Matching na Meta.

```json
{
  "event": "purchase",
  "ecommerce": {
    "transaction_id": "10482", "value": 409.7, "currency": "BRL", "shipping": 29.9, "tax": 0,
    "coupon": "BEMVINDO", "discount": 10, "shipping_tier": "sedex",
    "items": [ { "item_id": "B0441711-048", "item_name": "Bota Infantil Preto/Cinza", "price": 189.9, "quantity": 2, "index": 0 } ]
  },
  "user_data": {
    "email": "cliente@exemplo.com",
    "phone_number": "+5511999999999",
    "address": { "first_name": "Maria", "last_name": "Silva", "city": "São Paulo", "region": "SP", "postal_code": "01310100", "country": "BR" }
  }
}
```

### Eventos do tema

Um tema próprio pode fazer duas coisas:

- **Entrar nas listas:** marque os cartões de produto com `data-wascer-item="REFERÊNCIA"` e `data-preco="189.90"`.
- **Enviar eventos extras:** use o mesmo formato, como no exemplo abaixo.

```js
wascerEvento('view_promotion', { promotion_id: 'black-friday', promotion_name: 'Black Friday', items: [] });
```

> Se o rastreamento sai pelo app Wascer (sGTM ou Zaraz), deixe vazios os campos de pixel dos apps Google Ads e Meta Ads e configure as tags no container ou no Zaraz. Assim nada é contado em dobro.

## Catálogos: apps Google Ads e Meta Ads

A loja publica o catálogo em feeds, e o app cadastra esses feeds na sua conta pela API. Depois, o Google e a Meta buscam o catálogo sozinhos todo dia, sem planilha e sem plugin.

### Os feeds da loja

- **Índice:** `https://sualoja.com.br/feeds/produtos.json` lista as páginas.
- **Páginas:** `https://sualoja.com.br/feeds/catalogo-1.xml`, `catalogo-2.xml` e assim por diante. Cada página tem até 500 itens e usa RSS 2.0 com o namespace `g:`, aceito pelo Google e pela Meta.

Cada variação ativa vira um item:

- `g:id` é o SKU, e `item_group_id` agrupa as variações do mesmo produto;
- título, descrição em texto puro, link, foto principal e até 6 fotos extras;
- `price`, `sale_price` e disponibilidade pelo estoque;
- marca, tipo de produto, tamanho e peso;
- `gtin` quando o código de barras é válido; sem ele, vai `mpn` com `identifier_exists = no`.

### Google Ads (Merchant Center)

1. No Google Cloud, ative a **Merchant API**, crie uma conta de serviço e baixe a chave em JSON.
2. No Merchant Center, em **Configurações › Pessoas e acesso**, adicione o e-mail da conta de serviço como Administrador.
3. No admin da loja, instale o app **Google Ads**:
   1. Informe o ID do Merchant Center.
   2. Cole o JSON e clique em **Gravar credencial**.
   3. Clique em **Testar** e depois em **Sincronizar catálogo**.
4. Vincule o Merchant Center ao Google Ads para usar o catálogo em Shopping, Performance Max e anúncios dinâmicos.

A sincronização faz o seguinte:

- Cria uma fonte de dados por página, chamada **Wascer · catálogo N**, com idioma `pt`, rótulo `BR` e busca diária de madrugada no horário de Brasília.
- Pede a primeira busca na hora.
- Rodar de novo é seguro: corrige as fontes que já existem, cria as que faltam e desliga as páginas que sumiram.

### Meta Ads (Facebook e Instagram)

1. Crie o catálogo no Gerenciador de Comércio, se ainda não existir.
2. No Gerenciador de Negócios, em **Usuários do sistema**, crie um usuário do sistema com perfil de administrador.
3. Dê a esse usuário controle total do catálogo.
4. Gere um token com `catalog_management` e validade "Nunca".
5. No admin da loja, instale o app **Meta Ads**:
   1. Informe o ID do catálogo.
   2. Cole o token e clique em **Gravar credencial**.
   3. Clique em **Testar** e depois em **Sincronizar catálogo**.

A sincronização cria um feed programado por página, chamado **Wascer · catálogo N**, com atualização diária. Para anúncios dinâmicos (Advantage+ catálogo), conecte o pixel ao catálogo em **Fontes de eventos**.

### Segurança

- A chave JSON e o token ficam cifrados e não aparecem de novo depois de gravados. A tela mostra só o final.
- Só o dono ou um admin grava credenciais e sincroniza.
- Os produtos não passam pela plataforma: o Google e a Meta leem os feeds direto da loja.

## App WhatsApp

O app conecta o número da loja de um destes dois jeitos:

- **API oficial:** WhatsApp Cloud API da Meta.
- **API não oficial:** um servidor no padrão Evolution API.

Ele envia mensagens, recebe as respostas por webhook e guarda o histórico por número.

| Modo | Configuração | Credenciais (cifradas) |
|---|---|---|
| `oficial` | `phone_number_id`, `waba_id` | `token`: token permanente de usuário do sistema, com `whatsapp_business_messaging` e `whatsapp_business_management`. `app_secret`: assina o webhook |
| `nao_oficial` | `url` (https, domínio público), `instancia` | `apikey` |

Proteções:

- **Sem repetição:** a mesma mensagem não vai para o mesmo número duas vezes em 24 h. A API responde `409`.
- **Limite por minuto:** 20 envios por padrão, configurável até 80. Acima disso, a API responde `429`.
- **Registro:** todo envio guarda quem mandou.
- **Webhook oficial:** só é aceito com a assinatura `X-Hub-Signature-256`.
- **Webhook não oficial:** só é aceito com o token da loja no endereço.
- **Grupos e status:** ficam fora do histórico.

Na API oficial, mensagem livre só é aceita até 24 h depois da última mensagem do cliente. Fora dessa janela, use um modelo aprovado.

## App E-mail

O app dispara campanhas pelo **Cloudflare Email Service**, na conta Cloudflare da própria loja.

Pré-requisitos na Cloudflare:

- o domínio cadastrado em **Email Sending**: a Cloudflare cria SPF, DKIM e DMARC sozinha;
- um token de API com **Email Sending: Edit**;
- o plano Workers Paid, para enviar a qualquer destinatário.

Como funcionam os envios:

- **Lotes:** a tela manda 25 endereços por chamada.
- **Sem repetição:** cada endereço recebe a campanha uma vez só.
- **Descadastro:** quem se descadastrou fica de fora. Todo e-mail leva o link "Não quero mais receber" e o cabeçalho `List-Unsubscribe` com one-click.
- **Destinatários:** na loja e-commerce, o público padrão são os clientes que aceitam e-mail de marketing. Na loja lead, use uma lista colada.
- **Paradas:** se a Cloudflare limitar o envio ou recusar o token, o lote para. Rodar de novo continua de onde parou.

## API do admin

O admin é uma aplicação que conversa com a própria API. Tudo o que a tela faz passa por estas rotas, em `https://admin.wascer.com`. Hoje o acesso exige a sessão do admin: login com verificação em duas etapas, mais o cabeçalho `Origin` do próprio admin. O acesso por chave de API para agentes e integrações é o próximo passo.

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/p/eu` | Usuário da sessão |
| GET | `/api/p/lojas` | Lojas em que o usuário tem acesso |
| GET | `/api/p/lojas/{loja}` | Dados da loja, inclusive `tipo` |
| PUT | `/api/p/lojas/{loja}/tipo` | Muda o tipo: `{"tipo":"ecommerce"}` ou `{"tipo":"lead"}` (dono ou admin) |
| GET | `/api/p/lojas/{loja}/apps` | Apps disponíveis e instalados |
| POST / DELETE | `/api/p/lojas/{loja}/apps/{app}` | Instala ou remove um app |
| GET | `/api/p/lojas/{loja}/apps/{app}/segredos` | Credenciais gravadas: só nome, final e data |
| PUT / DELETE | `/api/p/lojas/{loja}/apps/{app}/segredos/{nome}` | Grava ou apaga uma credencial: `{"valor":"…"}` |
| GET | `/api/p/lojas/{loja}/auditoria` | Registro de atividades |
| GET | `/api/catalogos/{loja}/{google-ads\|meta-ads}` | Estado do catálogo: conta, feeds da loja, última sincronização |
| PUT | `/api/catalogos/{loja}/{app}/config` | `{"merchant_id":"123"}` ou `{"catalog_id":"456"}` |
| POST | `/api/catalogos/{loja}/{app}/testar` | Testa a credencial na conta |
| POST | `/api/catalogos/{loja}/{app}/sincronizar` | Cria ou atualiza os feeds na conta |
| GET | `/api/whatsapp/{loja}` | Estado do app WhatsApp: config, credenciais gravadas, endereço do webhook, contadores |
| PUT | `/api/whatsapp/{loja}/config` | `{"modo":"oficial"}` ou `"nao_oficial"`, mais `phone_number_id`, `waba_id`, `url`, `instancia`, `limite_minuto` |
| POST | `/api/whatsapp/{loja}/testar` | Confere a credencial e o número ou a instância |
| GET | `/api/whatsapp/{loja}/modelos` | Modelos aprovados (só oficial) |
| POST | `/api/whatsapp/{loja}/enviar` | `{"numero":"11999990000","texto":"…"}` ou `{"numero":"…","modelo":"nome","idioma":"pt_BR","variaveis":["…"]}` |
| GET | `/api/whatsapp/{loja}/conversas` | Últimas conversas |
| GET | `/api/whatsapp/{loja}/mensagens?numero=` | Histórico de um número |
| GET | `/api/email/{loja}` | Estado do app E-mail e números dos últimos 30 dias |
| PUT | `/api/email/{loja}/config` | `account_id`, `remetente`, `nome_remetente`, `responder_para` |
| POST | `/api/email/{loja}/testar` | Manda um e-mail de teste para quem está logado |
| GET / POST | `/api/email/{loja}/campanhas` | Lista ou cria uma campanha: `{"assunto":"…","html":"…"}` |
| POST | `/api/email/{loja}/campanhas/{id}/teste` | Manda a campanha só para quem está logado |
| POST | `/api/email/{loja}/campanhas/{id}/enviar` | `{"para":["a@x.com", …]}`, até 25 por chamada |
| ANY | `/api/l/{loja}/{rota}` | Repassa para a API administrativa da loja (pedidos, produtos, clientes, conteúdo, descontos, domínios, configurações, leads) |

Credenciais `{nome}` por app:

- `google-ads`: `conta_servico`, que é o JSON da conta de serviço.
- `meta-ads`: `token`, que é o token do usuário do sistema.
- `whatsapp`: `token` e `app_secret` na API oficial; `apikey` na não oficial.
- `email-cloudflare`: `api_token`.

Erros voltam como `{"erro":"mensagem"}`:

| Status | Quando |
|---|---|
| 401 | Sessão expirada |
| 403 | Sem acesso à loja ou ao papel |
| 404 | Rota ou app não instalado |
| 422 | Dado inválido ou recusado pelo Google ou pela Meta |
| 428 | Verificação em duas etapas ainda não ativada |

## Instruções para agentes de IA

Ao configurar uma loja a pedido do dono:

1. **Descubra o tipo** com `GET /api/p/lojas/{loja}`. Em loja `lead`, não ofereça pedidos, produtos nem catálogos: o foco é formulário, funil e conversão.
2. **Use o módulo padrão primeiro.** O que não for padrão, instale como app. Nunca simule uma função de app no tema.
3. **Rastreamento:**
   - Em e-commerce, recomende o app Wascer com sGTM quando a loja tem container na Wascer, ou o Zaraz quando não tem.
   - Deixe o dataLayer ligado.
   - Não ligue o pixel dos apps de anúncio se as tags já estão no container.
4. **Catálogos:**
   - Confira se `/feeds/produtos.json` responde e tem itens antes de sincronizar.
   - Depois de sincronizar, consulte o estado para confirmar os feeds criados.
5. **Credenciais:**
   - Só o dono cola chaves e tokens.
   - Nunca repita valores de credenciais em mensagens, URLs ou logs.
   - Para conferir se uma credencial foi gravada, use o campo `final`.
6. **Antes de qualquer ação que muda a conta do Google ou da Meta,** como sincronizar ou apagar feeds, diga ao dono o que vai mudar.
7. **WhatsApp e e-mail falam com clientes reais.**
   - Confirme com o dono o texto exato e quem recebe antes de enviar ou disparar.
   - Teste primeiro: `campanhas/{id}/teste` no e-mail, um número do próprio dono no WhatsApp.
   - Nunca reenvie quando der erro ou `409`.
