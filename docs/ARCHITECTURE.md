# Solutions — Arquitetura (MVP → escala)

## Stack deste starter
- Web: React + TS + Tailwind (Vite)
- API: Node + Express + TS
- DB: PostgreSQL (Prisma)
- Queue/Eventos: Redis + BullMQ

## Design por eventos (core)
1) Chega um webhook (WhatsApp/Instagram)  
2) API valida assinatura, normaliza payload e grava `Event`  
3) Worker consome `Event` e:
   - atualiza `Conversation/Message`
   - roda `Automation Engine` (regras)
   - dispara ações (tarefas, tags, mensagens, webhooks)
4) BI lê dados normalizados e mostra dashboards

## Multi-tenant
Todas as tabelas core possuem `orgId`.

## Automações
Modelo simples:
- `Automation`: triggerType + triggerConfig(JSON)
- `AutomationRun`: log, status, timestamps
- `Event`: tipo + payload + processed

## Segurança
- JWT + refresh (futuro)
- RBAC: owner/admin/agent/viewer
- Audit log (futuro)
- Criptografia em repouso (dependente infra)

## Evolução recomendada
- Migrar a UI para Next.js quando for produto SaaS
- Implementar RBAC completo + audit log
- Implementar “custom fields” robusto (tipos, validação, index)
- Implementar search (Postgres full-text / Meilisearch / Elastic)
- Implementar IA com RAG (vector store) e guardrails


## Jobs (stale_stage / inactivity)
- `apps/server/src/cron.ts` gera Events para `stale_stage` e `inactivity` com base nas automações ativas.
- Em produção, agendar via cron/Cloud Scheduler.


## Meta Webhooks Normalization (WhatsApp/Instagram)
- `POST /webhooks/meta` normaliza payloads para `Contact/Conversation/Message` e cria `Event(message_received)`.
- Mapeamento multi-tenant via `ChannelAccount` (orgId + channel + externalAccountId).
