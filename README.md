# 🏁 Kart Finance | RA Kart Racing

> Sistema de gestão financeira automatizado desenvolvido sob medida para a equipe RA Kart Racing.

## 📖 Sobre o Projeto

O **Kart Finance** é um sistema de gestão financeira criado para centralizar e profissionalizar o controle de pagamentos dos pilotos da equipe **RA Kart Racing**. A plataforma funciona como um painel administrativo inteligente que registra mensalidades, gastos extras da pista e reembolsos. 

Seu grande diferencial é a automação: o sistema realiza o fechamento do mês de forma totalmente automática com base na data de vencimento individual de cada piloto, calculando regras complexas de saldo devedor acumulado e gerando faturas detalhadas prontas para cobrança. Com isso, a equipe elimina erros manuais e ganha controle absoluto e em tempo real sobre a sua saúde financeira.

## ✨ Funcionalidades Principais

* **Gestão Individualizada de Pilotos:** Cadastro de pilotos com definição de mensalidade base e dia de vencimento personalizado.
* **Controle de Lançamentos:** Registro preciso de despesas diárias (ex: compra de pneus, combustível, peças) e reembolsos.
* **Fechamento Automático (Cron Jobs):** Rotinas agendadas no servidor que verificam diariamente quais faturas devem ser processadas.
* **Sistema de Rollover (Saldo Devedor):** Lógica financeira que identifica pagamentos pendentes de meses anteriores e os soma automaticamente à fatura do mês vigente.
* **Dashboard de Inadimplência:** Controle de status de pagamento (`PENDENTE`, `PAGO`, `ATRASADO`) para visão clara do fluxo de caixa.
* **Cobrança Ágil via WhatsApp:** Geração automática do extrato financeiro formatado em texto para envio direto pelo WhatsApp Web com apenas um clique.

## 💻 Tecnologias Utilizadas

A aplicação foi construída sob uma arquitetura Full-Stack moderna, separando completamente as responsabilidades do motor de regras de negócio (Backend) da interface de usuário (Frontend).

### Backend (API REST)
* **Java 21:** Linguagem principal, garantindo alta performance e segurança.
* **Spring Boot (4.0.x):** Framework central para injeção de dependências, criação das rotas da API e agendamento de tarefas (`@Scheduled`).
* **Spring Data JPA & Hibernate:** ORM utilizado para o mapeamento de entidades e comunicação fluida com o banco de dados.
* **Maven:** Gerenciamento de dependências e build do projeto.

### Frontend (Interface do Usuário)
* **React:** Biblioteca JavaScript para construção da interface de forma reativa e baseada em componentes (Single Page Application).
* **Vite:** Ferramenta de build de última geração para empacotamento rápido.
* **Tailwind CSS:** Framework de estilização utilizado para criar um Design System moderno, com suporte a Dark Mode nativo e identidade visual da equipe (Verde Esmeralda).
* **Axios:** Cliente HTTP para comunicação assíncrona com a API Spring Boot.

### Banco de Dados
* **PostgreSQL:** Banco de dados relacional robusto, ideal para garantir a integridade das transações financeiras e relacionamentos (Pilotos ↔ Histórico de Fechamento).

## 🏗️ Estrutura de Domínio e Regras de Negócio

A arquitetura do sistema foi desenhada para refletir o mundo real das finanças. A principal regra de negócio resolve o problema da mescla temporal de faturas: o fechamento (faturamento) é separado da liquidação (pagamento). Dessa forma, o sistema pode "congelar" os gastos de um período exato, gerar um histórico imutável e gerenciar a dívida ao longo do tempo sem interferir nos lançamentos de novas corridas.

---
*Desenvolvido para a equipe RA Kart Racing.*
# Kart-Finance
