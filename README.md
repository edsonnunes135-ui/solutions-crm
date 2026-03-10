# Solutions CRM — Monorepo (MVP funcional + base para escala)

Este repositório é um **starter** para o *Solutions* (CRM conversacional para WhatsApp + Instagram) com:
- **Web app** (Vite + React + TS + Tailwind) com UI pronta (Inbox, Funil, Contatos, Automações, BI, IA)
- **API server** (Node + Express + TS) com autenticação JWT, CRUD básico e endpoints de webhooks/canais
- **Banco** (PostgreSQL via Docker) + **Redis** (fila/eventos/automação via BullMQ)

> ⚠️ Integrações reais com WhatsApp/Instagram exigem configuração e permissões oficiais da Meta.
> Este starter já deixa **rotas, modelos e fluxos** prontos para você plugar tokens e regras.

---

## 1) Pré-requisitos
- Node 20+
- Docker + Docker Compose
- (Opcional) pnpm

---

## 2) Rodar o banco e redis
```bash
cd solutions-crm
docker compose up -d
```

---

## 3) Subir a API
```bash
cd apps/server
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

A API sobe em: `http://localhost:4000`

---

## 4) Subir o Web app
```bash
cd apps/web
npm install
npm run dev
```

O Web app sobe em: `http://localhost:5173`

---

## 5) Fluxo de produto (o que já está aqui)
- **Multi-tenant**: orgs, users, memberships
- **Inbox**: contacts, conversations, messages (stub)
- **Funil**: pipelines, stages, deals
- **Tarefas**: tasks
- **Automações**: automations + events (engine stub)
- **BI**: endpoints básicos para KPIs
- **IA**: endpoints stub (plugar OpenAI/LLM)

---

## 6) Próximos passos recomendados
Veja `docs/PRODUCT.md` e `docs/ARCHITECTURE.md` para:
- escopo completo (funis, campos, BI, automações, IA)
- checklist de compliance (LGPD + regras de template/janela de mensagens)
- roadmap técnico (webhooks → eventos → automações → BI)



## 7) Subir o worker (automações)
```bash
cd apps/server
npm run worker
```

## 8) Testar automações sem Meta (DEV)
1) Faça register/login e pegue o token.
2) Chame:
```bash
curl -X POST http://localhost:4000/dev/mock-message \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactName":"Ana Martins","company":"Loja Aurora","channel":"whatsapp","text":"Quero orçamento e prazo"}'
```
Isso cria: Contact + Conversation + Message + Event(message_received) e enfileira para o worker.


## 9) Rodar o cron (stale_stage / inactivity)
```bash
cd apps/server
npm run cron
```

## Actions suportadas no worker (v3)
- create_task
- move_to_pipeline
- send_message (stub)
- add_tag
- create_deal


## 10) Meta Webhook (WhatsApp/Instagram) normalizado (v4)
- Endpoint: `GET/POST /webhooks/meta`
- Verificação: configure `WEBHOOK_VERIFY_TOKEN` (default: `solutions_verify`)
- Multi-tenant: cadastre a conta em `POST /channels/accounts`:
  - WhatsApp: `externalAccountId = phone_number_id`
  - Instagram: `externalAccountId = recipient/page/ig id`
- DEV: você pode enviar `x-org-id` no webhook.

### Exemplo: cadastrar conta WhatsApp
```bash
curl -X POST http://localhost:4000/channels/accounts \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","externalAccountId":"PHONE_NUMBER_ID","displayName":"Meu WhatsApp"}'
```

### Exemplo: webhook WhatsApp (payload mínimo)
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "metadata": {"phone_number_id":"PHONE_NUMBER_ID"},
        "contacts": [{"profile": {"name":"NAME"}, "wa_id":"5511999999999"}],
        "messages": [{"from":"5511999999999","id":"wamid.ID","text":{"body":"Olá"},"type":"text"}]
      },
      "field": "messages"
    }]
  }]
}
```

### Exemplo: webhook Instagram (payload mínimo)
```json
{
  "object": "instagram",
  "entry": [{
    "id": "IG_BUSINESS_ID",
    "messaging": [{
      "sender": {"id": "IG_USER_ID"},
      "recipient": {"id": "IG_BUSINESS_ID"},
      "message": {"mid":"MID","text":"Oi"}
    }]
  }]
}
```
