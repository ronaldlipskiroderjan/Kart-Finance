# Kart Finance

Aplicação de gestão financeira para equipes de kart, com controle de pilotos,
despesas, reembolsos, fechamentos mensais, cobranças de corridas e caixa de
viagem.

## Arquitetura

- Backend: Go, Fiber e GORM.
- Frontend: React e Vite.
- Banco: PostgreSQL.
- API pública versionada em `/api/v1`.
- Autenticação por sessão opaca em cookie `HttpOnly`, com proteção CSRF.
- Valores monetários em centavos no Go e `NUMERIC(14,2)` no PostgreSQL.
- Migrações SQL versionadas e executadas fora do startup da API.

As decisões e os limites dos módulos estão descritos em
[`docs/architecture.md`](docs/architecture.md). O contrato HTTP está em
[`docs/openapi.yaml`](docs/openapi.yaml).

## Executar localmente

Pré-requisitos: a versão de Go definida em `backend-go/go.mod`, Node.js
compatível com o Vite e PostgreSQL 15 ou superior.

1. Copie `.env.example` e configure as variáveis de ambiente.
2. Crie o banco PostgreSQL.
3. Aplique as migrações:

   ```sh
   cd backend-go
   go run ./cmd/migrate
   ```

4. Crie o primeiro administrador:

   ```sh
   ADMIN_NAME=Administrador \
   ADMIN_EMAIL=admin@example.com \
   ADMIN_PASSWORD='uma-senha-segura' \
   go run ./cmd/create-admin
   ```

5. Inicie backend e frontend em terminais separados:

   ```sh
   cd backend-go
   go run .
   ```

   ```sh
   cd frontend
   npm ci
   npm run dev
   ```

Veja configuração de cookies, ordem de deploy e comandos de verificação em
[`docs/development.md`](docs/development.md).

## Qualidade

```sh
cd backend-go
go test ./...
go vet ./...

cd ../frontend
npm run lint
npm test
npm run build
```

O workflow em `.github/workflows/ci.yml` executa essas verificações em pushes e
pull requests.

## Implantação

O frontend pode ser publicado na Vercel e a API no Render ou serviço
equivalente. Em produção, configure origens CORS exatas e cookies seguros; não
use origem `*` junto com credenciais.

O backend reconcilia fechamentos financeiros vencidos ao iniciar e repete a
verificação a cada hora. Plataformas que suspendem o processo por inatividade
não perdem permanentemente o dia de fechamento: o trabalho pendente é processado
assim que a API volta a iniciar. A restrição única por piloto e período mantém
essa reconciliação idempotente.
