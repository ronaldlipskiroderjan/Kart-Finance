# Instruções para agentes de IA

Este arquivo se aplica a todo o repositório Kart Finance. Qualquer agente que
implemente, corrija ou revise código deve seguir estas regras.

## Objetivo

Preservar a qualidade arquitetural, a integridade financeira e a segurança do
sistema. Uma alteração só está concluída quando estiver implementada, testada,
documentada quando necessário e sem regressões conhecidas.

## Antes de alterar código

1. Leia `README.md`, `docs/architecture.md`, `docs/development.md` e, para
   mudanças HTTP, `docs/openapi.yaml`.
2. Verifique `git status` e o diff existente. Mudanças anteriores pertencem ao
   usuário e não devem ser descartadas ou sobrescritas.
3. Localize todos os consumidores do código antes de mudar contratos, nomes de
   campos, rotas, tipos ou comportamento.
4. Prefira corrigir a causa do problema. Não silencie erros de compilação,
   lint, testes ou runtime com workarounds sem justificativa.
5. Nunca exponha, registre ou versione senhas, cookies, tokens, chaves PIX,
   URLs de banco ou conteúdo de arquivos `.env*`.

## Arquitetura do backend

- O backend é um monólito modular em Go, Fiber, GORM e PostgreSQL.
- Controllers tratam HTTP: parsing, autenticação, validação superficial,
  status, headers e DTOs.
- Services concentram regras de negócio e transações.
- Repositories concentram persistência e consultas.
- Regras puras e cálculos devem ficar em pacotes de domínio e ser testáveis sem
  banco ou servidor HTTP.
- Não coloque regras financeiras diretamente em controllers ou componentes do
  frontend.
- Não exponha modelos GORM como contrato implícito quando um DTO explícito for
  apropriado.
- Erros devem ser propagados. Não ignore retornos de banco, parsing, hashing,
  serialização ou operações de arquivos.
- Use `errors.Is`/`errors.As` e erros sentinela para decisões de fluxo; não
  dependa de comparação frágil de mensagens.

## Contrato REST

- Novos endpoints devem existir somente sob `/api/v1`.
- Rotas usam substantivos e hierarquia de recursos, nunca verbos de ação
  arbitrários.
- Use os métodos de forma consistente:
  - `GET` consulta e nunca cria ou modifica dados;
  - `POST` cria recursos ou sub-recursos;
  - `PATCH` altera parcialmente;
  - `PUT` substitui um valor/recurso completo e idempotente;
  - `DELETE` remove.
- Use status HTTP corretos: `200`, `201` com `Location`, `204`, `400`, `401`,
  `403`, `404`, `409`, `422` e `500`, conforme o caso.
- Erros da API v1 devem seguir `application/problem+json`, incluindo `type`,
  `title`, `status`, `detail` quando útil e `requestId`.
- Identificadores de rota devem ser inteiros positivos e validados antes de
  acessar services/repositories.
- JSON público usa `camelCase`. Não introduza conversões globais mágicas entre
  PascalCase e camelCase.
- Coleções devem manter o envelope `{ "data": ..., "meta": ... }` quando
  paginação ou metadados forem necessários.
- Toda alteração de contrato deve atualizar `docs/openapi.yaml` e os clientes
  correspondentes do frontend.
- Rotas legadas sem versão existem apenas para compatibilidade. Não adicione
  funcionalidades novas nelas e não crie novos consumidores no frontend.

## Regras financeiras

- Nunca use `float32` ou `float64` para dinheiro.
- Em Go, use `models.Money`, armazenado em centavos.
- No PostgreSQL, use `NUMERIC(14,2)` e constraints coerentes.
- O período contábil é dado explícito (`reference_period`) e não deve ser
  inferido de `created_at`, exceto em migrações de dados legados.
- Despesas e reembolsos devem ter descrição não vazia, valor positivo e piloto
  existente.
- Um fechamento é único por piloto e período.
- Fechamentos e outras operações financeiras compostas devem ser transacionais.
- Operações de pagamento devem ser idempotentes e preservar o timestamp do
  primeiro pagamento.
- Use UTC para persistência e conversão explícita para `America/Sao_Paulo`
  quando a regra de negócio depender do calendário brasileiro.

## PostgreSQL e migrações

- Nunca use `AutoMigrate` ou DDL no startup da API.
- Toda alteração de schema deve ser uma nova migração SQL numerada em
  `backend-go/internal/migrations/sql`.
- Não edite uma migração que já possa ter sido aplicada; crie a próxima versão.
- Migrações devem ser determinísticas, transacionais quando possível e seguras
  para bancos já existentes.
- Adicione constraints, índices e foreign keys no banco para invariantes que
  não podem depender apenas do código.
- Defina explicitamente o comportamento `ON DELETE`.
- Não apague dados para fazer uma migração passar. Em caso de dados inválidos,
  interrompa e documente a estratégia de saneamento.
- Antes de executar migrações em produção, exija backup e valide a ordem de
  deploy descrita em `docs/development.md`.

## Segurança

- Autenticação usa sessão opaca armazenada no servidor e cookie `HttpOnly`.
- Não armazene autenticação, senha ou token no `localStorage`.
- Toda mutação autenticada deve validar CSRF.
- Senhas devem ser armazenadas somente com bcrypt e nunca retornadas em JSON.
- Endpoints administrativos devem aplicar RBAC e o princípio do menor
  privilégio.
- Login deve permanecer protegido por rate limit e mensagem de erro que não
  revele se o usuário existe.
- CORS com credenciais exige origens HTTPS exatas em produção; nunca use `*`.
- Não inclua detalhes internos ou segredos em respostas `500` de produção.
- Jobs executados por múltiplas instâncias devem manter trava distribuída ou
  mecanismo equivalente.

## Frontend React

- O frontend consome somente `/api/v1` por meio dos módulos em
  `frontend/src/services`.
- Cada domínio possui um cliente próprio (`pilotsApi`, `billingApi`,
  `racesApi`, `adminApi`, `settingsApi`, `authApi`). Não recrie uma API
  monolítica.
- O cliente HTTP compartilhado concentra `baseURL`, cookies, CSRF e leitura de
  Problem Details.
- Componentes não devem conhecer formatos do banco ou nomes PascalCase
  legados.
- Evite chamadas N+1. Prefira endpoints agregados ou carregamento em lote.
- Não duplique cálculos financeiros no frontend. Quando uma prévia for exibida,
  a fonte de verdade deve ser o backend.
- Mantenha estados de loading, vazio, sucesso e erro explícitos.
- Operações assíncronas devem impedir envios duplicados e apresentar mensagens
  úteis ao usuário.
- Componentes grandes devem ser divididos por responsabilidade. Extraia
  formulários, modais, seções e hooks quando isso reduzir acoplamento.
- Preserve acessibilidade: elementos semânticos, labels, foco de modal,
  navegação por teclado, `aria-label` e `role="status"` quando aplicável.
- Evite efeitos usados apenas para derivar estado. Quando um efeito for
  necessário para sincronizar abertura de modal ou carregar dados, mantenha
  dependências corretas e proteja respostas após unmount.

## Dependências e configuração

- Não adicione bibliotecas quando a plataforma ou uma função pequena resolver
  o problema de forma clara.
- Ao alterar dependências Go, execute `go mod tidy` e versione `go.mod` e
  `go.sum` juntos.
- Ao alterar dependências do frontend, use `npm install` e versione
  `package.json` e `package-lock.json` juntos.
- Não edite lockfiles manualmente.
- Variáveis novas devem ser documentadas em `.env.example` com placeholders,
  nunca com valores reais.
- Somente variáveis prefixadas com `VITE_` podem chegar ao bundle do frontend.
- O backend recebe configuração por variáveis de ambiente exportadas pelo
  processo.

## Testes obrigatórios

- Toda correção de bug deve incluir um teste que falhe antes da correção sempre
  que for tecnicamente viável.
- Regras financeiras exigem testes unitários com casos de borda: centavos,
  zero, negativos, virada de mês/ano, duplicidade e idempotência.
- Mudanças em handlers devem cobrir status, corpo, autenticação, autorização e
  validação.
- Mudanças de contrato devem validar também o adaptador/consumidor do frontend.
- Não remova ou enfraqueça testes para fazer o pipeline passar.

Execute antes de concluir:

```sh
cd backend-go
gofmt -w $(find . -name '*.go' -type f)
go test ./...
go vet ./...

cd ../frontend
npm run lint
npm test
npm run build
```

Também execute na raiz:

```sh
git diff --check
```

Se alguma ferramenta não estiver disponível, declare claramente quais checks
não foram executados. Nunca afirme que um teste passou sem executá-lo.

## Documentação e entrega

- Atualize README e documentação quando mudar setup, arquitetura, variáveis,
  migrações, segurança ou fluxo de deploy.
- Explique no handoff o que mudou, os arquivos principais e os checks
  executados.
- Informe riscos, limitações, migrações necessárias e qualquer desvio do plano.
- Não faça commit, push, deploy ou alteração em serviço externo sem autorização
  explícita.
- Não deixe arquivos temporários, `.orig`, `.rej`, patches, logs, builds ou
  credenciais no repositório.

## Definição de pronto

Uma tarefa somente está pronta quando:

1. O comportamento solicitado funciona de ponta a ponta.
2. As regras de domínio permanecem centralizadas e as invariantes estão
   protegidas no código e no banco quando aplicável.
3. O contrato REST e o frontend estão sincronizados.
4. Segurança e compatibilidade foram revisadas.
5. Testes relevantes foram adicionados e todos os checks obrigatórios passaram.
6. O diff não contém alterações acidentais, segredos nem artefatos temporários.
7. Documentação e instruções operacionais estão atualizadas.
